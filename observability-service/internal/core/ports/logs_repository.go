package ports

import (
	"context"

	"prometheus-metrics-api/internal/core/domain"
)

type LogsRepository interface {
	GetProjectContainerLogs(ctx context.Context, options domain.LogFilterOptions) (*domain.ProjectLogs, error)
}
