package ports

import (
	"context"

	"prometheus-metrics-api/internal/core/domain"
)

type InsightsService interface {
	GetAdminInsights(ctx context.Context, window string) (*domain.InsightsResponse, error)
}

type AIInsightsClient interface {
	GenerateInsights(ctx context.Context, input *domain.InsightsResponse) (*domain.AIInsightsResponse, error)
}
