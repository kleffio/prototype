package loki

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"prometheus-metrics-api/internal/core/domain"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewLokiClient(t *testing.T) {
	baseURL := "http://localhost:3100"
	client := NewLokiClient(baseURL)

	assert.NotNil(t, client)

	// Cast to concrete type to access internal fields
	lokiClient := client.(*lokiClient)
	assert.Equal(t, baseURL, lokiClient.baseURL)
	assert.Equal(t, 30*time.Second, lokiClient.httpClient.Timeout)
}

func TestGetProjectContainerLogs_SuccessWithPrimaryQuery(t *testing.T) {
	// Create mock Loki server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify the query contains expected format
		query := r.URL.Query().Get("query")
		assert.Contains(t, query, `k8s_namespace_name="test-project"`)
		assert.Contains(t, query, `k8s_deployment_name="app-test-container"`)

		// Mock successful Loki response
		response := LokiResponse{
			Status: "success",
			Data: struct {
				ResultType string `json:"resultType"`
				Result     []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				} `json:"result"`
				Stats struct {
					Summary struct {
						BytesProcessedPerSecond int     `json:"bytesProcessedPerSecond"`
						LinesProcessedPerSecond int     `json:"linesProcessedPerSecond"`
						TotalBytesProcessed     int     `json:"totalBytesProcessed"`
						TotalLinesProcessed     int     `json:"totalLinesProcessed"`
						ExecTime                float64 `json:"execTime"`
					} `json:"summary"`
				} `json:"stats"`
			}{
				ResultType: "streams",
				Result: []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				}{
					{
						Stream: map[string]string{
							"k8s_namespace_name":  "test-project",
							"k8s_deployment_name": "app-test-container",
							"k8s_pod_name":        "app-test-container-123",
						},
						Values: [][]string{
							{"1640995200000000000", "Application started successfully"},
							{"1640995260000000000", "Processing request"},
							{"1640995280000000000", "Error occurred during processing"},
						},
					},
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			t.Fatalf("failed to encode response: %v", err)
		}
	}))
	defer server.Close()

	client := NewLokiClient(server.URL)

	// Test the debug logging by calling GetProjectContainerLogs
	result, err := client.GetProjectContainerLogs(
		context.Background(),
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"test-container"},
			Limit:          100,
			Duration:       "1h",
		},
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "test-project", result.ProjectID)
	assert.Equal(t, 3, result.TotalLogs)
	assert.Equal(t, 1, result.TotalErrors) // One log contains "Error"
	assert.Equal(t, 0, result.TotalWarnings)
	assert.Len(t, result.Containers, 1)

	container := result.Containers[0]
	assert.Equal(t, "test-container", container.ContainerName)
	assert.Len(t, container.Logs, 3)
	assert.Equal(t, 3, container.LogCount)
	assert.Equal(t, 1, container.ErrorCount)
	assert.Equal(t, 0, container.WarningCount)
	assert.False(t, container.HasMore) // Less than limit
}

func TestGetProjectContainerLogs_FallbackQuery(t *testing.T) {
	callCount := 0

	// Create mock server that fails on first call, succeeds on second
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		query := r.URL.Query().Get("query")

		if callCount == 1 {
			// First call should use primary query format
			assert.Contains(t, query, `k8s_namespace_name="test-project"`)
			assert.Contains(t, query, `k8s_deployment_name="app-test-container"`)

			// Return empty result to trigger fallback
			response := LokiResponse{
				Status: "success",
				Data: struct {
					ResultType string `json:"resultType"`
					Result     []struct {
						Stream map[string]string `json:"stream"`
						Values [][]string        `json:"values"`
					} `json:"result"`
					Stats struct {
						Summary struct {
							BytesProcessedPerSecond int     `json:"bytesProcessedPerSecond"`
							LinesProcessedPerSecond int     `json:"linesProcessedPerSecond"`
							TotalBytesProcessed     int     `json:"totalBytesProcessed"`
							TotalLinesProcessed     int     `json:"totalLinesProcessed"`
							ExecTime                float64 `json:"execTime"`
						} `json:"summary"`
					} `json:"stats"`
				}{
					ResultType: "streams",
					Result: []struct {
						Stream map[string]string `json:"stream"`
						Values [][]string        `json:"values"`
					}{},
				},
			}

			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				t.Fatalf("failed to encode response: %v", err)
			}
		} else {
			// Second call should use fallback query format
			assert.Contains(t, query, `namespace="test-project"`)
			assert.Contains(t, query, `deployment="app-test-container"`)

			// Return successful result
			response := LokiResponse{
				Status: "success",
				Data: struct {
					ResultType string `json:"resultType"`
					Result     []struct {
						Stream map[string]string `json:"stream"`
						Values [][]string        `json:"values"`
					} `json:"result"`
					Stats struct {
						Summary struct {
							BytesProcessedPerSecond int     `json:"bytesProcessedPerSecond"`
							LinesProcessedPerSecond int     `json:"linesProcessedPerSecond"`
							TotalBytesProcessed     int     `json:"totalBytesProcessed"`
							TotalLinesProcessed     int     `json:"totalLinesProcessed"`
							ExecTime                float64 `json:"execTime"`
						} `json:"summary"`
					} `json:"stats"`
				}{
					ResultType: "streams",
					Result: []struct {
						Stream map[string]string `json:"stream"`
						Values [][]string        `json:"values"`
					}{
						{
							Stream: map[string]string{
								"namespace":  "test-project",
								"deployment": "app-test-container",
							},
							Values: [][]string{
								{"1640995200000000000", "Fallback query success"},
							},
						},
					},
				},
			}

			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				t.Fatalf("failed to encode response: %v", err)
			}
		}
	}))
	defer server.Close()

	client := NewLokiClient(server.URL)

	result, err := client.GetProjectContainerLogs(
		context.Background(),
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"test-container"},
			Limit:          100,
			Duration:       "1h",
		},
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, callCount) // Should make two calls
	assert.Len(t, result.Containers, 1)
	assert.Len(t, result.Containers[0].Logs, 1)
	assert.Equal(t, "Fallback query success", result.Containers[0].Logs[0].Log)
}

func TestGetProjectContainerLogs_BothQueriesFail(t *testing.T) {
	callCount := 0

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++

		// Return empty result for both calls
		response := LokiResponse{
			Status: "success",
			Data: struct {
				ResultType string `json:"resultType"`
				Result     []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				} `json:"result"`
				Stats struct {
					Summary struct {
						BytesProcessedPerSecond int     `json:"bytesProcessedPerSecond"`
						LinesProcessedPerSecond int     `json:"linesProcessedPerSecond"`
						TotalBytesProcessed     int     `json:"totalBytesProcessed"`
						TotalLinesProcessed     int     `json:"totalLinesProcessed"`
						ExecTime                float64 `json:"execTime"`
					} `json:"summary"`
				} `json:"stats"`
			}{
				ResultType: "streams",
				Result: []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				}{},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			t.Fatalf("failed to encode response: %v", err)
		}
	}))
	defer server.Close()

	client := NewLokiClient(server.URL)

	result, err := client.GetProjectContainerLogs(
		context.Background(),
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"test-container"},
			Limit:          100,
			Duration:       "1h",
		},
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, callCount) // Should make two calls
	assert.Len(t, result.Containers, 1)
	assert.Len(t, result.Containers[0].Logs, 0) // Empty logs
	assert.Equal(t, "test-container", result.Containers[0].ContainerName)
	assert.Equal(t, 0, result.Containers[0].LogCount)
	assert.Equal(t, 0, result.Containers[0].ErrorCount)
	assert.Equal(t, 0, result.Containers[0].WarningCount)
	assert.False(t, result.Containers[0].HasMore)
}

func TestGetProjectContainerLogs_ErrorAndWarningCounting(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := LokiResponse{
			Status: "success",
			Data: struct {
				ResultType string `json:"resultType"`
				Result     []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				} `json:"result"`
				Stats struct {
					Summary struct {
						BytesProcessedPerSecond int     `json:"bytesProcessedPerSecond"`
						LinesProcessedPerSecond int     `json:"linesProcessedPerSecond"`
						TotalBytesProcessed     int     `json:"totalBytesProcessed"`
						TotalLinesProcessed     int     `json:"totalLinesProcessed"`
						ExecTime                float64 `json:"execTime"`
					} `json:"summary"`
				} `json:"stats"`
			}{
				ResultType: "streams",
				Result: []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				}{
					{
						Stream: map[string]string{},
						Values: [][]string{
							{"1640995200000000000", "Normal log entry"},
							{"1640995220000000000", "Warning: something might be wrong"},
							{"1640995240000000000", "WARN: another warning message"},
							{"1640995260000000000", "Error occurred during processing"},
							{"1640995280000000000", "Exception in thread main"},
							{"1640995300000000000", "FATAL: system shutdown"},
							{"1640995320000000000", "INFO: system recovered"},
						},
					},
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			t.Fatalf("failed to encode response: %v", err)
		}
	}))
	defer server.Close()

	client := NewLokiClient(server.URL)

	result, err := client.GetProjectContainerLogs(
		context.Background(),
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"test-container"},
			Limit:          100,
			Duration:       "1h",
		},
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Containers, 1)

	container := result.Containers[0]
	assert.Equal(t, 7, container.LogCount)
	assert.Equal(t, 3, container.ErrorCount)   // "Error", "Exception", "FATAL"
	assert.Equal(t, 2, container.WarningCount) // "Warning:", "WARN:"
	assert.Equal(t, 7, result.TotalLogs)
	assert.Equal(t, 3, result.TotalErrors)
	assert.Equal(t, 2, result.TotalWarnings)
}

func TestGetProjectContainerLogs_MultipleContainers(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("query")

		var values [][]string
		if strings.Contains(query, "app-container1") {
			values = [][]string{
				{"1640995200000000000", "Container1 log"},
				{"1640995220000000000", "Container1 error"},
			}
		} else if strings.Contains(query, "app-container2") {
			values = [][]string{
				{"1640995240000000000", "Container2 log"},
				{"1640995260000000000", "Container2 warning message"},
			}
		}

		response := LokiResponse{
			Status: "success",
			Data: struct {
				ResultType string `json:"resultType"`
				Result     []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				} `json:"result"`
				Stats struct {
					Summary struct {
						BytesProcessedPerSecond int     `json:"bytesProcessedPerSecond"`
						LinesProcessedPerSecond int     `json:"linesProcessedPerSecond"`
						TotalBytesProcessed     int     `json:"totalBytesProcessed"`
						TotalLinesProcessed     int     `json:"totalLinesProcessed"`
						ExecTime                float64 `json:"execTime"`
					} `json:"summary"`
				} `json:"stats"`
			}{
				ResultType: "streams",
				Result: []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				}{
					{
						Stream: map[string]string{},
						Values: values,
					},
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			t.Fatalf("failed to encode response: %v", err)
		}
	}))
	defer server.Close()

	client := NewLokiClient(server.URL)

	result, err := client.GetProjectContainerLogs(
		context.Background(),
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"container1", "container2"},
			Limit:          100,
			Duration:       "1h",
		},
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Containers, 2)
	assert.Equal(t, 4, result.TotalLogs)     // 2 + 2
	assert.Equal(t, 1, result.TotalErrors)   // "error" in container1
	assert.Equal(t, 1, result.TotalWarnings) // "warning" in container2
}

func TestGetProjectContainerLogs_HasMoreFlag(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create exactly the limit number of logs
		values := make([][]string, 5) // limit is 5 in this test
		for i := 0; i < 5; i++ {
			values[i] = []string{fmt.Sprintf("164099520%d000000000", i), fmt.Sprintf("Log entry %d", i)}
		}

		response := LokiResponse{
			Status: "success",
			Data: struct {
				ResultType string `json:"resultType"`
				Result     []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				} `json:"result"`
				Stats struct {
					Summary struct {
						BytesProcessedPerSecond int     `json:"bytesProcessedPerSecond"`
						LinesProcessedPerSecond int     `json:"linesProcessedPerSecond"`
						TotalBytesProcessed     int     `json:"totalBytesProcessed"`
						TotalLinesProcessed     int     `json:"totalLinesProcessed"`
						ExecTime                float64 `json:"execTime"`
					} `json:"summary"`
				} `json:"stats"`
			}{
				ResultType: "streams",
				Result: []struct {
					Stream map[string]string `json:"stream"`
					Values [][]string        `json:"values"`
				}{
					{
						Stream: map[string]string{},
						Values: values,
					},
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			t.Fatalf("failed to encode response: %v", err)
		}
	}))
	defer server.Close()

	client := NewLokiClient(server.URL)

	result, err := client.GetProjectContainerLogs(
		context.Background(),
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"test-container"},
			Limit:          5, // Set limit to exactly match number of returned logs
			Duration:       "1h",
		},
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Containers, 1)
	assert.Equal(t, 5, result.Containers[0].LogCount)
	assert.True(t, result.Containers[0].HasMore) // Should be true when logs == limit
}

func TestGetProjectContainerLogs_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewLokiClient(server.URL)

	result, err := client.GetProjectContainerLogs(
		context.Background(),
		domain.LogFilterOptions{
			ProjectID:      "test-project",
			ContainerNames: []string{"test-container"},
			Limit:          100,
			Duration:       "1h",
		},
	)

	// Should still return a result with empty containers rather than error
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Containers, 1)
	assert.Equal(t, "test-container", result.Containers[0].ContainerName)
	assert.Len(t, result.Containers[0].Logs, 0)
	assert.Equal(t, 0, result.Containers[0].LogCount)
}

func TestConvertToLogEntries(t *testing.T) {
	lokiResp := &LokiResponse{
		Status: "success",
		Data: struct {
			ResultType string `json:"resultType"`
			Result     []struct {
				Stream map[string]string `json:"stream"`
				Values [][]string        `json:"values"`
			} `json:"result"`
			Stats struct {
				Summary struct {
					BytesProcessedPerSecond int     `json:"bytesProcessedPerSecond"`
					LinesProcessedPerSecond int     `json:"linesProcessedPerSecond"`
					TotalBytesProcessed     int     `json:"totalBytesProcessed"`
					TotalLinesProcessed     int     `json:"totalLinesProcessed"`
					ExecTime                float64 `json:"execTime"`
				} `json:"summary"`
			} `json:"stats"`
		}{
			ResultType: "streams",
			Result: []struct {
				Stream map[string]string `json:"stream"`
				Values [][]string        `json:"values"`
			}{
				{
					Stream: map[string]string{
						"namespace": "test-project",
						"pod":       "test-pod",
					},
					Values: [][]string{
						{"1640995200000000000", "First log entry"},
						{"1640995260000000000", "Second log entry"},
					},
				},
				{
					Stream: map[string]string{
						"namespace": "test-project",
						"pod":       "test-pod-2",
					},
					Values: [][]string{
						{"1640995280000000000", "Third log entry"},
					},
				},
			},
		},
	}

	logs := convertToLogEntries(lokiResp)

	assert.Len(t, logs, 3)

	// First log
	assert.Equal(t, "1640995200000000000", logs[0].Timestamp)
	assert.Equal(t, "First log entry", logs[0].Log)
	assert.Equal(t, "test-project", logs[0].Labels["namespace"])
	assert.Equal(t, "test-pod", logs[0].Labels["pod"])

	// Second log
	assert.Equal(t, "1640995260000000000", logs[1].Timestamp)
	assert.Equal(t, "Second log entry", logs[1].Log)

	// Third log (from different stream)
	assert.Equal(t, "1640995280000000000", logs[2].Timestamp)
	assert.Equal(t, "Third log entry", logs[2].Log)
	assert.Equal(t, "test-pod-2", logs[2].Labels["pod"])
}
