package http

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"prometheus-metrics-api/internal/core/domain"

	"github.com/gin-gonic/gin"
)

type mockInsightsService struct {
	getAdminInsights func(ctx context.Context, window string) (*domain.InsightsResponse, error)
}

func (m *mockInsightsService) GetAdminInsights(ctx context.Context, window string) (*domain.InsightsResponse, error) {
	if m.getAdminInsights != nil {
		return m.getAdminInsights(ctx, window)
	}
	return nil, errors.New("not implemented")
}

func TestInsightsHandler_GetInsightsSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &mockInsightsService{
		getAdminInsights: func(ctx context.Context, window string) (*domain.InsightsResponse, error) {
			if window != "7d" {
				t.Fatalf("expected window 7d, got %s", window)
			}
			return &domain.InsightsResponse{
				Recommendations: []domain.InsightRecommendation{{Type: "right_sizing"}},
				GeneratedAt:     time.Now().UTC(),
			}, nil
		},
	}

	handler := NewInsightsHandler(service)
	router := gin.New()
	router.GET("/api/v1/admin/insights", handler.GetInsights)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/insights?window=7d", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", w.Code)
	}
}

func TestInsightsHandler_GetInsightsError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &mockInsightsService{
		getAdminInsights: func(ctx context.Context, window string) (*domain.InsightsResponse, error) {
			return nil, errors.New("boom")
		},
	}

	handler := NewInsightsHandler(service)
	router := gin.New()
	router.GET("/api/v1/admin/insights", handler.GetInsights)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/insights", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 got %d", w.Code)
	}
}
