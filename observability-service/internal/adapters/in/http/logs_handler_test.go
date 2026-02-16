package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"prometheus-metrics-api/internal/core/domain"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockLogsService for testing
type mockLogsService struct {
	mock.Mock
}

func (m *mockLogsService) GetProjectContainerLogs(ctx context.Context, options domain.LogFilterOptions) (*domain.ProjectLogs, error) {
	args := m.Called(ctx, options)
	return args.Get(0).(*domain.ProjectLogs), args.Error(1)
}

func TestNewLogsHandler(t *testing.T) {
	mockService := &mockLogsService{}
	handler := NewLogsHandler(mockService)

	assert.NotNil(t, handler)
	assert.Equal(t, mockService, handler.logsService)
}

func TestGetProjectContainerLogs_Success(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	mockService := &mockLogsService{}

	expectedLogs := &domain.ProjectLogs{
		ProjectID:     "test-project",
		TotalLogs:     2,
		TotalErrors:   1,
		TotalWarnings: 0,
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
						Timestamp: "1640995260000000000",
						Log:       "Error occurred during processing",
						Labels:    map[string]string{"level": "error"},
					},
				},
				LogCount:     2,
				ErrorCount:   1,
				WarningCount: 0,
				HasMore:      false,
			},
		},
		Timestamp: 1640995260,
	}

	mockService.On("GetProjectContainerLogs",
		mock.Anything,
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"app-container"},
			Limit:          100,
			Duration:       "1h",
		}).Return(expectedLogs, nil)

	handler := NewLogsHandler(mockService)

	// Create request
	requestBody := ProjectLogsRequest{
		ProjectID:      "test-project",
		ContainerNames: []string{"app-container"},
		Limit:          100,
		Duration:       "1h",
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/systems/logs/project-containers", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute
	handler.GetProjectContainerLogs(c)

	// Verify
	assert.Equal(t, http.StatusOK, w.Code)

	var response domain.ProjectLogs
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedLogs.ProjectID, response.ProjectID)
	assert.Equal(t, expectedLogs.TotalLogs, response.TotalLogs)
	assert.Equal(t, expectedLogs.TotalErrors, response.TotalErrors)
	assert.Len(t, response.Containers, 1)
	assert.Equal(t, "app-container", response.Containers[0].ContainerName)

	mockService.AssertExpectations(t)
}

func TestGetProjectContainerLogs_DefaultValues(t *testing.T) {
	// Test that default values are applied when not provided
	gin.SetMode(gin.TestMode)
	mockService := &mockLogsService{}

	expectedLogs := &domain.ProjectLogs{
		ProjectID:  "test-project",
		Containers: []domain.ContainerLogs{},
		Timestamp:  1640995260,
	}

	// Expect the service to be called with default values
	mockService.On("GetProjectContainerLogs",
		mock.Anything,
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"app-container"},
			Limit:          100,  // default limit
			Duration:       "1h", // default duration
		}).Return(expectedLogs, nil)

	handler := NewLogsHandler(mockService)

	// Create request without limit and duration
	requestBody := ProjectLogsRequest{
		ProjectID:      "test-project",
		ContainerNames: []string{"app-container"},
		// Limit and Duration omitted to test defaults
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/systems/logs/project-containers", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute
	handler.GetProjectContainerLogs(c)

	// Verify
	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestGetProjectContainerLogs_ZeroLimitDefaultsTo100(t *testing.T) {
	// Test that limit of 0 is converted to 100
	gin.SetMode(gin.TestMode)
	mockService := &mockLogsService{}

	expectedLogs := &domain.ProjectLogs{
		ProjectID:  "test-project",
		Containers: []domain.ContainerLogs{},
		Timestamp:  1640995260,
	}

	// Expect the service to be called with default limit of 100
	mockService.On("GetProjectContainerLogs",
		mock.Anything,
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"app-container"},
			Limit:          100, // should be converted from 0 to 100
			Duration:       "2h",
		}).Return(expectedLogs, nil)

	handler := NewLogsHandler(mockService)

	requestBody := ProjectLogsRequest{
		ProjectID:      "test-project",
		ContainerNames: []string{"app-container"},
		Limit:          0, // Should be converted to 100
		Duration:       "2h",
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/systems/logs/project-containers", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	handler.GetProjectContainerLogs(c)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestGetProjectContainerLogs_InvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockService := &mockLogsService{}
	handler := NewLogsHandler(mockService)

	// Create invalid JSON request
	req := httptest.NewRequest(http.MethodPost, "/api/v1/systems/logs/project-containers", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute
	handler.GetProjectContainerLogs(c)

	// Verify
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response["error"], "Invalid request:")
}

func TestGetProjectContainerLogs_MissingRequiredFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockService := &mockLogsService{}
	handler := NewLogsHandler(mockService)

	// Test missing ProjectID
	requestBody := ProjectLogsRequest{
		ContainerNames: []string{"app-container"},
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/systems/logs/project-containers", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	handler.GetProjectContainerLogs(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response["error"], "Invalid request:")
}

func TestGetProjectContainerLogs_ServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockService := &mockLogsService{}

	// Mock service to return error
	mockService.On("GetProjectContainerLogs",
		mock.Anything,
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"app-container"},
			Limit:          100,
			Duration:       "1h",
		}).Return((*domain.ProjectLogs)(nil), errors.New("loki connection failed"))

	handler := NewLogsHandler(mockService)

	requestBody := ProjectLogsRequest{
		ProjectID:      "test-project",
		ContainerNames: []string{"app-container"},
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/systems/logs/project-containers", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute
	handler.GetProjectContainerLogs(c)

	// Verify
	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "loki connection failed", response["error"])

	mockService.AssertExpectations(t)
}

func TestGetProjectContainerLogs_MultipleContainers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockService := &mockLogsService{}

	expectedLogs := &domain.ProjectLogs{
		ProjectID:     "test-project",
		TotalLogs:     3,
		TotalErrors:   1,
		TotalWarnings: 1,
		Containers: []domain.ContainerLogs{
			{
				ContainerName: "app-container",
				Logs: []domain.LogEntry{
					{Timestamp: "1640995200000000000", Log: "App started", Labels: map[string]string{}},
				},
				LogCount:     1,
				ErrorCount:   0,
				WarningCount: 0,
				HasMore:      false,
			},
			{
				ContainerName: "worker-container",
				Logs: []domain.LogEntry{
					{Timestamp: "1640995260000000000", Log: "Worker warning", Labels: map[string]string{}},
					{Timestamp: "1640995280000000000", Log: "Worker error", Labels: map[string]string{}},
				},
				LogCount:     2,
				ErrorCount:   1,
				WarningCount: 1,
				HasMore:      false,
			},
		},
		Timestamp: 1640995280,
	}

	mockService.On("GetProjectContainerLogs",
		mock.Anything,
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"app-container", "worker-container"},
			Limit:          200,
			Duration:       "2h",
		}).Return(expectedLogs, nil)

	handler := NewLogsHandler(mockService)

	requestBody := ProjectLogsRequest{
		ProjectID:      "test-project",
		ContainerNames: []string{"app-container", "worker-container"},
		Limit:          200,
		Duration:       "2h",
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/systems/logs/project-containers", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	handler.GetProjectContainerLogs(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response domain.ProjectLogs
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "test-project", response.ProjectID)
	assert.Equal(t, 3, response.TotalLogs)
	assert.Equal(t, 1, response.TotalErrors)
	assert.Equal(t, 1, response.TotalWarnings)
	assert.Len(t, response.Containers, 2)

	mockService.AssertExpectations(t)
}
