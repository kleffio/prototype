package services

import (
	"context"
	"errors"
	"testing"

	"prometheus-metrics-api/internal/core/domain"

	"github.com/stretchr/testify/assert"
)

// mockMetricsRepository is a mock implementation of ports.MetricsRepository
type mockMetricsRepository struct {
	getAllMetricsFunc                       func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error)
	getClusterOverviewFunc                  func(ctx context.Context) (*domain.ClusterOverview, error)
	getRequestsMetricFunc                   func(ctx context.Context, duration string) (*domain.MetricCard, error)
	getPodsMetricFunc                       func(ctx context.Context, duration string) (*domain.MetricCard, error)
	getNodesMetricFunc                      func(ctx context.Context, duration string) (*domain.MetricCard, error)
	getTenantsMetricFunc                    func(ctx context.Context, duration string) (*domain.MetricCard, error)
	getCPUUtilizationFunc                   func(ctx context.Context, duration string) (*domain.ResourceUtilization, error)
	getMemoryUtilizationFunc                func(ctx context.Context, duration string) (*domain.ResourceUtilization, error)
	getNodesFunc                            func(ctx context.Context) ([]domain.NodeMetric, error)
	getNamespacesFunc                       func(ctx context.Context) ([]domain.NamespaceMetric, error)
	getDatabaseIOMetricsFunc                func(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error)
	getProjectUsageMetricsFunc              func(ctx context.Context, projectID string) (*domain.ProjectUsageMetrics, error)
	getProjectUsageMetricsWithDaysFunc      func(ctx context.Context, projectID string, days int) (*domain.ProjectUsageMetrics, error)
	getProjectTotalUsageMetricsFunc         func(ctx context.Context, projectID string) (*domain.ProjectTotalUsageMetrics, error)
	getProjectTotalUsageMetricsWithDaysFunc func(ctx context.Context, projectID string, days int) (*domain.ProjectTotalUsageMetrics, error)
	getSystemUptimeFunc                     func(ctx context.Context) (float64, error)
	getUptimeMetricsFunc                    func(ctx context.Context, duration string) (*domain.UptimeMetrics, error)
}

func (m *mockMetricsRepository) GetAllMetrics(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
	if m.getAllMetricsFunc != nil {
		return m.getAllMetricsFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetClusterOverview(ctx context.Context) (*domain.ClusterOverview, error) {
	if m.getClusterOverviewFunc != nil {
		return m.getClusterOverviewFunc(ctx)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetRequestsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	if m.getRequestsMetricFunc != nil {
		return m.getRequestsMetricFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetPodsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	if m.getPodsMetricFunc != nil {
		return m.getPodsMetricFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetNodesMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	if m.getNodesMetricFunc != nil {
		return m.getNodesMetricFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetTenantsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	if m.getTenantsMetricFunc != nil {
		return m.getTenantsMetricFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetCPUUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
	if m.getCPUUtilizationFunc != nil {
		return m.getCPUUtilizationFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetMemoryUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
	if m.getMemoryUtilizationFunc != nil {
		return m.getMemoryUtilizationFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetNodes(ctx context.Context) ([]domain.NodeMetric, error) {
	if m.getNodesFunc != nil {
		return m.getNodesFunc(ctx)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetNamespaces(ctx context.Context) ([]domain.NamespaceMetric, error) {
	if m.getNamespacesFunc != nil {
		return m.getNamespacesFunc(ctx)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetDatabaseIOMetrics(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error) {
	if m.getDatabaseIOMetricsFunc != nil {
		return m.getDatabaseIOMetricsFunc(ctx, duration, namespaces)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetProjectUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectUsageMetrics, error) {
	if m.getProjectUsageMetricsFunc != nil {
		return m.getProjectUsageMetricsFunc(ctx, projectID)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetProjectUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectUsageMetrics, error) {
	if m.getProjectUsageMetricsWithDaysFunc != nil {
		return m.getProjectUsageMetricsWithDaysFunc(ctx, projectID, days)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetProjectTotalUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectTotalUsageMetrics, error) {
	if m.getProjectTotalUsageMetricsFunc != nil {
		return m.getProjectTotalUsageMetricsFunc(ctx, projectID)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetProjectTotalUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectTotalUsageMetrics, error) {
	if m.getProjectTotalUsageMetricsWithDaysFunc != nil {
		return m.getProjectTotalUsageMetricsWithDaysFunc(ctx, projectID, days)
	}
	return nil, errors.New("not implemented")
}

func TestGetClusterOverview_Success(t *testing.T) {
	expectedOverview := &domain.ClusterOverview{
		TotalNodes:         5,
		RunningNodes:       4,
		TotalPods:          50,
		TotalNamespaces:    10,
		CPUUsagePercent:    65.5,
		MemoryUsagePercent: 72.3,
	}

	mockRepo := &mockMetricsRepository{
		getClusterOverviewFunc: func(ctx context.Context) (*domain.ClusterOverview, error) {
			return expectedOverview, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetClusterOverview(ctx)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.TotalNodes != expectedOverview.TotalNodes {
		t.Errorf("Expected TotalNodes %d, got %d", expectedOverview.TotalNodes, result.TotalNodes)
	}

	if result.CPUUsagePercent != expectedOverview.CPUUsagePercent {
		t.Errorf("Expected CPUUsagePercent %.2f, got %.2f", expectedOverview.CPUUsagePercent, result.CPUUsagePercent)
	}
}

func TestGetClusterOverview_Error(t *testing.T) {
	expectedError := errors.New("prometheus connection failed")

	mockRepo := &mockMetricsRepository{
		getClusterOverviewFunc: func(ctx context.Context) (*domain.ClusterOverview, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetClusterOverview(ctx)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if err.Error() != expectedError.Error() {
		t.Errorf("Expected error '%v', got '%v'", expectedError, err)
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetRequestsMetric_Success(t *testing.T) {
	expectedMetric := &domain.MetricCard{
		Title:         "Total Requests",
		Value:         "1.5M",
		RawValue:      1500000,
		ChangePercent: "+12.5%",
		ChangeLabel:   "vs last period",
		Status:        "healthy",
		Sparkline: []domain.TimeSeriesDataPoint{
			{Timestamp: 1000, Value: 100},
			{Timestamp: 2000, Value: 150},
		},
	}

	mockRepo := &mockMetricsRepository{
		getRequestsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			if duration != "1h" {
				t.Errorf("Expected duration '1h', got '%s'", duration)
			}
			return expectedMetric, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetRequestsMetric(ctx, "1h")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.Title != expectedMetric.Title {
		t.Errorf("Expected Title '%s', got '%s'", expectedMetric.Title, result.Title)
	}

	if result.RawValue != expectedMetric.RawValue {
		t.Errorf("Expected RawValue %.0f, got %.0f", expectedMetric.RawValue, result.RawValue)
	}
}

func TestGetCPUUtilization_Success(t *testing.T) {
	expectedUtilization := &domain.ResourceUtilization{
		CurrentValue:  75.5,
		ChangePercent: 5.2,
		Trend:         "up",
		History: []domain.TimeSeriesDataPoint{
			{Timestamp: 1000, Value: 70},
			{Timestamp: 2000, Value: 75.5},
		},
	}

	mockRepo := &mockMetricsRepository{
		getCPUUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return expectedUtilization, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetCPUUtilization(ctx, "24h")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.CurrentValue != expectedUtilization.CurrentValue {
		t.Errorf("Expected CurrentValue %.2f, got %.2f", expectedUtilization.CurrentValue, result.CurrentValue)
	}

	if result.Trend != expectedUtilization.Trend {
		t.Errorf("Expected Trend '%s', got '%s'", expectedUtilization.Trend, result.Trend)
	}
}

func TestGetNodes_Success(t *testing.T) {
	expectedNodes := []domain.NodeMetric{
		{
			Name:               "node-1",
			CPUUsagePercent:    60.5,
			MemoryUsagePercent: 70.2,
			PodCount:           15,
			Status:             "Ready",
		},
		{
			Name:               "node-2",
			CPUUsagePercent:    55.3,
			MemoryUsagePercent: 65.8,
			PodCount:           12,
			Status:             "Ready",
		},
	}

	mockRepo := &mockMetricsRepository{
		getNodesFunc: func(ctx context.Context) ([]domain.NodeMetric, error) {
			return expectedNodes, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetNodes(ctx)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(result) != len(expectedNodes) {
		t.Errorf("Expected %d nodes, got %d", len(expectedNodes), len(result))
	}

	if len(result) > 0 && result[0].Name != expectedNodes[0].Name {
		t.Errorf("Expected first node name '%s', got '%s'", expectedNodes[0].Name, result[0].Name)
	}
}

func TestGetNamespaces_Success(t *testing.T) {
	expectedNamespaces := []domain.NamespaceMetric{
		{
			Name:        "default",
			PodCount:    20,
			CPUUsage:    10.5,
			MemoryUsage: 2048.0,
		},
		{
			Name:        "kube-system",
			PodCount:    15,
			CPUUsage:    5.2,
			MemoryUsage: 1024.0,
		},
	}

	mockRepo := &mockMetricsRepository{
		getNamespacesFunc: func(ctx context.Context) ([]domain.NamespaceMetric, error) {
			return expectedNamespaces, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetNamespaces(ctx)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(result) != len(expectedNamespaces) {
		t.Errorf("Expected %d namespaces, got %d", len(expectedNamespaces), len(result))
	}
}

func TestGetDatabaseIOMetrics_Success(t *testing.T) {
	expectedMetrics := &domain.DatabaseMetrics{
		DiskReadBytesPerSec:  1024000.0,
		DiskWriteBytesPerSec: 512000.0,
		DiskReadOpsPerSec:    100.0,
		DiskWriteOpsPerSec:   50.0,
		Source:               "prometheus",
	}

	mockRepo := &mockMetricsRepository{
		getDatabaseIOMetricsFunc: func(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error) {
			return expectedMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetDatabaseIOMetrics(ctx, "1h", nil)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.DiskReadBytesPerSec != expectedMetrics.DiskReadBytesPerSec {
		t.Errorf("Expected DiskReadBytesPerSec %.2f, got %.2f",
			expectedMetrics.DiskReadBytesPerSec, result.DiskReadBytesPerSec)
	}
}

func TestGetRequestsMetric_Error(t *testing.T) {
	expectedError := errors.New("repository error")

	mockRepo := &mockMetricsRepository{
		getRequestsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetRequestsMetric(ctx, "1h")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetPodsMetric_Success(t *testing.T) {
	expectedMetric := &domain.MetricCard{
		Title:    "Total Pods",
		Value:    "150",
		RawValue: 150,
		Status:   "healthy",
	}

	mockRepo := &mockMetricsRepository{
		getPodsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return expectedMetric, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetPodsMetric(ctx, "24h")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.Title != expectedMetric.Title {
		t.Errorf("Expected Title '%s', got '%s'", expectedMetric.Title, result.Title)
	}
}

func TestGetPodsMetric_Error(t *testing.T) {
	expectedError := errors.New("pods metric error")

	mockRepo := &mockMetricsRepository{
		getPodsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetPodsMetric(ctx, "1h")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetNodesMetric_Success(t *testing.T) {
	expectedMetric := &domain.MetricCard{
		Title:    "Total Nodes",
		Value:    "5",
		RawValue: 5,
		Status:   "healthy",
	}

	mockRepo := &mockMetricsRepository{
		getNodesMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return expectedMetric, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetNodesMetric(ctx, "12h")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.RawValue != expectedMetric.RawValue {
		t.Errorf("Expected RawValue %.0f, got %.0f", expectedMetric.RawValue, result.RawValue)
	}
}

func TestGetNodesMetric_Error(t *testing.T) {
	expectedError := errors.New("nodes metric error")

	mockRepo := &mockMetricsRepository{
		getNodesMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetNodesMetric(ctx, "1h")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetTenantsMetric_Success(t *testing.T) {
	expectedMetric := &domain.MetricCard{
		Title:    "Total Tenants",
		Value:    "25",
		RawValue: 25,
		Status:   "healthy",
	}

	mockRepo := &mockMetricsRepository{
		getTenantsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return expectedMetric, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetTenantsMetric(ctx, "6h")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.Title != expectedMetric.Title {
		t.Errorf("Expected Title '%s', got '%s'", expectedMetric.Title, result.Title)
	}
}

func TestGetTenantsMetric_Error(t *testing.T) {
	expectedError := errors.New("tenants metric error")

	mockRepo := &mockMetricsRepository{
		getTenantsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetTenantsMetric(ctx, "1h")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetCPUUtilization_Error(t *testing.T) {
	expectedError := errors.New("cpu utilization error")

	mockRepo := &mockMetricsRepository{
		getCPUUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetCPUUtilization(ctx, "1h")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetMemoryUtilization_Success(t *testing.T) {
	expectedUtilization := &domain.ResourceUtilization{
		CurrentValue:  82.3,
		ChangePercent: 3.5,
		Trend:         "stable",
		History: []domain.TimeSeriesDataPoint{
			{Timestamp: 1000, Value: 80},
			{Timestamp: 2000, Value: 82.3},
		},
	}

	mockRepo := &mockMetricsRepository{
		getMemoryUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return expectedUtilization, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetMemoryUtilization(ctx, "24h")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.CurrentValue != expectedUtilization.CurrentValue {
		t.Errorf("Expected CurrentValue %.2f, got %.2f", expectedUtilization.CurrentValue, result.CurrentValue)
	}
}

func TestGetMemoryUtilization_Error(t *testing.T) {
	expectedError := errors.New("memory utilization error")

	mockRepo := &mockMetricsRepository{
		getMemoryUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetMemoryUtilization(ctx, "1h")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetNodes_Error(t *testing.T) {
	expectedError := errors.New("nodes error")

	mockRepo := &mockMetricsRepository{
		getNodesFunc: func(ctx context.Context) ([]domain.NodeMetric, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetNodes(ctx)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetNamespaces_Error(t *testing.T) {
	expectedError := errors.New("namespaces error")

	mockRepo := &mockMetricsRepository{
		getNamespacesFunc: func(ctx context.Context) ([]domain.NamespaceMetric, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetNamespaces(ctx)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetDatabaseIOMetrics_Error(t *testing.T) {
	expectedError := errors.New("database io error")

	mockRepo := &mockMetricsRepository{
		getDatabaseIOMetricsFunc: func(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetDatabaseIOMetrics(ctx, "1h", nil)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetProjectUsageMetricsWithDays_Success(t *testing.T) {
	expectedMetrics := &domain.ProjectUsageMetrics{
		ProjectID:       "project-123",
		MemoryUsageGB:   4.2,
		CPURequestCores: 1.5,
		Window:          "7d",
	}

	mockRepo := &mockMetricsRepository{
		getProjectUsageMetricsWithDaysFunc: func(ctx context.Context, projectID string, days int) (*domain.ProjectUsageMetrics, error) {
			if projectID != "project-123" {
				t.Errorf("Expected projectID 'project-123', got '%s'", projectID)
			}
			if days != 7 {
				t.Errorf("Expected days 7, got %d", days)
			}
			return expectedMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetProjectUsageMetricsWithDays(ctx, "project-123", 7)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.ProjectID != expectedMetrics.ProjectID {
		t.Errorf("Expected ProjectID '%s', got '%s'", expectedMetrics.ProjectID, result.ProjectID)
	}

	if result.Window != expectedMetrics.Window {
		t.Errorf("Expected Window '%s', got '%s'", expectedMetrics.Window, result.Window)
	}
}

// Add these methods to the mockMetricsRepository struct
func (m *mockMetricsRepository) GetSystemUptime(ctx context.Context) (float64, error) {
	if m.getSystemUptimeFunc != nil {
		return m.getSystemUptimeFunc(ctx)
	}
	return 0, errors.New("not implemented")
}

func (m *mockMetricsRepository) GetUptimeMetrics(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
	if m.getUptimeMetricsFunc != nil {
		return m.getUptimeMetricsFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

// Tests for GetSystemUptime

func TestGetSystemUptime_Success(t *testing.T) {
	expectedUptime := 864000.0 // 10 days in seconds

	mockRepo := &mockMetricsRepository{
		getSystemUptimeFunc: func(ctx context.Context) (float64, error) {
			return expectedUptime, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetSystemUptime(ctx)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result != expectedUptime {
		t.Errorf("Expected uptime %.2f, got %.2f", expectedUptime, result)
	}
}

func TestGetSystemUptime_Error(t *testing.T) {
	expectedError := errors.New("failed to query system uptime")

	mockRepo := &mockMetricsRepository{
		getSystemUptimeFunc: func(ctx context.Context) (float64, error) {
			return 0, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetSystemUptime(ctx)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if err.Error() != expectedError.Error() {
		t.Errorf("Expected error '%v', got '%v'", expectedError, err)
	}

	if result != 0 {
		t.Errorf("Expected uptime 0, got %.2f", result)
	}
}

func TestGetSystemUptime_ZeroUptime(t *testing.T) {
	mockRepo := &mockMetricsRepository{
		getSystemUptimeFunc: func(ctx context.Context) (float64, error) {
			return 0, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetSystemUptime(ctx)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result != 0 {
		t.Errorf("Expected uptime 0, got %.2f", result)
	}
}

// Tests for GetUptimeMetrics

func TestGetUptimeMetrics_Success(t *testing.T) {
	expectedMetrics := &domain.UptimeMetrics{
		SystemUptimeSeconds:    864000.0,
		SystemUptimeFormatted:  "10d 0h 0m",
		AverageUptimeSeconds:   864000.0,
		AverageUptimeFormatted: "10d 0h 0m",
		NodeUptimes: []domain.NodeUptimeMetric{
			{
				NodeName:         "192.168.0.203:9100",
				UptimeSeconds:    864000.0,
				UptimeFormatted:  "10d 0h 0m",
				BootTimestamp:    1736500000,
				BootTimeReadable: "2025-01-10 05:06:40 UTC",
			},
			{
				NodeName:         "192.168.0.201:9100",
				UptimeSeconds:    864000.0,
				UptimeFormatted:  "10d 0h 0m",
				BootTimestamp:    1736500000,
				BootTimeReadable: "2025-01-10 05:06:40 UTC",
			},
		},
		UptimeHistory: []domain.TimeSeriesDataPoint{
			{Timestamp: 1000000, Value: 864000.0},
			{Timestamp: 2000000, Value: 864000.0},
			{Timestamp: 3000000, Value: 864000.0},
		},
	}

	mockRepo := &mockMetricsRepository{
		getUptimeMetricsFunc: func(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
			if duration != "7d" {
				t.Errorf("Expected duration '7d', got '%s'", duration)
			}
			return expectedMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetUptimeMetrics(ctx, "7d")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.SystemUptimeSeconds != expectedMetrics.SystemUptimeSeconds {
		t.Errorf("Expected SystemUptimeSeconds %.2f, got %.2f",
			expectedMetrics.SystemUptimeSeconds, result.SystemUptimeSeconds)
	}

	if result.SystemUptimeFormatted != expectedMetrics.SystemUptimeFormatted {
		t.Errorf("Expected SystemUptimeFormatted '%s', got '%s'",
			expectedMetrics.SystemUptimeFormatted, result.SystemUptimeFormatted)
	}

	if len(result.NodeUptimes) != len(expectedMetrics.NodeUptimes) {
		t.Errorf("Expected %d node uptimes, got %d",
			len(expectedMetrics.NodeUptimes), len(result.NodeUptimes))
	}

	if len(result.UptimeHistory) != len(expectedMetrics.UptimeHistory) {
		t.Errorf("Expected %d history points, got %d",
			len(expectedMetrics.UptimeHistory), len(result.UptimeHistory))
	}
}

func TestGetUptimeMetrics_Error(t *testing.T) {
	expectedError := errors.New("prometheus query failed")

	mockRepo := &mockMetricsRepository{
		getUptimeMetricsFunc: func(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetUptimeMetrics(ctx, "24h")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if err.Error() != expectedError.Error() {
		t.Errorf("Expected error '%v', got '%v'", expectedError, err)
	}

	if result != nil {
		t.Errorf("Expected nil result, got %v", result)
	}
}

func TestGetUptimeMetrics_EmptyNodes(t *testing.T) {
	expectedMetrics := &domain.UptimeMetrics{
		SystemUptimeSeconds:    0,
		SystemUptimeFormatted:  "0m",
		AverageUptimeSeconds:   0,
		AverageUptimeFormatted: "0m",
		NodeUptimes:            []domain.NodeUptimeMetric{},
		UptimeHistory:          []domain.TimeSeriesDataPoint{},
	}

	mockRepo := &mockMetricsRepository{
		getUptimeMetricsFunc: func(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
			return expectedMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetUptimeMetrics(ctx, "1h")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(result.NodeUptimes) != 0 {
		t.Errorf("Expected 0 node uptimes, got %d", len(result.NodeUptimes))
	}

	if len(result.UptimeHistory) != 0 {
		t.Errorf("Expected 0 history points, got %d", len(result.UptimeHistory))
	}
}

func TestGetUptimeMetrics_SingleNode(t *testing.T) {
	expectedMetrics := &domain.UptimeMetrics{
		SystemUptimeSeconds:    432000.0,
		SystemUptimeFormatted:  "5d 0h 0m",
		AverageUptimeSeconds:   432000.0,
		AverageUptimeFormatted: "5d 0h 0m",
		NodeUptimes: []domain.NodeUptimeMetric{
			{
				NodeName:         "192.168.0.203:9100",
				UptimeSeconds:    432000.0,
				UptimeFormatted:  "5d 0h 0m",
				BootTimestamp:    1736932000,
				BootTimeReadable: "2025-01-15 05:06:40 UTC",
			},
		},
		UptimeHistory: []domain.TimeSeriesDataPoint{
			{Timestamp: 1000000, Value: 432000.0},
		},
	}

	mockRepo := &mockMetricsRepository{
		getUptimeMetricsFunc: func(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
			return expectedMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetUptimeMetrics(ctx, "30d")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(result.NodeUptimes) != 1 {
		t.Errorf("Expected 1 node uptime, got %d", len(result.NodeUptimes))
	}

	if result.NodeUptimes[0].NodeName != expectedMetrics.NodeUptimes[0].NodeName {
		t.Errorf("Expected node name '%s', got '%s'",
			expectedMetrics.NodeUptimes[0].NodeName, result.NodeUptimes[0].NodeName)
	}
}

func TestGetUptimeMetrics_DifferentDurations(t *testing.T) {
	durations := []string{"24h", "7d", "30d", "90d"}

	for _, duration := range durations {
		t.Run("Duration_"+duration, func(t *testing.T) {
			mockRepo := &mockMetricsRepository{
				getUptimeMetricsFunc: func(ctx context.Context, d string) (*domain.UptimeMetrics, error) {
					if d != duration {
						t.Errorf("Expected duration '%s', got '%s'", duration, d)
					}
					return &domain.UptimeMetrics{
						SystemUptimeSeconds:    864000.0,
						SystemUptimeFormatted:  "10d 0h 0m",
						AverageUptimeSeconds:   864000.0,
						AverageUptimeFormatted: "10d 0h 0m",
						NodeUptimes:            []domain.NodeUptimeMetric{},
						UptimeHistory:          []domain.TimeSeriesDataPoint{},
					}, nil
				},
			}

			service := NewMetricsService(mockRepo)
			ctx := context.Background()

			result, err := service.GetUptimeMetrics(ctx, duration)

			if err != nil {
				t.Fatalf("Expected no error for duration %s, got %v", duration, err)
			}

			if result == nil {
				t.Fatalf("Expected result for duration %s, got nil", duration)
			}
		})
	}
}

func TestGetUptimeMetrics_VerifyNodeDetails(t *testing.T) {
	expectedNode := domain.NodeUptimeMetric{
		NodeName:         "test-node:9100",
		UptimeSeconds:    123456.0,
		UptimeFormatted:  "1d 10h 17m",
		BootTimestamp:    1736000000,
		BootTimeReadable: "2025-01-05 00:00:00 UTC",
	}

	expectedMetrics := &domain.UptimeMetrics{
		SystemUptimeSeconds:    123456.0,
		SystemUptimeFormatted:  "1d 10h 17m",
		AverageUptimeSeconds:   123456.0,
		AverageUptimeFormatted: "1d 10h 17m",
		NodeUptimes:            []domain.NodeUptimeMetric{expectedNode},
		UptimeHistory:          []domain.TimeSeriesDataPoint{},
	}

	mockRepo := &mockMetricsRepository{
		getUptimeMetricsFunc: func(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
			return expectedMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetUptimeMetrics(ctx, "24h")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(result.NodeUptimes) != 1 {
		t.Fatalf("Expected 1 node, got %d", len(result.NodeUptimes))
	}

	node := result.NodeUptimes[0]

	if node.NodeName != expectedNode.NodeName {
		t.Errorf("Expected NodeName '%s', got '%s'", expectedNode.NodeName, node.NodeName)
	}

	if node.UptimeSeconds != expectedNode.UptimeSeconds {
		t.Errorf("Expected UptimeSeconds %.2f, got %.2f", expectedNode.UptimeSeconds, node.UptimeSeconds)
	}

	if node.UptimeFormatted != expectedNode.UptimeFormatted {
		t.Errorf("Expected UptimeFormatted '%s', got '%s'", expectedNode.UptimeFormatted, node.UptimeFormatted)
	}

	if node.BootTimestamp != expectedNode.BootTimestamp {
		t.Errorf("Expected BootTimestamp %d, got %d", expectedNode.BootTimestamp, node.BootTimestamp)
	}

	if node.BootTimeReadable != expectedNode.BootTimeReadable {
		t.Errorf("Expected BootTimeReadable '%s', got '%s'", expectedNode.BootTimeReadable, node.BootTimeReadable)
	}
}

func TestGetUptimeMetrics_VerifyHistoryData(t *testing.T) {
	expectedHistory := []domain.TimeSeriesDataPoint{
		{Timestamp: 1000000, Value: 100000.0},
		{Timestamp: 2000000, Value: 200000.0},
		{Timestamp: 3000000, Value: 300000.0},
		{Timestamp: 4000000, Value: 400000.0},
	}

	expectedMetrics := &domain.UptimeMetrics{
		SystemUptimeSeconds:    400000.0,
		SystemUptimeFormatted:  "4d 15h 6m",
		AverageUptimeSeconds:   400000.0,
		AverageUptimeFormatted: "4d 15h 6m",
		NodeUptimes:            []domain.NodeUptimeMetric{},
		UptimeHistory:          expectedHistory,
	}

	mockRepo := &mockMetricsRepository{
		getUptimeMetricsFunc: func(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
			return expectedMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	ctx := context.Background()

	result, err := service.GetUptimeMetrics(ctx, "7d")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(result.UptimeHistory) != len(expectedHistory) {
		t.Fatalf("Expected %d history points, got %d", len(expectedHistory), len(result.UptimeHistory))
	}

	for i, expected := range expectedHistory {
		actual := result.UptimeHistory[i]

		if actual.Timestamp != expected.Timestamp {
			t.Errorf("History[%d]: Expected Timestamp %d, got %d", i, expected.Timestamp, actual.Timestamp)
		}

		if actual.Value != expected.Value {
			t.Errorf("History[%d]: Expected Value %.2f, got %.2f", i, expected.Value, actual.Value)
		}
	}
}

func TestMetricsService_GetAllMetrics_Success(t *testing.T) {
	expectedMetrics := &domain.AggregatedMetrics{
		Overview: &domain.ClusterOverview{
			TotalNodes:         5,
			RunningNodes:       5,
			TotalPods:          120,
			TotalNamespaces:    15,
			CPUUsagePercent:    45.2,
			MemoryUsagePercent: 62.8,
		},
		RequestsMetric: &domain.MetricCard{
			Title:    "HTTP Requests",
			Value:    "1250 req/s",
			RawValue: 1250.5,
		},
		Nodes: []domain.NodeMetric{
			{Name: "node-1", Status: "Ready"},
			{Name: "node-2", Status: "Ready"},
		},
		Namespaces: []domain.NamespaceMetric{
			{Name: "default", PodCount: 25},
			{Name: "kube-system", PodCount: 30},
		},
	}

	mockRepo := &mockMetricsRepository{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			assert.Equal(t, "1h", duration)
			return expectedMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	result, err := service.GetAllMetrics(context.Background(), "1h")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedMetrics, result)
	assert.Equal(t, 5, result.Overview.TotalNodes)
	assert.Equal(t, 120, result.Overview.TotalPods)
	assert.Len(t, result.Nodes, 2)
	assert.Len(t, result.Namespaces, 2)
}

func TestMetricsService_GetAllMetrics_RepositoryError(t *testing.T) {
	expectedError := errors.New("repository connection failed")

	mockRepo := &mockMetricsRepository{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return nil, expectedError
		},
	}

	service := NewMetricsService(mockRepo)
	result, err := service.GetAllMetrics(context.Background(), "1h")

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, expectedError, err)
}

func TestMetricsService_GetAllMetrics_WithDifferentDurations(t *testing.T) {
	testCases := []struct {
		name     string
		duration string
	}{
		{"1 hour", "1h"},
		{"6 hours", "6h"},
		{"24 hours", "24h"},
		{"7 days", "7d"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockRepo := &mockMetricsRepository{
				getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
					assert.Equal(t, tc.duration, duration)
					return &domain.AggregatedMetrics{
						Overview: &domain.ClusterOverview{TotalNodes: 5},
					}, nil
				},
			}

			service := NewMetricsService(mockRepo)
			result, err := service.GetAllMetrics(context.Background(), tc.duration)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, 5, result.Overview.TotalNodes)
		})
	}
}

func TestMetricsService_GetAllMetrics_PartialData(t *testing.T) {
	partialMetrics := &domain.AggregatedMetrics{
		Overview: &domain.ClusterOverview{
			TotalNodes: 5,
		},
		CPUUtilization:    nil,
		MemoryUtilization: nil,
	}

	mockRepo := &mockMetricsRepository{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return partialMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	result, err := service.GetAllMetrics(context.Background(), "1h")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.Overview)
	assert.Nil(t, result.CPUUtilization)
	assert.Nil(t, result.MemoryUtilization)
}

func TestMetricsService_GetAllMetrics_EmptyCollections(t *testing.T) {
	metricsWithEmpty := &domain.AggregatedMetrics{
		Overview:   &domain.ClusterOverview{TotalNodes: 0},
		Nodes:      []domain.NodeMetric{},
		Namespaces: []domain.NamespaceMetric{},
	}

	mockRepo := &mockMetricsRepository{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return metricsWithEmpty, nil
		},
	}

	service := NewMetricsService(mockRepo)
	result, err := service.GetAllMetrics(context.Background(), "1h")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.Nodes)
	assert.Len(t, result.Nodes, 0)
	assert.NotNil(t, result.Namespaces)
	assert.Len(t, result.Namespaces, 0)
}

func TestMetricsService_GetAllMetrics_ContextCancellation(t *testing.T) {
	mockRepo := &mockMetricsRepository{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return nil, ctx.Err()
		},
	}

	service := NewMetricsService(mockRepo)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	result, err := service.GetAllMetrics(ctx, "1h")

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestMetricsService_GetAllMetrics_AllFieldsPopulated(t *testing.T) {
	fullMetrics := &domain.AggregatedMetrics{
		Overview: &domain.ClusterOverview{
			TotalNodes:         5,
			RunningNodes:       5,
			TotalPods:          120,
			TotalNamespaces:    15,
			CPUUsagePercent:    45.2,
			MemoryUsagePercent: 62.8,
			UptimeSeconds:      1234567,
			UptimeFormatted:    "14d 6h 56m",
		},
		RequestsMetric: &domain.MetricCard{
			Title:         "HTTP Requests",
			Value:         "1250 req/s",
			RawValue:      1250.5,
			ChangePercent: "+15.2%",
			ChangeLabel:   "vs 1h ago",
			Status:        "good",
			Sparkline: []domain.TimeSeriesDataPoint{
				{Timestamp: 1640995200000, Value: 1200},
				{Timestamp: 1640995260000, Value: 1250},
			},
		},
		PodsMetric: &domain.MetricCard{
			Title:    "Total Pods",
			Value:    "120",
			RawValue: 120,
		},
		NodesMetric: &domain.MetricCard{
			Title:    "Cluster Nodes",
			Value:    "5",
			RawValue: 5,
		},
		TenantsMetric: &domain.MetricCard{
			Title:    "Active Tenants",
			Value:    "12",
			RawValue: 12,
		},
		CPUUtilization: &domain.ResourceUtilization{
			CurrentValue:  45.2,
			ChangePercent: 2.3,
			Trend:         "up",
			History: []domain.TimeSeriesDataPoint{
				{Timestamp: 1640995200000, Value: 43},
				{Timestamp: 1640995260000, Value: 45.2},
			},
		},
		MemoryUtilization: &domain.ResourceUtilization{
			CurrentValue:  62.8,
			ChangePercent: -1.5,
			Trend:         "down",
			History: []domain.TimeSeriesDataPoint{
				{Timestamp: 1640995200000, Value: 64},
				{Timestamp: 1640995260000, Value: 62.8},
			},
		},
		Nodes: []domain.NodeMetric{
			{
				Name:               "node-1",
				CPUUsagePercent:    42.5,
				MemoryUsagePercent: 58.3,
				PodCount:           45,
				Status:             "Ready",
				UptimeSeconds:      987654,
				UptimeFormatted:    "11d 10h 20m",
			},
		},
		Namespaces: []domain.NamespaceMetric{
			{
				Name:        "default",
				PodCount:    25,
				CPUUsage:    12.5,
				MemoryUsage: 8.2,
			},
		},
		DatabaseIOMetrics: &domain.DatabaseMetrics{
			DiskReadBytesPerSec:  1024000,
			DiskWriteBytesPerSec: 512000,
			DiskReadOpsPerSec:    150,
			DiskWriteOpsPerSec:   75,
			DiskReadHistory: []domain.TimeSeriesDataPoint{
				{Timestamp: 1640995200000, Value: 1000000},
			},
			DiskWriteHistory: []domain.TimeSeriesDataPoint{
				{Timestamp: 1640995200000, Value: 500000},
			},
			Source: "Prometheus",
		},
		UptimeMetrics: &domain.UptimeMetrics{
			SystemUptimeSeconds:    1234567,
			SystemUptimeFormatted:  "14d 6h 56m",
			AverageUptimeSeconds:   1111111,
			AverageUptimeFormatted: "12d 20h 51m",
			NodeUptimes: []domain.NodeUptimeMetric{
				{
					NodeName:         "node-1",
					UptimeSeconds:    987654,
					UptimeFormatted:  "11d 10h 20m",
					BootTimestamp:    1640000000,
					BootTimeReadable: "2021-12-20 12:00:00 UTC",
				},
			},
			UptimeHistory: []domain.TimeSeriesDataPoint{
				{Timestamp: 1640995200000, Value: 1234567},
			},
		},
		SystemUptime:          1234567,
		SystemUptimeFormatted: "14d 6h 56m",
	}

	mockRepo := &mockMetricsRepository{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return fullMetrics, nil
		},
	}

	service := NewMetricsService(mockRepo)
	result, err := service.GetAllMetrics(context.Background(), "1h")

	assert.NoError(t, err)
	assert.NotNil(t, result)

	assert.NotNil(t, result.Overview)
	assert.NotNil(t, result.RequestsMetric)
	assert.NotNil(t, result.PodsMetric)
	assert.NotNil(t, result.NodesMetric)
	assert.NotNil(t, result.TenantsMetric)
	assert.NotNil(t, result.CPUUtilization)
	assert.NotNil(t, result.MemoryUtilization)
	assert.NotNil(t, result.Nodes)
	assert.NotNil(t, result.Namespaces)
	assert.NotNil(t, result.DatabaseIOMetrics)
	assert.NotNil(t, result.UptimeMetrics)

	assert.Len(t, result.RequestsMetric.Sparkline, 2)
	assert.Len(t, result.CPUUtilization.History, 2)
	assert.Len(t, result.Nodes, 1)
	assert.Len(t, result.Namespaces, 1)
	assert.Len(t, result.DatabaseIOMetrics.DiskReadHistory, 1)
	assert.Len(t, result.UptimeMetrics.NodeUptimes, 1)

	assert.Equal(t, 5, result.Overview.TotalNodes)
	assert.Equal(t, "HTTP Requests", result.RequestsMetric.Title)
	assert.Equal(t, 45.2, result.CPUUtilization.CurrentValue)
	assert.Equal(t, "node-1", result.Nodes[0].Name)
	assert.Equal(t, float64(1234567), result.SystemUptime)
}

func TestMetricsService_GetAllMetrics_WithValidRepository(t *testing.T) {
	called := false
	expectedDuration := "6h"

	mockRepo := &mockMetricsRepository{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			called = true
			assert.Equal(t, expectedDuration, duration)
			return &domain.AggregatedMetrics{
				Overview: &domain.ClusterOverview{TotalNodes: 10},
			}, nil
		},
	}

	service := NewMetricsService(mockRepo)
	result, err := service.GetAllMetrics(context.Background(), expectedDuration)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, called, "Repository method should have been called")
	assert.Equal(t, 10, result.Overview.TotalNodes)
}
