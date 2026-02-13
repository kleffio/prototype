package ports

import (
	"context"

	"prometheus-metrics-api/internal/core/domain"
)

type MetricsRepository interface {
	GetAllMetrics(ctx context.Context, duration string) (*domain.AggregatedMetrics, error)
	GetClusterOverview(ctx context.Context) (*domain.ClusterOverview, error)

	GetRequestsMetric(ctx context.Context, duration string) (*domain.MetricCard, error)

	GetPodsMetric(ctx context.Context, duration string) (*domain.MetricCard, error)

	GetNodesMetric(ctx context.Context, duration string) (*domain.MetricCard, error)

	GetTenantsMetric(ctx context.Context, duration string) (*domain.MetricCard, error)

	GetCPUUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error)

	GetMemoryUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error)

	GetNodes(ctx context.Context) ([]domain.NodeMetric, error)

	GetNamespaces(ctx context.Context) ([]domain.NamespaceMetric, error)

	GetUptimeMetrics(ctx context.Context, duration string) (*domain.UptimeMetrics, error)

	GetSystemUptime(ctx context.Context) (float64, error)

	GetDatabaseIOMetrics(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error)
	GetProjectUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectUsageMetrics, error)
	GetProjectUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectUsageMetrics, error)
	GetProjectTotalUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectTotalUsageMetrics, error)
	GetProjectTotalUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectTotalUsageMetrics, error)
}
