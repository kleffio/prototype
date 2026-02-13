package ports

import (
	"context"

	"prometheus-metrics-api/internal/core/domain"
)

type ExportService interface {
	ExportLogs(ctx context.Context, params domain.ExportParams) ([]byte, string, error)
	ExportMetrics(ctx context.Context, params domain.ExportParams) ([]byte, string, error)
}
