package services

import (
	"context"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"
)

type logsService struct {
	logsRepo ports.LogsRepository
}

func NewLogsService(logsRepo ports.LogsRepository) ports.LogsService {
	return &logsService{
		logsRepo: logsRepo,
	}
}

func (s *logsService) GetProjectContainerLogs(ctx context.Context, options domain.LogFilterOptions) (*domain.ProjectLogs, error) {
	return s.logsRepo.GetProjectContainerLogs(ctx, options)
}
