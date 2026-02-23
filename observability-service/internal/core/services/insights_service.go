package services

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"
)

const (
	defaultInsightsCacheTTL        = 5 * time.Minute
	defaultInsightsAnalysisWindow  = "7d"
	defaultAnomalyStdDevThreshold  = 2.0
	defaultSLOTargetPercent        = 1.0
	defaultCPUCostPerCoreMonthUSD  = 8.0
	defaultMemoryCostPerGBMonthUSD = 1.5
)

type cachedInsights struct {
	value     *domain.InsightsResponse
	expiresAt time.Time
}

type insightsService struct {
	repo                    ports.InsightsRepository
	aiClient                ports.AIInsightsClient
	cacheTTL                time.Duration
	analysisWindow          string
	blocklist               map[string]struct{}
	anomalyStdDevThreshold  float64
	sloTargetPercent        float64
	cpuCostPerCoreMonthUSD  float64
	memoryCostPerGBMonthUSD float64

	mu    sync.RWMutex
	cache map[string]cachedInsights
}

func NewInsightsService(
	repo ports.InsightsRepository,
	cacheTTL time.Duration,
	analysisWindow string,
	systemNamespaceBlocklist []string,
	anomalyStdDevThreshold float64,
	sloTargetPercent float64,
	cpuCostPerCoreMonthUSD float64,
	memoryCostPerGBMonthUSD float64,
) ports.InsightsService {
	return NewInsightsServiceWithAI(
		repo,
		nil,
		cacheTTL,
		analysisWindow,
		systemNamespaceBlocklist,
		anomalyStdDevThreshold,
		sloTargetPercent,
		cpuCostPerCoreMonthUSD,
		memoryCostPerGBMonthUSD,
	)
}

func NewInsightsServiceWithAI(
	repo ports.InsightsRepository,
	aiClient ports.AIInsightsClient,
	cacheTTL time.Duration,
	analysisWindow string,
	systemNamespaceBlocklist []string,
	anomalyStdDevThreshold float64,
	sloTargetPercent float64,
	cpuCostPerCoreMonthUSD float64,
	memoryCostPerGBMonthUSD float64,
) ports.InsightsService {
	if cacheTTL <= 0 {
		cacheTTL = defaultInsightsCacheTTL
	}
	if strings.TrimSpace(analysisWindow) == "" {
		analysisWindow = defaultInsightsAnalysisWindow
	}
	if anomalyStdDevThreshold <= 0 {
		anomalyStdDevThreshold = defaultAnomalyStdDevThreshold
	}
	if sloTargetPercent <= 0 {
		sloTargetPercent = defaultSLOTargetPercent
	}
	if cpuCostPerCoreMonthUSD <= 0 {
		cpuCostPerCoreMonthUSD = defaultCPUCostPerCoreMonthUSD
	}
	if memoryCostPerGBMonthUSD <= 0 {
		memoryCostPerGBMonthUSD = defaultMemoryCostPerGBMonthUSD
	}

	blocklist := make(map[string]struct{}, len(systemNamespaceBlocklist))
	for _, namespace := range systemNamespaceBlocklist {
		normalized := strings.ToLower(strings.TrimSpace(namespace))
		if normalized != "" {
			blocklist[normalized] = struct{}{}
		}
	}

	return &insightsService{
		repo:                    repo,
		aiClient:                aiClient,
		cacheTTL:                cacheTTL,
		analysisWindow:          analysisWindow,
		blocklist:               blocklist,
		anomalyStdDevThreshold:  anomalyStdDevThreshold,
		sloTargetPercent:        sloTargetPercent,
		cpuCostPerCoreMonthUSD:  cpuCostPerCoreMonthUSD,
		memoryCostPerGBMonthUSD: memoryCostPerGBMonthUSD,
		cache:                   map[string]cachedInsights{},
	}
}

func (s *insightsService) GetAdminInsights(ctx context.Context, window string) (*domain.InsightsResponse, error) {
	start := time.Now()
	window = strings.TrimSpace(window)
	if window == "" {
		window = s.analysisWindow
	}

	if cached := s.getCached(window); cached != nil {
		response := *cached
		response.Metadata.CacheHit = true
		return &response, nil
	}

	type errResult struct {
		err error
	}

	var (
		namespaces   []string
		cpuUsage     map[string][]domain.TimeSeriesDataPoint
		memUsage     map[string][]domain.TimeSeriesDataPoint
		reqRate      map[string][]domain.TimeSeriesDataPoint
		errRate      map[string][]domain.TimeSeriesDataPoint
		netIO        map[string][]domain.TimeSeriesDataPoint
		cpuRequests  map[string]float64
		memRequests  map[string]float64
		restartCount map[string]float64
	)

	var wg sync.WaitGroup
	errCh := make(chan errResult, 9)

	run := func(fn func() error) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := fn(); err != nil {
				errCh <- errResult{err: err}
			}
		}()
	}

	run(func() error {
		var err error
		namespaces, err = s.repo.GetInsightNamespaces(ctx)
		return err
	})
	run(func() error {
		var err error
		cpuUsage, err = s.repo.GetCPUUsageSeriesByNamespace(ctx, window)
		return err
	})
	run(func() error {
		var err error
		memUsage, err = s.repo.GetMemoryUsageSeriesByNamespace(ctx, window)
		return err
	})
	run(func() error {
		var err error
		reqRate, err = s.repo.GetRequestRateSeriesByNamespace(ctx, window)
		return err
	})
	run(func() error {
		var err error
		errRate, err = s.repo.GetErrorRateSeriesByNamespace(ctx, window)
		return err
	})
	run(func() error {
		var err error
		netIO, err = s.repo.GetNetworkIOSeriesByNamespace(ctx, window)
		return err
	})
	run(func() error {
		var err error
		cpuRequests, err = s.repo.GetCPURequestsByNamespace(ctx)
		return err
	})
	run(func() error {
		var err error
		memRequests, err = s.repo.GetMemoryRequestsByNamespace(ctx)
		return err
	})
	run(func() error {
		var err error
		restartCount, err = s.repo.GetRestartCountByNamespace(ctx, window)
		return err
	})

	wg.Wait()
	close(errCh)

	partialData := false
	for range errCh {
		partialData = true
	}

	filteredNamespaces := s.collectNamespaces(namespaces, cpuUsage, memUsage, reqRate, errRate, netIO, cpuRequests, memRequests, restartCount)
	if len(filteredNamespaces) == 0 {
		response := &domain.InsightsResponse{
			Recommendations: []domain.InsightRecommendation{},
			Anomalies:       []domain.InsightAnomaly{},
			CostSavings: domain.CostSavingsInsight{
				Note: "No eligible project namespaces found for analysis.",
			},
			SLOStatus: domain.SLOStatus{
				SLOTargetPercent: s.sloTargetPercent,
				WithinSLO:        true,
				Note:             "No request metrics available.",
			},
			Summary: domain.InsightsSummary{
				TotalNamespaces:      0,
				TotalRecommendations: 0,
				TotalAnomalies:       0,
				DataPointsProcessed:  0,
				PartialData:          partialData,
			},
			Metadata: domain.InsightsMetadata{
				GenerationMs:   time.Since(start).Milliseconds(),
				CacheHit:       false,
				AnalysisWindow: window,
				ThresholdsUsed: domain.InsightsThresholdMetadata{
					AnomalyStdDev:             s.anomalyStdDevThreshold,
					SLOErrorRateTargetPercent: s.sloTargetPercent,
				},
			},
			GeneratedAt: time.Now().UTC(),
		}
		s.setCached(window, response)
		return response, nil
	}

	recommendations := make([]domain.InsightRecommendation, 0)
	anomalies := make([]domain.InsightAnomaly, 0)
	totalDataPoints := 0

	var totalIdleCPU float64
	var totalIdleMemoryBytes float64
	var totalReqRate float64
	var totalErrRate float64

	for _, namespace := range filteredNamespaces {
		cpuStats := summarizeSeries(cpuUsage[namespace])
		memStats := summarizeSeries(memUsage[namespace])
		reqStats := summarizeSeries(reqRate[namespace])
		errStats := summarizeSeries(errRate[namespace])
		netStats := summarizeSeries(netIO[namespace])

		totalDataPoints += cpuStats.Count + memStats.Count + reqStats.Count + errStats.Count + netStats.Count
		totalReqRate += reqStats.Mean
		totalErrRate += errStats.Mean

		cpuRequest := cpuRequests[namespace]
		memRequest := memRequests[namespace]
		restarts := restartCount[namespace]

		if cpuRequest > 0 && cpuStats.Count > 0 {
			util := cpuStats.Mean / cpuRequest
			if util < 0.30 {
				recommended := math.Max(cpuStats.P95*1.2, 0.05)
				saving := math.Max(cpuRequest-recommended, 0)
				totalIdleCPU += saving
				recommendations = append(recommendations, domain.InsightRecommendation{
					Type:           "right_sizing",
					Severity:       "medium",
					Resource:       namespace,
					Current:        fmt.Sprintf("CPU request %.2f cores, avg usage %.2f cores (%.0f%%)", cpuRequest, cpuStats.Mean, util*100),
					Recommendation: fmt.Sprintf("Reduce CPU request to %.2f cores", recommended),
					Savings:        fmt.Sprintf("%.2f CPU cores (%.0f%%)", saving, (saving/cpuRequest)*100),
					Confidence:     clamp01(float64(cpuStats.Count) / 100.0),
					BasedOn:        "7-day CPU average and p95 utilization",
				})
			}
		}

		if memRequest > 0 && memStats.Count > 0 {
			util := memStats.Mean / memRequest
			if util < 0.35 {
				recommended := math.Max(memStats.P95*1.2, 64*1024*1024)
				saving := math.Max(memRequest-recommended, 0)
				totalIdleMemoryBytes += saving
				recommendations = append(recommendations, domain.InsightRecommendation{
					Type:           "right_sizing",
					Severity:       "medium",
					Resource:       namespace,
					Current:        fmt.Sprintf("Memory request %.2f GiB, avg usage %.2f GiB (%.0f%%)", bytesToGiB(memRequest), bytesToGiB(memStats.Mean), util*100),
					Recommendation: fmt.Sprintf("Reduce memory request to %.2f GiB", bytesToGiB(recommended)),
					Savings:        fmt.Sprintf("%.2f GiB", bytesToGiB(saving)),
					Confidence:     clamp01(float64(memStats.Count) / 100.0),
					BasedOn:        "7-day memory average and p95 utilization",
				})
			}
		}

		if cpuRequest > 0 && cpuStats.Count > 0 {
			peakRatio := cpuStats.P95 / cpuRequest
			if peakRatio >= 0.85 {
				recommendations = append(recommendations, domain.InsightRecommendation{
					Type:           "scaling",
					Severity:       "high",
					Resource:       namespace,
					Current:        fmt.Sprintf("CPU p95 %.2f cores on %.2f requested cores (%.0f%%)", cpuStats.P95, cpuRequest, peakRatio*100),
					Recommendation: "Scale out by at least 1 replica or increase CPU request",
					Impact:         "Reduce throttling risk and improve tail latency under load.",
					Confidence:     clamp01(0.5 + float64(cpuStats.Count)/200.0),
					BasedOn:        "CPU p95/request ratio over 7 days",
				})
			}
		}

		if restarts >= 3 {
			recommendations = append(recommendations, domain.InsightRecommendation{
				Type:           "reliability",
				Severity:       "high",
				Resource:       namespace,
				Current:        fmt.Sprintf("%.0f pod restarts in %s", restarts, window),
				Recommendation: "Inspect crash loops and tighten readiness/liveness probes",
				Impact:         "Reduce restart churn and improve service availability.",
				Confidence:     clamp01(restarts / 10.0),
				BasedOn:        "Pod restart counter increase",
			})
		}

		if anomaly := detectLatestSpike(cpuStats, s.anomalyStdDevThreshold); anomaly != nil {
			anomalies = append(anomalies, domain.InsightAnomaly{
				DetectedAt: time.UnixMilli(anomaly.Timestamp).UTC(),
				Type:       "cpu_spike",
				Resource:   namespace,
				Value:      fmt.Sprintf("+%.0f%% from baseline", anomaly.PercentAboveMean),
				Baseline:   fmt.Sprintf("%.2f cores", cpuStats.Mean),
				Current:    fmt.Sprintf("%.2f cores", anomaly.Value),
				Severity:   anomalySeverity(anomaly.PercentAboveMean),
			})
		}

		if anomaly := detectLatestSpike(memStats, s.anomalyStdDevThreshold); anomaly != nil {
			anomalies = append(anomalies, domain.InsightAnomaly{
				DetectedAt: time.UnixMilli(anomaly.Timestamp).UTC(),
				Type:       "memory_spike",
				Resource:   namespace,
				Value:      fmt.Sprintf("+%.0f%% from baseline", anomaly.PercentAboveMean),
				Baseline:   fmt.Sprintf("%.2f GiB", bytesToGiB(memStats.Mean)),
				Current:    fmt.Sprintf("%.2f GiB", bytesToGiB(anomaly.Value)),
				Severity:   anomalySeverity(anomaly.PercentAboveMean),
			})
		}
	}

	monthlySavings := totalIdleCPU*s.cpuCostPerCoreMonthUSD + bytesToGiB(totalIdleMemoryBytes)*s.memoryCostPerGBMonthUSD

	errorRatePercent := 0.0
	withinSLO := true
	errorBudgetRemaining := 100.0
	sloNote := ""
	if totalReqRate > 0 {
		errorRatePercent = (totalErrRate / totalReqRate) * 100
		withinSLO = errorRatePercent <= s.sloTargetPercent
		if s.sloTargetPercent > 0 {
			errorBudgetRemaining = math.Max(0, (1-(errorRatePercent/s.sloTargetPercent))*100)
		}
	} else {
		sloNote = "No request/error metrics found for the selected window."
	}

	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].Severity > recommendations[j].Severity
	})
	sort.Slice(anomalies, func(i, j int) bool {
		return anomalies[i].DetectedAt.After(anomalies[j].DetectedAt)
	})

	response := &domain.InsightsResponse{
		Recommendations: recommendations,
		Anomalies:       anomalies,
		CostSavings: domain.CostSavingsInsight{
			IdleCPUCores:        round2(totalIdleCPU),
			IdleMemoryGB:        round2(bytesToGiB(totalIdleMemoryBytes)),
			EstimatedMonthlyUSD: round2(monthlySavings),
			Note:                "Estimated from idle requested resources above p95 demand.",
		},
		SLOStatus: domain.SLOStatus{
			SLOTargetPercent:            s.sloTargetPercent,
			ErrorRatePercent:            round3(errorRatePercent),
			WithinSLO:                   withinSLO,
			ErrorBudgetRemainingPercent: round2(errorBudgetRemaining),
			Note:                        sloNote,
		},
		Summary: domain.InsightsSummary{
			TotalNamespaces:      len(filteredNamespaces),
			TotalRecommendations: len(recommendations),
			TotalAnomalies:       len(anomalies),
			DataPointsProcessed:  totalDataPoints,
			PartialData:          partialData,
		},
		Metadata: domain.InsightsMetadata{
			GenerationMs:   time.Since(start).Milliseconds(),
			CacheHit:       false,
			AnalysisWindow: window,
			ThresholdsUsed: domain.InsightsThresholdMetadata{
				AnomalyStdDev:             s.anomalyStdDevThreshold,
				SLOErrorRateTargetPercent: s.sloTargetPercent,
			},
		},
		GeneratedAt: time.Now().UTC(),
	}

	enrichInsightsWithAI(ctx, s.aiClient, response)
	s.setCached(window, response)
	return response, nil
}

func (s *insightsService) collectNamespaces(
	base []string,
	cpuUsage map[string][]domain.TimeSeriesDataPoint,
	memUsage map[string][]domain.TimeSeriesDataPoint,
	reqRate map[string][]domain.TimeSeriesDataPoint,
	errRate map[string][]domain.TimeSeriesDataPoint,
	netIO map[string][]domain.TimeSeriesDataPoint,
	cpuRequests map[string]float64,
	memRequests map[string]float64,
	restarts map[string]float64,
) []string {
	seen := map[string]struct{}{}
	add := func(namespace string) {
		normalized := strings.ToLower(strings.TrimSpace(namespace))
		if normalized == "" {
			return
		}
		if _, blocked := s.blocklist[normalized]; blocked {
			return
		}
		seen[namespace] = struct{}{}
	}

	for _, namespace := range base {
		add(namespace)
	}
	for namespace := range cpuUsage {
		add(namespace)
	}
	for namespace := range memUsage {
		add(namespace)
	}
	for namespace := range reqRate {
		add(namespace)
	}
	for namespace := range errRate {
		add(namespace)
	}
	for namespace := range netIO {
		add(namespace)
	}
	for namespace := range cpuRequests {
		add(namespace)
	}
	for namespace := range memRequests {
		add(namespace)
	}
	for namespace := range restarts {
		add(namespace)
	}

	out := make([]string, 0, len(seen))
	for namespace := range seen {
		out = append(out, namespace)
	}
	sort.Strings(out)
	return out
}

func (s *insightsService) getCached(window string) *domain.InsightsResponse {
	s.mu.RLock()
	entry, ok := s.cache[window]
	s.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		return nil
	}
	return entry.value
}

func (s *insightsService) setCached(window string, value *domain.InsightsResponse) {
	s.mu.Lock()
	s.cache[window] = cachedInsights{
		value:     value,
		expiresAt: time.Now().Add(s.cacheTTL),
	}
	s.mu.Unlock()
}
