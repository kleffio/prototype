package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"prometheus-metrics-api/internal/core/domain"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// mockMetricsService is a mock implementation of ports.MetricsService
type mockMetricsService struct {
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
	getTopProjectsFunc                      func(ctx context.Context, sortBy string, limit int, duration string) (*domain.TopProjectsResponse, error)
	getUptimeMetricsFunc                    func(ctx context.Context, duration string) (*domain.UptimeMetrics, error)
	getSystemUptimeFunc                     func(ctx context.Context) (float64, error)
	getDatabaseIOMetricsFunc                func(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error)
	getProjectUsageMetricsFunc              func(ctx context.Context, projectID string) (*domain.ProjectUsageMetrics, error)
	getProjectUsageMetricsWithDaysFunc      func(ctx context.Context, projectID string, days int) (*domain.ProjectUsageMetrics, error)
	getProjectTotalUsageMetricsFunc         func(ctx context.Context, projectID string) (*domain.ProjectTotalUsageMetrics, error)
	getProjectTotalUsageMetricsWithDaysFunc func(ctx context.Context, projectID string, days int) (*domain.ProjectTotalUsageMetrics, error)
}

func (m *mockMetricsService) GetAllMetrics(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
	if m.getAllMetricsFunc != nil {
		return m.getAllMetricsFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetClusterOverview(ctx context.Context) (*domain.ClusterOverview, error) {
	if m.getClusterOverviewFunc != nil {
		return m.getClusterOverviewFunc(ctx)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetRequestsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	if m.getRequestsMetricFunc != nil {
		return m.getRequestsMetricFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetPodsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	if m.getPodsMetricFunc != nil {
		return m.getPodsMetricFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetNodesMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	if m.getNodesMetricFunc != nil {
		return m.getNodesMetricFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetTenantsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	if m.getTenantsMetricFunc != nil {
		return m.getTenantsMetricFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetCPUUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
	if m.getCPUUtilizationFunc != nil {
		return m.getCPUUtilizationFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetMemoryUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
	if m.getMemoryUtilizationFunc != nil {
		return m.getMemoryUtilizationFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetNodes(ctx context.Context) ([]domain.NodeMetric, error) {
	if m.getNodesFunc != nil {
		return m.getNodesFunc(ctx)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetNamespaces(ctx context.Context) ([]domain.NamespaceMetric, error) {
	if m.getNamespacesFunc != nil {
		return m.getNamespacesFunc(ctx)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetTopProjects(ctx context.Context, sortBy string, limit int, duration string) (*domain.TopProjectsResponse, error) {
	if m.getTopProjectsFunc != nil {
		return m.getTopProjectsFunc(ctx, sortBy, limit, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetDatabaseIOMetrics(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error) {
	if m.getDatabaseIOMetricsFunc != nil {
		return m.getDatabaseIOMetricsFunc(ctx, duration, namespaces)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetProjectUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectUsageMetrics, error) {
	if m.getProjectUsageMetricsFunc != nil {
		return m.getProjectUsageMetricsFunc(ctx, projectID)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetProjectUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectUsageMetrics, error) {
	if m.getProjectUsageMetricsWithDaysFunc != nil {
		return m.getProjectUsageMetricsWithDaysFunc(ctx, projectID, days)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetUptimeMetrics(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
	if m.getUptimeMetricsFunc != nil {
		return m.getUptimeMetricsFunc(ctx, duration)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetSystemUptime(ctx context.Context) (float64, error) {
	if m.getSystemUptimeFunc != nil {
		return m.getSystemUptimeFunc(ctx)
	}
	return 0, errors.New("not implemented")
}

func (m *mockMetricsService) GetProjectTotalUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectTotalUsageMetrics, error) {
	if m.getProjectTotalUsageMetricsFunc != nil {
		return m.getProjectTotalUsageMetricsFunc(ctx, projectID)
	}
	return nil, errors.New("not implemented")
}

func (m *mockMetricsService) GetProjectTotalUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectTotalUsageMetrics, error) {
	if m.getProjectTotalUsageMetricsWithDaysFunc != nil {
		return m.getProjectTotalUsageMetricsWithDaysFunc(ctx, projectID, days)
	}
	return nil, errors.New("not implemented")
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestGetOverview_Success(t *testing.T) {
	expectedOverview := &domain.ClusterOverview{
		TotalNodes:         5,
		RunningNodes:       4,
		TotalPods:          50,
		TotalNamespaces:    10,
		CPUUsagePercent:    65.5,
		MemoryUsagePercent: 72.3,
	}

	mockService := &mockMetricsService{
		getClusterOverviewFunc: func(ctx context.Context) (*domain.ClusterOverview, error) {
			return expectedOverview, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/overview", handler.GetOverview)

	req := httptest.NewRequest(http.MethodGet, "/overview", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response domain.ClusterOverview
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.TotalNodes != expectedOverview.TotalNodes {
		t.Errorf("Expected TotalNodes %d, got %d", expectedOverview.TotalNodes, response.TotalNodes)
	}
}

func TestGetOverview_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getClusterOverviewFunc: func(ctx context.Context) (*domain.ClusterOverview, error) {
			return nil, errors.New("service error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/overview", handler.GetOverview)

	req := httptest.NewRequest(http.MethodGet, "/overview", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetRequestsMetric_Success(t *testing.T) {
	expectedMetric := &domain.MetricCard{
		Title:         "Total Requests",
		Value:         "1.5M",
		RawValue:      1500000,
		ChangePercent: "+12.5%",
		Status:        "healthy",
	}

	mockService := &mockMetricsService{
		getRequestsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			if duration != "24h" {
				t.Errorf("Expected duration '24h', got '%s'", duration)
			}
			return expectedMetric, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/requests", handler.GetRequestsMetric)

	req := httptest.NewRequest(http.MethodGet, "/metrics/requests?duration=24h", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response domain.MetricCard
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Title != expectedMetric.Title {
		t.Errorf("Expected Title '%s', got '%s'", expectedMetric.Title, response.Title)
	}
}

func TestGetRequestsMetric_DefaultDuration(t *testing.T) {
	expectedMetric := &domain.MetricCard{
		Title: "Total Requests",
		Value: "1.5M",
	}

	mockService := &mockMetricsService{
		getRequestsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			if duration != "1h" {
				t.Errorf("Expected default duration '1h', got '%s'", duration)
			}
			return expectedMetric, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/requests", handler.GetRequestsMetric)

	req := httptest.NewRequest(http.MethodGet, "/metrics/requests", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}
}

func TestGetCPUUtilization_Success(t *testing.T) {
	expectedUtilization := &domain.ResourceUtilization{
		CurrentValue:  75.5,
		ChangePercent: 5.2,
		Trend:         "up",
	}

	mockService := &mockMetricsService{
		getCPUUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return expectedUtilization, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/cpu", handler.GetCPUUtilization)

	req := httptest.NewRequest(http.MethodGet, "/metrics/cpu?duration=12h", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response domain.ResourceUtilization
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.CurrentValue != expectedUtilization.CurrentValue {
		t.Errorf("Expected CurrentValue %.2f, got %.2f",
			expectedUtilization.CurrentValue, response.CurrentValue)
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

	mockService := &mockMetricsService{
		getNodesFunc: func(ctx context.Context) ([]domain.NodeMetric, error) {
			return expectedNodes, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/nodes", handler.GetNodes)

	req := httptest.NewRequest(http.MethodGet, "/nodes", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response []domain.NodeMetric
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if len(response) != len(expectedNodes) {
		t.Errorf("Expected %d nodes, got %d", len(expectedNodes), len(response))
	}

	if len(response) > 0 && response[0].Name != expectedNodes[0].Name {
		t.Errorf("Expected first node name '%s', got '%s'", expectedNodes[0].Name, response[0].Name)
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
	}

	mockService := &mockMetricsService{
		getNamespacesFunc: func(ctx context.Context) ([]domain.NamespaceMetric, error) {
			return expectedNamespaces, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/namespaces", handler.GetNamespaces)

	req := httptest.NewRequest(http.MethodGet, "/namespaces", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response []domain.NamespaceMetric
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if len(response) != len(expectedNamespaces) {
		t.Errorf("Expected %d namespaces, got %d", len(expectedNamespaces), len(response))
	}
}

func TestGetDatabaseIOMetrics_Success(t *testing.T) {
	expectedMetrics := &domain.DatabaseMetrics{
		DiskReadBytesPerSec:  1024000.0,
		DiskWriteBytesPerSec: 512000.0,
		Source:               "prometheus",
	}

	mockService := &mockMetricsService{
		getDatabaseIOMetricsFunc: func(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error) {
			return expectedMetrics, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/database", handler.GetDatabaseIOMetrics)

	req := httptest.NewRequest(http.MethodGet, "/metrics/database?duration=6h", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response domain.DatabaseMetrics
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.DiskReadBytesPerSec != expectedMetrics.DiskReadBytesPerSec {
		t.Errorf("Expected DiskReadBytesPerSec %.2f, got %.2f",
			expectedMetrics.DiskReadBytesPerSec, response.DiskReadBytesPerSec)
	}
}

func TestGetPodsMetric_Success(t *testing.T) {
	expectedMetric := &domain.MetricCard{
		Title:    "Total Pods",
		Value:    "150",
		RawValue: 150,
		Status:   "healthy",
	}

	mockService := &mockMetricsService{
		getPodsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return expectedMetric, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/pods", handler.GetPodsMetric)

	req := httptest.NewRequest(http.MethodGet, "/metrics/pods?duration=12h", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response domain.MetricCard
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Title != expectedMetric.Title {
		t.Errorf("Expected Title '%s', got '%s'", expectedMetric.Title, response.Title)
	}
}

func TestGetPodsMetric_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getPodsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return nil, errors.New("pods error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/pods", handler.GetPodsMetric)

	req := httptest.NewRequest(http.MethodGet, "/metrics/pods", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetNodesMetric_Success(t *testing.T) {
	expectedMetric := &domain.MetricCard{
		Title:    "Total Nodes",
		Value:    "5",
		RawValue: 5,
		Status:   "healthy",
	}

	mockService := &mockMetricsService{
		getNodesMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return expectedMetric, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/nodes", handler.GetNodesMetric)

	req := httptest.NewRequest(http.MethodGet, "/metrics/nodes?duration=6h", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}
}

func TestGetNodesMetric_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getNodesMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return nil, errors.New("nodes error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/nodes", handler.GetNodesMetric)

	req := httptest.NewRequest(http.MethodGet, "/metrics/nodes", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetTenantsMetric_Success(t *testing.T) {
	expectedMetric := &domain.MetricCard{
		Title:    "Total Tenants",
		Value:    "25",
		RawValue: 25,
		Status:   "healthy",
	}

	mockService := &mockMetricsService{
		getTenantsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return expectedMetric, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/tenants", handler.GetTenantsMetric)

	req := httptest.NewRequest(http.MethodGet, "/metrics/tenants?duration=24h", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}
}

func TestGetTenantsMetric_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getTenantsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return nil, errors.New("tenants error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/tenants", handler.GetTenantsMetric)

	req := httptest.NewRequest(http.MethodGet, "/metrics/tenants", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetRequestsMetric_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getRequestsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return nil, errors.New("requests error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/requests", handler.GetRequestsMetric)

	req := httptest.NewRequest(http.MethodGet, "/metrics/requests", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetCPUUtilization_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getCPUUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return nil, errors.New("cpu error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/cpu", handler.GetCPUUtilization)

	req := httptest.NewRequest(http.MethodGet, "/metrics/cpu", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetMemoryUtilization_Success(t *testing.T) {
	expectedUtilization := &domain.ResourceUtilization{
		CurrentValue:  82.3,
		ChangePercent: 3.5,
		Trend:         "stable",
	}

	mockService := &mockMetricsService{
		getMemoryUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return expectedUtilization, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/memory", handler.GetMemoryUtilization)

	req := httptest.NewRequest(http.MethodGet, "/metrics/memory?duration=12h", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}
}

func TestGetMemoryUtilization_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getMemoryUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return nil, errors.New("memory error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/memory", handler.GetMemoryUtilization)

	req := httptest.NewRequest(http.MethodGet, "/metrics/memory", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetNodes_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getNodesFunc: func(ctx context.Context) ([]domain.NodeMetric, error) {
			return nil, errors.New("nodes error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/nodes", handler.GetNodes)

	req := httptest.NewRequest(http.MethodGet, "/nodes", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetNamespaces_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getNamespacesFunc: func(ctx context.Context) ([]domain.NamespaceMetric, error) {
			return nil, errors.New("namespaces error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/namespaces", handler.GetNamespaces)

	req := httptest.NewRequest(http.MethodGet, "/namespaces", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetTopProjects_Success(t *testing.T) {
	mockService := &mockMetricsService{
		getTopProjectsFunc: func(ctx context.Context, sortBy string, limit int, duration string) (*domain.TopProjectsResponse, error) {
			assert.Equal(t, "memory", sortBy)
			assert.Equal(t, 5, limit)
			assert.Equal(t, "6h", duration)
			return &domain.TopProjectsResponse{
				Projects: []domain.ProjectRanking{
					{ProjectID: "project-1", ProjectName: "Project One"},
				},
			}, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/projects", handler.GetTopProjects)

	req := httptest.NewRequest(http.MethodGet, "/projects?sort=memory&limit=5&duration=6h", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetTopProjects_InvalidLimit(t *testing.T) {
	handler := NewMetricsHandler(&mockMetricsService{})
	router := setupTestRouter()
	router.GET("/projects", handler.GetTopProjects)

	req := httptest.NewRequest(http.MethodGet, "/projects?limit=200", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetDatabaseIOMetrics_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getDatabaseIOMetricsFunc: func(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error) {
			return nil, errors.New("database error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/metrics/database", handler.GetDatabaseIOMetrics)

	req := httptest.NewRequest(http.MethodGet, "/metrics/database", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetProjectUsageMetrics_Success(t *testing.T) {
	expectedMetrics := &domain.ProjectUsageMetrics{
		ProjectID:       "project-123",
		MemoryUsageGB:   8.5,
		CPURequestCores: 2.0,
		Window:          "30d",
	}

	mockService := &mockMetricsService{
		getProjectUsageMetricsFunc: func(ctx context.Context, projectID string) (*domain.ProjectUsageMetrics, error) {
			if projectID != "project-123" {
				t.Errorf("Expected projectID 'project-123', got '%s'", projectID)
			}
			return expectedMetrics, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/projects/:projectID/usage", handler.GetProjectUsageMetrics)

	req := httptest.NewRequest(http.MethodGet, "/projects/project-123/usage", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response domain.ProjectUsageMetrics
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.ProjectID != expectedMetrics.ProjectID {
		t.Errorf("Expected ProjectID '%s', got '%s'", expectedMetrics.ProjectID, response.ProjectID)
	}

	if response.MemoryUsageGB != expectedMetrics.MemoryUsageGB {
		t.Errorf("Expected MemoryUsageGB %.2f, got %.2f", expectedMetrics.MemoryUsageGB, response.MemoryUsageGB)
	}

	if response.CPURequestCores != expectedMetrics.CPURequestCores {
		t.Errorf("Expected CPURequestCores %.2f, got %.2f", expectedMetrics.CPURequestCores, response.CPURequestCores)
	}
}

func TestGetProjectUsageMetrics_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getProjectUsageMetricsFunc: func(ctx context.Context, projectID string) (*domain.ProjectUsageMetrics, error) {
			return nil, errors.New("project usage error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/projects/:projectID/usage", handler.GetProjectUsageMetrics)

	req := httptest.NewRequest(http.MethodGet, "/projects/project-123/usage", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetProjectUsageMetrics_MissingProjectID(t *testing.T) {
	mockService := &mockMetricsService{}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/projects/:projectID/usage", handler.GetProjectUsageMetrics)

	req := httptest.NewRequest(http.MethodGet, "/projects//usage", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestGetProjectUsageMetricsWithDays_Success(t *testing.T) {
	expectedMetrics := &domain.ProjectUsageMetrics{
		ProjectID:       "project-123",
		MemoryUsageGB:   4.2,
		CPURequestCores: 1.5,
		Window:          "7d",
	}

	mockService := &mockMetricsService{
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

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/projects/:projectID/usage/:days", handler.GetProjectUsageMetricsWithDays)

	req := httptest.NewRequest(http.MethodGet, "/projects/project-123/usage/7", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response domain.ProjectUsageMetrics
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.ProjectID != expectedMetrics.ProjectID {
		t.Errorf("Expected ProjectID '%s', got '%s'", expectedMetrics.ProjectID, response.ProjectID)
	}

	if response.Window != expectedMetrics.Window {
		t.Errorf("Expected Window '%s', got '%s'", expectedMetrics.Window, response.Window)
	}
}

func TestGetProjectUsageMetricsWithDays_Error(t *testing.T) {
	mockService := &mockMetricsService{
		getProjectUsageMetricsWithDaysFunc: func(ctx context.Context, projectID string, days int) (*domain.ProjectUsageMetrics, error) {
			return nil, errors.New("project usage error")
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/projects/:projectID/usage/:days", handler.GetProjectUsageMetricsWithDays)

	req := httptest.NewRequest(http.MethodGet, "/projects/project-123/usage/7", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestGetProjectUsageMetricsWithDays_InvalidDays(t *testing.T) {
	mockService := &mockMetricsService{}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/projects/:projectID/usage/:days", handler.GetProjectUsageMetricsWithDays)

	req := httptest.NewRequest(http.MethodGet, "/projects/project-123/usage/invalid", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestGetProjectUsageMetricsWithDays_ZeroDays(t *testing.T) {
	mockService := &mockMetricsService{}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/projects/:projectID/usage/:days", handler.GetProjectUsageMetricsWithDays)

	req := httptest.NewRequest(http.MethodGet, "/projects/project-123/usage/0", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestGetAllMetrics_Success(t *testing.T) {
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
			Title:         "HTTP Requests",
			Value:         "1250 req/s",
			RawValue:      1250.5,
			ChangePercent: "+15.2%",
			ChangeLabel:   "vs 1h ago",
			Status:        "good",
			Sparkline:     []domain.TimeSeriesDataPoint{{Timestamp: 1640995200000, Value: 1200}, {Timestamp: 1640995260000, Value: 1250}},
		},
		PodsMetric: &domain.MetricCard{
			Title:         "Total Pods",
			Value:         "120",
			RawValue:      120,
			ChangePercent: "+5.0%",
			ChangeLabel:   "vs 1h ago",
			Status:        "good",
			Sparkline:     []domain.TimeSeriesDataPoint{},
		},
		NodesMetric: &domain.MetricCard{
			Title:         "Cluster Nodes",
			Value:         "5",
			RawValue:      5,
			ChangePercent: "0.0%",
			ChangeLabel:   "vs 1h ago",
			Status:        "good",
			Sparkline:     []domain.TimeSeriesDataPoint{},
		},
		TenantsMetric: &domain.MetricCard{
			Title:         "Active Tenants",
			Value:         "12",
			RawValue:      12,
			ChangePercent: "+8.3%",
			ChangeLabel:   "vs 1h ago",
			Status:        "excellent",
			Sparkline:     []domain.TimeSeriesDataPoint{},
		},
		CPUUtilization: &domain.ResourceUtilization{
			CurrentValue:  45.2,
			ChangePercent: 2.3,
			Trend:         "up",
			History:       []domain.TimeSeriesDataPoint{{Timestamp: 1640995200000, Value: 43}, {Timestamp: 1640995260000, Value: 45.2}},
		},
		MemoryUtilization: &domain.ResourceUtilization{
			CurrentValue:  62.8,
			ChangePercent: -1.5,
			Trend:         "down",
			History:       []domain.TimeSeriesDataPoint{{Timestamp: 1640995200000, Value: 64}, {Timestamp: 1640995260000, Value: 62.8}},
		},
		Nodes: []domain.NodeMetric{
			{
				Name:               "node-1",
				CPUUsagePercent:    42.5,
				MemoryUsagePercent: 58.3,
				PodCount:           45,
				Status:             "Ready",
			},
			{
				Name:               "node-2",
				CPUUsagePercent:    48.1,
				MemoryUsagePercent: 67.2,
				PodCount:           55,
				Status:             "Ready",
			},
		},
		Namespaces: []domain.NamespaceMetric{
			{
				Name:        "default",
				PodCount:    25,
				CPUUsage:    12.5,
				MemoryUsage: 8.2,
			},
			{
				Name:        "kube-system",
				PodCount:    30,
				CPUUsage:    18.3,
				MemoryUsage: 15.6,
			},
		},
		DatabaseIOMetrics: &domain.DatabaseMetrics{
			DiskReadBytesPerSec:  1024000,
			DiskWriteBytesPerSec: 512000,
			DiskReadOpsPerSec:    150,
			DiskWriteOpsPerSec:   75,
			Source:               "Prometheus",
		},
		SystemUptime:          1234567,
		SystemUptimeFormatted: "14d 6h 56m",
	}

	mockService := &mockMetricsService{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			assert.Equal(t, "1h", duration)
			return expectedMetrics, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/api/v1/systems/metrics", handler.GetAllMetrics)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/systems/metrics?duration=1h", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response domain.AggregatedMetrics
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	// Verify overview
	assert.NotNil(t, response.Overview)
	assert.Equal(t, 5, response.Overview.TotalNodes)
	assert.Equal(t, 120, response.Overview.TotalPods)
	assert.Equal(t, 45.2, response.Overview.CPUUsagePercent)

	// Verify metric cards
	assert.NotNil(t, response.RequestsMetric)
	assert.Equal(t, "HTTP Requests", response.RequestsMetric.Title)
	assert.Equal(t, 1250.5, response.RequestsMetric.RawValue)

	// Verify nodes
	assert.Len(t, response.Nodes, 2)
	assert.Equal(t, "node-1", response.Nodes[0].Name)

	// Verify namespaces
	assert.Len(t, response.Namespaces, 2)
	assert.Equal(t, "default", response.Namespaces[0].Name)

	// Verify uptime
	assert.Equal(t, float64(1234567), response.SystemUptime)
	assert.Equal(t, "14d 6h 56m", response.SystemUptimeFormatted)
}

func TestGetAllMetrics_WithDifferentDurations(t *testing.T) {
	testCases := []struct {
		name            string
		queryParam      string
		expectedService string
	}{
		{
			name:            "Default duration (1h)",
			queryParam:      "",
			expectedService: "1h",
		},
		{
			name:            "6 hours",
			queryParam:      "duration=6h",
			expectedService: "6h",
		},
		{
			name:            "24 hours",
			queryParam:      "duration=24h",
			expectedService: "24h",
		},
		{
			name:            "7 days",
			queryParam:      "duration=7d",
			expectedService: "7d",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockService := &mockMetricsService{
				getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
					assert.Equal(t, tc.expectedService, duration)
					return &domain.AggregatedMetrics{
						Overview: &domain.ClusterOverview{TotalNodes: 5},
					}, nil
				},
			}

			handler := NewMetricsHandler(mockService)
			router := setupTestRouter()
			router.GET("/api/v1/systems/metrics", handler.GetAllMetrics)

			url := "/api/v1/systems/metrics"
			if tc.queryParam != "" {
				url += "?" + tc.queryParam
			}

			req := httptest.NewRequest(http.MethodGet, url, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
		})
	}
}

func TestGetAllMetrics_ServiceError(t *testing.T) {
	expectedError := errors.New("prometheus connection failed")

	mockService := &mockMetricsService{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return nil, expectedError
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/api/v1/systems/metrics", handler.GetAllMetrics)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/systems/metrics", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedError.Error(), response["error"])
}

func TestGetAllMetrics_PartialData(t *testing.T) {
	partialMetrics := &domain.AggregatedMetrics{
		Overview: &domain.ClusterOverview{
			TotalNodes: 5,
		},
		RequestsMetric: &domain.MetricCard{
			Title: "HTTP Requests",
			Value: "1250 req/s",
		},
		CPUUtilization:    nil,
		MemoryUtilization: nil,
		DatabaseIOMetrics: nil,
	}

	mockService := &mockMetricsService{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return partialMetrics, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/api/v1/systems/metrics", handler.GetAllMetrics)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/systems/metrics", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response domain.AggregatedMetrics
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.NotNil(t, response.Overview)
	assert.Equal(t, 5, response.Overview.TotalNodes)
	assert.NotNil(t, response.RequestsMetric)

	assert.Nil(t, response.CPUUtilization)
	assert.Nil(t, response.MemoryUtilization)
	assert.Nil(t, response.DatabaseIOMetrics)
}

func TestGetAllMetrics_EmptyCollections(t *testing.T) {
	metricsWithEmpty := &domain.AggregatedMetrics{
		Overview: &domain.ClusterOverview{
			TotalNodes: 0,
		},
		Nodes:      []domain.NodeMetric{},
		Namespaces: []domain.NamespaceMetric{},
	}

	mockService := &mockMetricsService{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return metricsWithEmpty, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/api/v1/systems/metrics", handler.GetAllMetrics)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/systems/metrics", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response domain.AggregatedMetrics
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.NotNil(t, response.Nodes)
	assert.Len(t, response.Nodes, 0)
	assert.NotNil(t, response.Namespaces)
	assert.Len(t, response.Namespaces, 0)
}

func TestGetAllMetrics_ContextCancellation(t *testing.T) {
	mockService := &mockMetricsService{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			default:
				return &domain.AggregatedMetrics{}, nil
			}
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/api/v1/systems/metrics", handler.GetAllMetrics)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/systems/metrics", nil)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestGetAllMetrics_LargeDataSet(t *testing.T) {
	largeNodes := make([]domain.NodeMetric, 100)
	for i := 0; i < 100; i++ {
		largeNodes[i] = domain.NodeMetric{
			Name:               "node-" + string(rune(i)),
			CPUUsagePercent:    float64(i % 100),
			MemoryUsagePercent: float64((i * 2) % 100),
			PodCount:           i % 50,
			Status:             "Ready",
		}
	}

	largeNamespaces := make([]domain.NamespaceMetric, 50)
	for i := 0; i < 50; i++ {
		largeNamespaces[i] = domain.NamespaceMetric{
			Name:        "namespace-" + string(rune(i)),
			PodCount:    i * 2,
			CPUUsage:    float64(i),
			MemoryUsage: float64(i) * 1.5,
		}
	}

	largeMetrics := &domain.AggregatedMetrics{
		Overview: &domain.ClusterOverview{
			TotalNodes:      100,
			TotalNamespaces: 50,
		},
		Nodes:      largeNodes,
		Namespaces: largeNamespaces,
	}

	mockService := &mockMetricsService{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return largeMetrics, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/api/v1/systems/metrics", handler.GetAllMetrics)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/systems/metrics", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response domain.AggregatedMetrics
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.Len(t, response.Nodes, 100)
	assert.Len(t, response.Namespaces, 50)
}

func TestGetAllMetrics_SparklineData(t *testing.T) {
	sparklineData := []domain.TimeSeriesDataPoint{
		{Timestamp: 1640995200000, Value: 1000},
		{Timestamp: 1640995260000, Value: 1100},
		{Timestamp: 1640995320000, Value: 1200},
		{Timestamp: 1640995380000, Value: 1250},
	}

	metricsWithSparklines := &domain.AggregatedMetrics{
		RequestsMetric: &domain.MetricCard{
			Title:     "HTTP Requests",
			Sparkline: sparklineData,
		},
		CPUUtilization: &domain.ResourceUtilization{
			CurrentValue: 45.2,
			History:      sparklineData,
		},
	}

	mockService := &mockMetricsService{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return metricsWithSparklines, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/api/v1/systems/metrics", handler.GetAllMetrics)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/systems/metrics", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response domain.AggregatedMetrics
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.NotNil(t, response.RequestsMetric)
	assert.Len(t, response.RequestsMetric.Sparkline, 4)
	assert.Equal(t, int64(1640995200000), response.RequestsMetric.Sparkline[0].Timestamp)
	assert.Equal(t, float64(1000), response.RequestsMetric.Sparkline[0].Value)

	assert.NotNil(t, response.CPUUtilization)
	assert.Len(t, response.CPUUtilization.History, 4)
}

func TestGetAllMetrics_ResponseTimeAcceptable(t *testing.T) {
	mockService := &mockMetricsService{
		getAllMetricsFunc: func(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
			return &domain.AggregatedMetrics{
				Overview: &domain.ClusterOverview{TotalNodes: 5},
			}, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	router := setupTestRouter()
	router.GET("/api/v1/systems/metrics", handler.GetAllMetrics)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/systems/metrics", nil)
	w := httptest.NewRecorder()

	start := time.Now()
	router.ServeHTTP(w, req)
	elapsed := time.Since(start)

	assert.Equal(t, http.StatusOK, w.Code)

	assert.Less(t, elapsed, 100*time.Millisecond, "Response time should be under 100ms")
}
