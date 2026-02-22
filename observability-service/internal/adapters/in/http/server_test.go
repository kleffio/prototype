package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"prometheus-metrics-api/internal/core/domain"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupTestRouter creates a router without auth middleware for testing
func SetupTestRouter(handler *MetricsHandler, logsHandler *LogsHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Add CORS configuration like in the real router
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"https://kleff.io", "https://api.kleff.io", "http://localhost:5173", "http://localhost:8080", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type", "Cache-Control", "Pragma", "Expires"},
		AllowCredentials: true,
	}))

	// Add API routes without JWT middleware for testing
	api := router.Group("/api/v1/systems")
	{
		api.GET("/metrics", handler.GetAllMetrics)
		api.GET("/overview", handler.GetOverview)

		api.GET("/requests-metric", handler.GetRequestsMetric)
		api.GET("/pods-metric", handler.GetPodsMetric)
		api.GET("/nodes-metric", handler.GetNodesMetric)
		api.GET("/tenants-metric", handler.GetTenantsMetric)

		api.GET("/cpu", handler.GetCPUUtilization)
		api.GET("/memory", handler.GetMemoryUtilization)

		api.GET("/nodes", handler.GetNodes)
		api.GET("/namespaces", handler.GetNamespaces)
		api.GET("/projects", handler.GetTopProjects)

		api.GET("/database-io", handler.GetDatabaseIOMetrics)

		api.POST("/project-metrics", handler.GetProjectUsageMetrics)

		api.POST("/logs/project-containers", logsHandler.GetProjectContainerLogs)
		api.GET("/projects/:projectID/usage/:days", handler.GetProjectUsageMetricsWithDays)
		api.GET("/projects/:projectID/usage", handler.GetProjectUsageMetrics)
		api.GET("/projects/:projectID/totalusage", handler.GetProjectTotalUsageMetrics)

		api.GET("/uptime", handler.GetUptimeMetrics)
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	return router
}

func TestSetupRouter(t *testing.T) {
	mockService := &mockMetricsService{
		getClusterOverviewFunc: func(ctx context.Context) (*domain.ClusterOverview, error) {
			return &domain.ClusterOverview{TotalNodes: 5}, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	logsHandler := &LogsHandler{}
	router := SetupTestRouter(handler, logsHandler)

	if router == nil {
		t.Fatal("Expected router to be created, got nil")
	}

	// Test that router is properly configured with Gin
	if gin.Mode() != gin.TestMode {
		gin.SetMode(gin.TestMode)
	}
}

func TestHealthEndpoint(t *testing.T) {
	mockService := &mockMetricsService{}
	handler := NewMetricsHandler(mockService)
	logsHandler := &LogsHandler{}
	router := SetupTestRouter(handler, logsHandler)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	expectedBody := `{"status":"healthy"}`
	if w.Body.String() != expectedBody {
		t.Errorf("Expected body '%s', got '%s'", expectedBody, w.Body.String())
	}
}

func TestRouteGroupSetup(t *testing.T) {
	mockService := &mockMetricsService{
		getClusterOverviewFunc: func(ctx context.Context) (*domain.ClusterOverview, error) {
			return &domain.ClusterOverview{
				TotalNodes:      5,
				RunningNodes:    4,
				TotalPods:       50,
				TotalNamespaces: 10,
			}, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	logsHandler := &LogsHandler{}
	router := SetupTestRouter(handler, logsHandler)

	// Test that the /api/v1/systems group is working
	req := httptest.NewRequest(http.MethodGet, "/api/v1/systems/overview", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d for /api/v1/systems/overview, got %d", http.StatusOK, w.Code)
	}
}

func TestCORSConfiguration(t *testing.T) {
	mockService := &mockMetricsService{}
	handler := NewMetricsHandler(mockService)
	logsHandler := &LogsHandler{}
	router := SetupTestRouter(handler, logsHandler)

	// Test OPTIONS request (preflight)
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/systems/overview", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	req.Header.Set("Access-Control-Request-Method", "GET")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// CORS should allow the request
	allowOrigin := w.Header().Get("Access-Control-Allow-Origin")
	if allowOrigin == "" {
		t.Error("Expected CORS headers to be set")
	}
}

func TestAllRoutes(t *testing.T) {
	mockService := &mockMetricsService{
		getRequestsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return &domain.MetricCard{Title: "Requests"}, nil
		},
		getPodsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return &domain.MetricCard{Title: "Pods"}, nil
		},
		getNodesMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return &domain.MetricCard{Title: "Nodes"}, nil
		},
		getTenantsMetricFunc: func(ctx context.Context, duration string) (*domain.MetricCard, error) {
			return &domain.MetricCard{Title: "Tenants"}, nil
		},
		getCPUUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return &domain.ResourceUtilization{CurrentValue: 75}, nil
		},
		getMemoryUtilizationFunc: func(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
			return &domain.ResourceUtilization{CurrentValue: 80}, nil
		},
		getNodesFunc: func(ctx context.Context) ([]domain.NodeMetric, error) {
			return []domain.NodeMetric{{Name: "node-1"}}, nil
		},
		getNamespacesFunc: func(ctx context.Context) ([]domain.NamespaceMetric, error) {
			return []domain.NamespaceMetric{{Name: "default"}}, nil
		},
		getTopProjectsFunc: func(ctx context.Context, sortBy string, limit int, duration string) (*domain.TopProjectsResponse, error) {
			return &domain.TopProjectsResponse{Projects: []domain.ProjectRanking{}}, nil
		},
		getDatabaseIOMetricsFunc: func(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error) {
			return &domain.DatabaseMetrics{Source: "prometheus"}, nil
		},
	}

	handler := NewMetricsHandler(mockService)
	logsHandler := &LogsHandler{}
	router := SetupTestRouter(handler, logsHandler)

	routes := []string{
		"/api/v1/systems/requests-metric",
		"/api/v1/systems/pods-metric",
		"/api/v1/systems/nodes-metric",
		"/api/v1/systems/tenants-metric",
		"/api/v1/systems/cpu",
		"/api/v1/systems/memory",
		"/api/v1/systems/nodes",
		"/api/v1/systems/namespaces",
		"/api/v1/systems/projects",
		"/api/v1/systems/database-io",
	}

	for _, route := range routes {
		req := httptest.NewRequest(http.MethodGet, route, nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Route %s returned status %d, expected %d", route, w.Code, http.StatusOK)
		}
	}
}
