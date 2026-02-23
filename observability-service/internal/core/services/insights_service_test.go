package services

import (
	"context"
	"testing"
	"time"

	"prometheus-metrics-api/internal/core/domain"
)

type mockInsightsRepository struct {
	namespaces   []string
	cpuSeries    map[string][]domain.TimeSeriesDataPoint
	memSeries    map[string][]domain.TimeSeriesDataPoint
	reqSeries    map[string][]domain.TimeSeriesDataPoint
	errSeries    map[string][]domain.TimeSeriesDataPoint
	netSeries    map[string][]domain.TimeSeriesDataPoint
	cpuRequests  map[string]float64
	memRequests  map[string]float64
	restartCount map[string]float64
}

func (m *mockInsightsRepository) GetInsightNamespaces(_ context.Context) ([]string, error) {
	return m.namespaces, nil
}
func (m *mockInsightsRepository) GetCPUUsageSeriesByNamespace(_ context.Context, _ string) (map[string][]domain.TimeSeriesDataPoint, error) {
	return m.cpuSeries, nil
}
func (m *mockInsightsRepository) GetMemoryUsageSeriesByNamespace(_ context.Context, _ string) (map[string][]domain.TimeSeriesDataPoint, error) {
	return m.memSeries, nil
}
func (m *mockInsightsRepository) GetRequestRateSeriesByNamespace(_ context.Context, _ string) (map[string][]domain.TimeSeriesDataPoint, error) {
	return m.reqSeries, nil
}
func (m *mockInsightsRepository) GetErrorRateSeriesByNamespace(_ context.Context, _ string) (map[string][]domain.TimeSeriesDataPoint, error) {
	return m.errSeries, nil
}
func (m *mockInsightsRepository) GetNetworkIOSeriesByNamespace(_ context.Context, _ string) (map[string][]domain.TimeSeriesDataPoint, error) {
	return m.netSeries, nil
}
func (m *mockInsightsRepository) GetCPURequestsByNamespace(_ context.Context) (map[string]float64, error) {
	return m.cpuRequests, nil
}
func (m *mockInsightsRepository) GetMemoryRequestsByNamespace(_ context.Context) (map[string]float64, error) {
	return m.memRequests, nil
}
func (m *mockInsightsRepository) GetRestartCountByNamespace(_ context.Context, _ string) (map[string]float64, error) {
	return m.restartCount, nil
}

func TestInsightsService_GeneratesRecommendationsAndAnomalies(t *testing.T) {
	base := time.Now().Add(-time.Hour).UnixMilli()
	points := []domain.TimeSeriesDataPoint{
		{Timestamp: base + 1000, Value: 0.05},
		{Timestamp: base + 2000, Value: 0.06},
		{Timestamp: base + 3000, Value: 0.04},
		{Timestamp: base + 4000, Value: 0.05},
		{Timestamp: base + 5000, Value: 0.40},
	}

	repo := &mockInsightsRepository{
		namespaces: []string{"tenant-a"},
		cpuSeries:  map[string][]domain.TimeSeriesDataPoint{"tenant-a": points},
		memSeries: map[string][]domain.TimeSeriesDataPoint{
			"tenant-a": {
				{Timestamp: base + 1000, Value: 100 * 1024 * 1024},
				{Timestamp: base + 2000, Value: 110 * 1024 * 1024},
				{Timestamp: base + 3000, Value: 90 * 1024 * 1024},
				{Timestamp: base + 4000, Value: 105 * 1024 * 1024},
				{Timestamp: base + 5000, Value: 300 * 1024 * 1024},
			},
		},
		reqSeries: map[string][]domain.TimeSeriesDataPoint{"tenant-a": points},
		errSeries: map[string][]domain.TimeSeriesDataPoint{
			"tenant-a": {
				{Timestamp: base + 1000, Value: 0.001},
			},
		},
		netSeries: map[string][]domain.TimeSeriesDataPoint{
			"tenant-a": {
				{Timestamp: base + 1000, Value: 10},
			},
		},
		cpuRequests:  map[string]float64{"tenant-a": 1.0},
		memRequests:  map[string]float64{"tenant-a": 2 * 1024 * 1024 * 1024},
		restartCount: map[string]float64{"tenant-a": 4},
	}

	service := NewInsightsService(repo, time.Minute, "7d", nil, 2.0, 1.0, 8.0, 1.5)
	resp, err := service.GetAdminInsights(context.Background(), "7d")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(resp.Recommendations) == 0 {
		t.Fatalf("expected recommendations")
	}
	if len(resp.Anomalies) == 0 {
		t.Fatalf("expected anomalies")
	}
	if resp.Summary.TotalNamespaces != 1 {
		t.Fatalf("expected one namespace, got %d", resp.Summary.TotalNamespaces)
	}
}

func TestInsightsService_UsesCache(t *testing.T) {
	repo := &mockInsightsRepository{
		namespaces: []string{"tenant-a"},
	}

	service := NewInsightsService(repo, 10*time.Minute, "7d", nil, 2.0, 1.0, 8.0, 1.5)
	first, err := service.GetAdminInsights(context.Background(), "7d")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	second, err := service.GetAdminInsights(context.Background(), "7d")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if first.GeneratedAt != second.GeneratedAt {
		t.Fatalf("expected cached response with identical generatedAt")
	}
	if !second.Metadata.CacheHit {
		t.Fatalf("expected cache hit")
	}
}
