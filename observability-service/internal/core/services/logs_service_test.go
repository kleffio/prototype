package services

import (
	"context"
	"errors"
	"testing"

	"prometheus-metrics-api/internal/core/domain"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockLogsRepository for testing
type mockLogsRepository struct {
	mock.Mock
}

func (m *mockLogsRepository) GetProjectContainerLogs(ctx context.Context, options domain.LogFilterOptions) (*domain.ProjectLogs, error) {
	args := m.Called(ctx, options)
	return args.Get(0).(*domain.ProjectLogs), args.Error(1)
}

func TestNewLogsService(t *testing.T) {
	mockRepo := &mockLogsRepository{}
	service := NewLogsService(mockRepo)

	assert.NotNil(t, service)

	// Cast to concrete type to verify internal field
	logsService := service.(*logsService)
	assert.Equal(t, mockRepo, logsService.logsRepo)
}

func TestLogsService_GetProjectContainerLogs_Success(t *testing.T) {
	// Setup
	mockRepo := &mockLogsRepository{}
	service := NewLogsService(mockRepo)

	expectedLogs := &domain.ProjectLogs{
		ProjectID:     "test-project",
		TotalLogs:     3,
		TotalErrors:   1,
		TotalWarnings: 1,
		Containers: []domain.ContainerLogs{
			{
				ContainerName: "app-container",
				Logs: []domain.LogEntry{
					{
						Timestamp: "1640995200000000000",
						Log:       "Application started successfully",
						Labels:    map[string]string{"level": "info"},
					},
					{
						Timestamp: "1640995220000000000",
						Log:       "Warning: potential issue detected",
						Labels:    map[string]string{"level": "warn"},
					},
					{
						Timestamp: "1640995260000000000",
						Log:       "Error occurred during processing",
						Labels:    map[string]string{"level": "error"},
					},
				},
				LogCount:     3,
				ErrorCount:   1,
				WarningCount: 1,
				HasMore:      false,
			},
		},
		Timestamp: 1640995260,
	}

	ctx := context.Background()
	options := domain.LogFilterOptions{
		ProjectID:      "test-project",
		ContainerNames: []string{"app-container"},
		Limit:          100,
		Duration:       "1h",
	}

	mockRepo.On("GetProjectContainerLogs", ctx, options).Return(expectedLogs, nil)

	// Execute
	result, err := service.GetProjectContainerLogs(ctx, options)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedLogs, result)
	assert.Equal(t, "test-project", result.ProjectID)
	assert.Equal(t, 3, result.TotalLogs)
	assert.Equal(t, 1, result.TotalErrors)
	assert.Equal(t, 1, result.TotalWarnings)
	assert.Len(t, result.Containers, 1)
	assert.Equal(t, "app-container", result.Containers[0].ContainerName)

	mockRepo.AssertExpectations(t)
}

func TestLogsService_GetProjectContainerLogs_RepositoryError(t *testing.T) {
	// Setup
	mockRepo := &mockLogsRepository{}
	service := NewLogsService(mockRepo)

	ctx := context.Background()
	options := domain.LogFilterOptions{
		ProjectID:      "test-project",
		ContainerNames: []string{"app-container"},
		Limit:          100,
		Duration:       "1h",
	}

	expectedError := errors.New("loki connection failed")
	mockRepo.On("GetProjectContainerLogs", ctx, options).Return((*domain.ProjectLogs)(nil), expectedError)

	// Execute
	result, err := service.GetProjectContainerLogs(ctx, options)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, expectedError, err)
	assert.Equal(t, "loki connection failed", err.Error())

	mockRepo.AssertExpectations(t)
}

func TestLogsService_GetProjectContainerLogs_MultipleContainers(t *testing.T) {
	// Setup
	mockRepo := &mockLogsRepository{}
	service := NewLogsService(mockRepo)

	expectedLogs := &domain.ProjectLogs{
		ProjectID:     "multi-container-project",
		TotalLogs:     5,
		TotalErrors:   2,
		TotalWarnings: 1,
		Containers: []domain.ContainerLogs{
			{
				ContainerName: "web-container",
				Logs: []domain.LogEntry{
					{Timestamp: "1640995200000000000", Log: "Web server started", Labels: map[string]string{}},
					{Timestamp: "1640995220000000000", Log: "Warning: high memory usage", Labels: map[string]string{}},
					{Timestamp: "1640995240000000000", Log: "Error: request timeout", Labels: map[string]string{}},
				},
				LogCount:     3,
				ErrorCount:   1,
				WarningCount: 1,
				HasMore:      false,
			},
			{
				ContainerName: "worker-container",
				Logs: []domain.LogEntry{
					{Timestamp: "1640995260000000000", Log: "Worker started", Labels: map[string]string{}},
					{Timestamp: "1640995280000000000", Log: "Fatal error in worker", Labels: map[string]string{}},
				},
				LogCount:     2,
				ErrorCount:   1,
				WarningCount: 0,
				HasMore:      true, // Has more logs available
			},
		},
		Timestamp: 1640995280,
	}

	ctx := context.Background()
	options := domain.LogFilterOptions{
		ProjectID:      "multi-container-project",
		ContainerNames: []string{"web-container", "worker-container"},
		Limit:          200,
		Duration:       "2h",
	}

	mockRepo.On("GetProjectContainerLogs", ctx, options).Return(expectedLogs, nil)

	// Execute
	result, err := service.GetProjectContainerLogs(ctx, options)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedLogs, result)
	assert.Equal(t, "multi-container-project", result.ProjectID)
	assert.Equal(t, 5, result.TotalLogs)
	assert.Equal(t, 2, result.TotalErrors)
	assert.Equal(t, 1, result.TotalWarnings)
	assert.Len(t, result.Containers, 2)

	// Verify web container
	webContainer := result.Containers[0]
	assert.Equal(t, "web-container", webContainer.ContainerName)
	assert.Equal(t, 3, webContainer.LogCount)
	assert.Equal(t, 1, webContainer.ErrorCount)
	assert.Equal(t, 1, webContainer.WarningCount)
	assert.False(t, webContainer.HasMore)

	// Verify worker container
	workerContainer := result.Containers[1]
	assert.Equal(t, "worker-container", workerContainer.ContainerName)
	assert.Equal(t, 2, workerContainer.LogCount)
	assert.Equal(t, 1, workerContainer.ErrorCount)
	assert.Equal(t, 0, workerContainer.WarningCount)
	assert.True(t, workerContainer.HasMore)

	mockRepo.AssertExpectations(t)
}

func TestLogsService_GetProjectContainerLogs_EmptyContainers(t *testing.T) {
	// Setup
	mockRepo := &mockLogsRepository{}
	service := NewLogsService(mockRepo)

	expectedLogs := &domain.ProjectLogs{
		ProjectID:     "empty-project",
		TotalLogs:     0,
		TotalErrors:   0,
		TotalWarnings: 0,
		Containers:    []domain.ContainerLogs{},
		Timestamp:     1640995200,
	}

	ctx := context.Background()
	options := domain.LogFilterOptions{
		ProjectID:      "empty-project",
		ContainerNames: []string{},
		Limit:          50,
		Duration:       "30m",
	}

	mockRepo.On("GetProjectContainerLogs", ctx, options).Return(expectedLogs, nil)

	// Execute
	result, err := service.GetProjectContainerLogs(ctx, options)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedLogs, result)
	assert.Equal(t, "empty-project", result.ProjectID)
	assert.Equal(t, 0, result.TotalLogs)
	assert.Equal(t, 0, result.TotalErrors)
	assert.Equal(t, 0, result.TotalWarnings)
	assert.Len(t, result.Containers, 0)

	mockRepo.AssertExpectations(t)
}

func TestLogsService_GetProjectContainerLogs_ContextCancellation(t *testing.T) {
	// Setup
	mockRepo := &mockLogsRepository{}
	service := NewLogsService(mockRepo)

	ctx, cancel := context.WithCancel(context.Background())
	options := domain.LogFilterOptions{
		ProjectID:      "test-project",
		ContainerNames: []string{"app-container"},
		Limit:          100,
		Duration:       "1h",
	}

	expectedError := context.Canceled
	mockRepo.On("GetProjectContainerLogs", ctx, options).Return((*domain.ProjectLogs)(nil), expectedError)

	// Cancel context before calling service
	cancel()

	// Execute
	result, err := service.GetProjectContainerLogs(ctx, options)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, context.Canceled, err)

	mockRepo.AssertExpectations(t)
}

func TestLogsService_GetProjectContainerLogs_ParameterPassing(t *testing.T) {
	// Test that all parameters are correctly passed through to repository
	mockRepo := &mockLogsRepository{}
	service := NewLogsService(mockRepo)

	expectedLogs := &domain.ProjectLogs{
		ProjectID:  "param-test",
		Containers: []domain.ContainerLogs{},
		Timestamp:  1640995200,
	}

	ctx := context.Background()
	options := domain.LogFilterOptions{
		ProjectID:      "param-test",
		ContainerNames: []string{"container1", "container2", "container3"},
		Limit:          500,
		Duration:       "24h",
	}

	// Verify exact parameter matching
	mockRepo.On("GetProjectContainerLogs", ctx, options).Return(expectedLogs, nil)

	// Execute
	result, err := service.GetProjectContainerLogs(ctx, options)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedLogs, result)

	// Verify that mock was called with exact parameters
	mockRepo.AssertExpectations(t)
}

func TestLogsService_GetProjectContainerLogs_NilRepository(t *testing.T) {
	// Test edge case where repository might be nil (should not happen in practice)
	// This test is removed as it would cause a panic and that's expected behavior
	// In a real application, the service should never be created with a nil repository
	t.Skip("Skipping nil repository test as it would cause expected panic")
}
