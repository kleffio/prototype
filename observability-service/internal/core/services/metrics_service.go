package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"
)

const authTokenContextKey = "authorization_token"
const defaultCacheTTL = 5 * time.Minute

var uuidNamespaceRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

type cachedProject struct {
	value     projectSummary
	expiresAt time.Time
}

type cachedUser struct {
	value     string
	expiresAt time.Time
}

type metricsService struct {
	metricsRepo                     ports.MetricsRepository
	httpClient                      *http.Client
	projectServiceURL               string
	userServiceURL                  string
	cpuAlertThreshold               float64
	memoryAlertThreshold            float64
	enableProjectNamespaceFiltering bool
	systemNamespaceBlocklist        map[string]struct{}
	enrichmentMaxConcurrency        int
	cacheTTL                        time.Duration
	cacheMu                         sync.RWMutex
	projectCache                    map[string]cachedProject
	userCache                       map[string]cachedUser
	projectCacheHits                uint64
	projectCacheMisses              uint64
	userCacheHits                   uint64
	userCacheMisses                 uint64
}

func NewMetricsService(metricsRepo ports.MetricsRepository) ports.MetricsService {
	return NewMetricsServiceWithDependencies(
		metricsRepo,
		"",
		"",
		80,
		80,
		true,
		defaultSystemNamespaceBlocklist(),
		8,
	)
}

func NewMetricsServiceWithDependencies(
	metricsRepo ports.MetricsRepository,
	projectServiceURL string,
	userServiceURL string,
	cpuAlertThreshold float64,
	memoryAlertThreshold float64,
	enableProjectNamespaceFiltering bool,
	systemNamespaceBlocklist []string,
	enrichmentMaxConcurrency int,
) ports.MetricsService {
	if cpuAlertThreshold <= 0 {
		cpuAlertThreshold = 80
	}
	if memoryAlertThreshold <= 0 {
		memoryAlertThreshold = 80
	}

	if enrichmentMaxConcurrency <= 0 {
		enrichmentMaxConcurrency = 8
	}

	blocklist := make(map[string]struct{}, len(systemNamespaceBlocklist))
	for _, namespace := range systemNamespaceBlocklist {
		trimmed := strings.TrimSpace(strings.ToLower(namespace))
		if trimmed != "" {
			blocklist[trimmed] = struct{}{}
		}
	}

	if len(blocklist) == 0 {
		for _, namespace := range defaultSystemNamespaceBlocklist() {
			blocklist[strings.ToLower(namespace)] = struct{}{}
		}
	}

	service := &metricsService{
		metricsRepo:                     metricsRepo,
		httpClient:                      &http.Client{Timeout: 10 * time.Second},
		projectServiceURL:               strings.TrimRight(projectServiceURL, "/"),
		userServiceURL:                  strings.TrimRight(userServiceURL, "/"),
		cpuAlertThreshold:               cpuAlertThreshold,
		memoryAlertThreshold:            memoryAlertThreshold,
		enableProjectNamespaceFiltering: enableProjectNamespaceFiltering,
		systemNamespaceBlocklist:        blocklist,
		enrichmentMaxConcurrency:        enrichmentMaxConcurrency,
		cacheTTL:                        defaultCacheTTL,
		projectCache:                    make(map[string]cachedProject),
		userCache:                       make(map[string]cachedUser),
	}

	go service.startCacheCleanup()

	return service
}

func (s *metricsService) GetAllMetrics(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
	return s.metricsRepo.GetAllMetrics(ctx, duration)
}

func (s *metricsService) GetClusterOverview(ctx context.Context) (*domain.ClusterOverview, error) {
	return s.metricsRepo.GetClusterOverview(ctx)
}

func (s *metricsService) GetRequestsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	return s.metricsRepo.GetRequestsMetric(ctx, duration)
}

func (s *metricsService) GetPodsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	return s.metricsRepo.GetPodsMetric(ctx, duration)
}

func (s *metricsService) GetNodesMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	return s.metricsRepo.GetNodesMetric(ctx, duration)
}

func (s *metricsService) GetTenantsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	return s.metricsRepo.GetTenantsMetric(ctx, duration)
}

func (s *metricsService) GetCPUUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
	return s.metricsRepo.GetCPUUtilization(ctx, duration)
}

func (s *metricsService) GetMemoryUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
	return s.metricsRepo.GetMemoryUtilization(ctx, duration)
}

func (s *metricsService) GetNodes(ctx context.Context) ([]domain.NodeMetric, error) {
	return s.metricsRepo.GetNodes(ctx)
}

func (s *metricsService) GetNamespaces(ctx context.Context) ([]domain.NamespaceMetric, error) {
	return s.metricsRepo.GetNamespaces(ctx)
}

func (s *metricsService) GetTopProjects(ctx context.Context, sortBy string, limit int, duration string) (*domain.TopProjectsResponse, error) {
	requestedLimit := normalizeLimit(limit)
	request := domain.TopProjectsRequest{
		SortBy:   normalizeSort(sortBy),
		Limit:    requestedLimit,
		Duration: normalizeDuration(duration),
	}
	if s.enableProjectNamespaceFiltering {
		request.Limit = 50
	}

	cpuUtilization, _ := s.metricsRepo.GetCPUUtilization(ctx, request.Duration)
	memoryUtilization, _ := s.metricsRepo.GetMemoryUtilization(ctx, request.Duration)

	cpuValue := 0.0
	memValue := 0.0
	if cpuUtilization != nil {
		cpuValue = cpuUtilization.CurrentValue
	}
	if memoryUtilization != nil {
		memValue = memoryUtilization.CurrentValue
	}

	pressureSort := s.preferredSortForPressure(cpuValue, memValue)
	if pressureSort != "" {
		request.SortBy = pressureSort
	}

	response, err := s.metricsRepo.GetTopProjects(ctx, request)
	if err != nil {
		return nil, err
	}

	if s.enableProjectNamespaceFiltering {
		response.Projects = s.filterProjectNamespaces(response.Projects)
	}
	if len(response.Projects) > requestedLimit {
		response.Projects = response.Projects[:requestedLimit]
	}

	response.CurrentCPUPercent = cpuValue
	response.CurrentMemoryPercent = memValue
	response.Alert = s.buildAlert(cpuValue, memValue)
	response.Cache = s.cacheMetrics()

	authToken, _ := ctx.Value(authTokenContextKey).(string)
	if authToken == "" {
		return response, nil
	}

	s.enrichProjects(ctx, authToken, response.Projects)
	return response, nil
}

func (s *metricsService) GetDatabaseIOMetrics(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error) {
	return s.metricsRepo.GetDatabaseIOMetrics(ctx, duration, namespaces)
}

func (s *metricsService) GetProjectUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectUsageMetrics, error) {
	return s.metricsRepo.GetProjectUsageMetrics(ctx, projectID)
}

func (s *metricsService) GetProjectUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectUsageMetrics, error) {
	return s.metricsRepo.GetProjectUsageMetricsWithDays(ctx, projectID, days)
}

func (s *metricsService) GetProjectTotalUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectTotalUsageMetrics, error) {
	return s.metricsRepo.GetProjectTotalUsageMetrics(ctx, projectID)
}

func (s *metricsService) GetProjectTotalUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectTotalUsageMetrics, error) {
	return s.metricsRepo.GetProjectTotalUsageMetricsWithDays(ctx, projectID, days)
}

func (s *metricsService) GetUptimeMetrics(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
	return s.metricsRepo.GetUptimeMetrics(ctx, duration)
}

func (s *metricsService) GetSystemUptime(ctx context.Context) (float64, error) {
	return s.metricsRepo.GetSystemUptime(ctx)
}

func normalizeSort(sortBy string) string {
	switch strings.ToLower(strings.TrimSpace(sortBy)) {
	case "memory":
		return "memory"
	case "disk":
		return "disk"
	default:
		return "cpu"
	}
}

func normalizeDuration(duration string) string {
	if strings.TrimSpace(duration) == "" {
		return "1h"
	}
	return duration
}

func normalizeLimit(limit int) int {
	if limit <= 0 {
		return 10
	}
	if limit > 50 {
		return 50
	}
	return limit
}

func (s *metricsService) preferredSortForPressure(cpuValue, memValue float64) string {
	cpuExceeded := cpuValue >= s.cpuAlertThreshold
	memExceeded := memValue >= s.memoryAlertThreshold

	if !cpuExceeded && !memExceeded {
		return ""
	}
	if cpuExceeded && (!memExceeded || cpuValue >= memValue) {
		return "cpu"
	}
	return "memory"
}

func (s *metricsService) buildAlert(cpuValue, memValue float64) *domain.ResourceAlert {
	cpuExceeded := cpuValue >= s.cpuAlertThreshold
	memExceeded := memValue >= s.memoryAlertThreshold

	if !cpuExceeded && !memExceeded {
		return nil
	}

	if cpuExceeded && (!memExceeded || cpuValue >= memValue) {
		return &domain.ResourceAlert{
			Type:         "cpu",
			CurrentValue: cpuValue,
			Threshold:    s.cpuAlertThreshold,
			Message:      fmt.Sprintf("High CPU load detected (%.1f%%)", cpuValue),
		}
	}

	return &domain.ResourceAlert{
		Type:         "memory",
		CurrentValue: memValue,
		Threshold:    s.memoryAlertThreshold,
		Message:      fmt.Sprintf("High memory load detected (%.1f%%)", memValue),
	}
}

func (s *metricsService) enrichProjects(ctx context.Context, authToken string, projects []domain.ProjectRanking) {
	if len(projects) == 0 {
		return
	}

	sem := make(chan struct{}, s.enrichmentMaxConcurrency)
	var wg sync.WaitGroup

	for i := range projects {
		i := i
		projectID := firstNonEmpty(projects[i].ProjectID, projects[i].Namespace)
		if projectID == "" {
			projects[i].OwnerName = firstNonEmpty(projects[i].OwnerName, "Unknown")
			continue
		}

		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			project := s.getProjectSummary(ctx, authToken, projectID)
			if project == nil {
				projects[i].ProjectName = firstNonEmpty(projects[i].ProjectName, projectID, projects[i].Namespace)
				projects[i].OwnerName = firstNonEmpty(projects[i].OwnerName, "Unknown")
				return
			}

			projects[i].ProjectName = firstNonEmpty(project.Name, projects[i].ProjectName, projectID, projects[i].Namespace)
			projects[i].OwnerID = firstNonEmpty(project.OwnerID, projects[i].OwnerID)
		}()
	}
	wg.Wait()

	ownerIDs := map[string]struct{}{}
	for i := range projects {
		if projects[i].OwnerID != "" {
			ownerIDs[projects[i].OwnerID] = struct{}{}
		}
	}

	usernames := s.resolveOwnerNamesWithCache(ctx, authToken, ownerIDs)
	for i := range projects {
		projects[i].OwnerName = firstNonEmpty(usernames[projects[i].OwnerID], projects[i].OwnerName, "Unknown")
	}
}

type projectSummary struct {
	ID      string `json:"projectId"`
	Name    string `json:"name"`
	OwnerID string `json:"ownerId"`
}

func (s *metricsService) fetchProject(ctx context.Context, authToken, projectID string) *projectSummary {
	if s.projectServiceURL == "" || projectID == "" {
		return nil
	}

	url := fmt.Sprintf("%s/api/v1/projects/%s", s.projectServiceURL, projectID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil
	}
	req.Header.Set("Authorization", "Bearer "+authToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil
	}

	var project projectSummary
	if err := json.NewDecoder(resp.Body).Decode(&project); err != nil {
		return nil
	}
	return &project
}

func (s *metricsService) resolveOwnerNamesWithCache(ctx context.Context, authToken string, ownerIDs map[string]struct{}) map[string]string {
	result := map[string]string{}
	if len(ownerIDs) == 0 {
		return result
	}

	missingIDs := make(map[string]struct{}, len(ownerIDs))
	for ownerID := range ownerIDs {
		if cached, ok := s.getCachedUser(ownerID); ok {
			result[ownerID] = cached
			continue
		}
		missingIDs[ownerID] = struct{}{}
	}

	if len(missingIDs) == 0 {
		return result
	}

	resolved := s.resolveOwnerNames(ctx, authToken, missingIDs)
	for id, name := range resolved {
		result[id] = name
		s.setCachedUser(id, name)
	}

	return result
}

func (s *metricsService) resolveOwnerNames(ctx context.Context, authToken string, ownerIDs map[string]struct{}) map[string]string {
	result := map[string]string{}
	if s.userServiceURL == "" || len(ownerIDs) == 0 {
		return result
	}

	ids := make([]string, 0, len(ownerIDs))
	for id := range ownerIDs {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	payload, _ := json.Marshal(map[string][]string{"ids": ids})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.userServiceURL+"/api/v1/users/resolve", bytes.NewReader(payload))
	if err != nil {
		return result
	}
	req.Header.Set("Authorization", "Bearer "+authToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return result
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return result
	}

	type userProfile struct {
		Name     string `json:"name"`
		Username string `json:"username"`
	}

	decoded := map[string]userProfile{}
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return result
	}

	for id, profile := range decoded {
		result[id] = firstNonEmpty(profile.Name, profile.Username, id)
	}

	return result
}

func (s *metricsService) getProjectSummary(ctx context.Context, authToken, projectID string) *projectSummary {
	if cached, ok := s.getCachedProject(projectID); ok {
		return cached
	}

	project := s.fetchProject(ctx, authToken, projectID)
	if project != nil {
		s.setCachedProject(projectID, *project)
	}
	return project
}

func (s *metricsService) filterProjectNamespaces(projects []domain.ProjectRanking) []domain.ProjectRanking {
	filtered := make([]domain.ProjectRanking, 0, len(projects))
	for _, project := range projects {
		namespace := strings.TrimSpace(firstNonEmpty(project.Namespace, project.ProjectID))
		if !s.isProjectNamespace(namespace) {
			continue
		}

		project.Namespace = namespace
		project.ProjectID = firstNonEmpty(project.ProjectID, namespace)
		filtered = append(filtered, project)
	}
	return filtered
}

func (s *metricsService) isProjectNamespace(namespace string) bool {
	normalized := strings.ToLower(strings.TrimSpace(namespace))
	if normalized == "" {
		return false
	}
	if _, blocked := s.systemNamespaceBlocklist[normalized]; blocked {
		return false
	}
	return uuidNamespaceRegex.MatchString(namespace)
}

func (s *metricsService) getCachedProject(projectID string) (*projectSummary, bool) {
	s.cacheMu.RLock()
	cached, ok := s.projectCache[projectID]
	s.cacheMu.RUnlock()

	if !ok || time.Now().After(cached.expiresAt) {
		atomic.AddUint64(&s.projectCacheMisses, 1)
		return nil, false
	}

	atomic.AddUint64(&s.projectCacheHits, 1)
	project := cached.value
	return &project, true
}

func (s *metricsService) setCachedProject(projectID string, project projectSummary) {
	if projectID == "" {
		return
	}
	s.cacheMu.Lock()
	s.projectCache[projectID] = cachedProject{value: project, expiresAt: time.Now().Add(s.cacheTTL)}
	s.cacheMu.Unlock()
}

func (s *metricsService) getCachedUser(userID string) (string, bool) {
	s.cacheMu.RLock()
	cached, ok := s.userCache[userID]
	s.cacheMu.RUnlock()

	if !ok || time.Now().After(cached.expiresAt) {
		atomic.AddUint64(&s.userCacheMisses, 1)
		return "", false
	}

	atomic.AddUint64(&s.userCacheHits, 1)
	return cached.value, true
}

func (s *metricsService) setCachedUser(userID, username string) {
	if userID == "" || username == "" {
		return
	}
	s.cacheMu.Lock()
	s.userCache[userID] = cachedUser{value: username, expiresAt: time.Now().Add(s.cacheTTL)}
	s.cacheMu.Unlock()
}

func (s *metricsService) startCacheCleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		s.cacheMu.Lock()
		for key, value := range s.projectCache {
			if now.After(value.expiresAt) {
				delete(s.projectCache, key)
			}
		}
		for key, value := range s.userCache {
			if now.After(value.expiresAt) {
				delete(s.userCache, key)
			}
		}
		s.cacheMu.Unlock()
	}
}

func (s *metricsService) cacheMetrics() *domain.CacheMetrics {
	return &domain.CacheMetrics{
		ProjectCacheHits:   atomic.LoadUint64(&s.projectCacheHits),
		ProjectCacheMisses: atomic.LoadUint64(&s.projectCacheMisses),
		UserCacheHits:      atomic.LoadUint64(&s.userCacheHits),
		UserCacheMisses:    atomic.LoadUint64(&s.userCacheMisses),
	}
}

func defaultSystemNamespaceBlocklist() []string {
	return []string{
		"default",
		"kube-system",
		"kube-public",
		"kube-node-lease",
		"monitoring",
		"ingress-nginx",
		"loki",
		"prometheus",
		"cert-manager",
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
