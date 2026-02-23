package ports

import (
	"context"

	"prometheus-metrics-api/internal/core/domain"
)

type InsightsRepository interface {
	GetInsightNamespaces(ctx context.Context) ([]string, error)
	GetCPUUsageSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error)
	GetMemoryUsageSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error)
	GetRequestRateSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error)
	GetErrorRateSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error)
	GetNetworkIOSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error)
	GetCPURequestsByNamespace(ctx context.Context) (map[string]float64, error)
	GetMemoryRequestsByNamespace(ctx context.Context) (map[string]float64, error)
	GetRestartCountByNamespace(ctx context.Context, duration string) (map[string]float64, error)
}
