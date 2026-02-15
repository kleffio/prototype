package services

import (
	"context"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"
)

type metricsService struct {
	metricsRepo ports.MetricsRepository
}

func NewMetricsService(metricsRepo ports.MetricsRepository) ports.MetricsService {
	return &metricsService{
		metricsRepo: metricsRepo,
	}
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
