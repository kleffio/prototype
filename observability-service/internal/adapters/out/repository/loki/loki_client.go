package loki

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"
)

type lokiClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewLokiClient(baseURL string) ports.LogsRepository {
	return &lokiClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type LokiResponse struct {
	Status string `json:"status"`
	Data   struct {
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
	} `json:"data"`
}

func (c *lokiClient) queryLokiRange(ctx context.Context, query string, start, end time.Time, limit int, direction string) (*LokiResponse, error) {
	if direction == "" {
		direction = "backward"
	}

	params := url.Values{}
	params.Add("query", query)
	params.Add("start", fmt.Sprintf("%d", start.UnixNano()))
	params.Add("end", fmt.Sprintf("%d", end.UnixNano()))
	params.Add("limit", strconv.Itoa(limit))
	params.Add("direction", direction)

	apiURL := fmt.Sprintf("%s/loki/api/v1/query_range?%s", c.baseURL, params.Encode())
	log.Printf("[DEBUG] Loki API request URL: %s", apiURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Scope-OrgID", "1")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("loki returned status %d: %s", resp.StatusCode, string(body))
	}

	var lokiResp LokiResponse
	if err := json.NewDecoder(resp.Body).Decode(&lokiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &lokiResp, nil
}

func parseDuration(duration string) (time.Duration, error) {
	dur, err := time.ParseDuration(duration)
	if err != nil {
		return 1 * time.Hour, fmt.Errorf("invalid duration format: %w", err)
	}
	return dur, nil
}

func convertToLogEntries(lokiResp *LokiResponse) []domain.LogEntry {
	var logs []domain.LogEntry

	for _, result := range lokiResp.Data.Result {
		for _, value := range result.Values {
			if len(value) >= 2 {

				timestamp := value[0]
				logLine := value[1]

				logs = append(logs, domain.LogEntry{
					Timestamp: timestamp,
					Log:       logLine,
					Labels:    result.Stream,
					Stream:    result.Stream,
				})
			}
		}
	}

	return logs
}

func (c *lokiClient) GetProjectContainerLogs(ctx context.Context, options domain.LogFilterOptions) (*domain.ProjectLogs, error) {
	log.Printf("[DEBUG] Loki client GetProjectContainerLogs called - ProjectID: %s, ContainerNames: %v, Limit: %d",
		options.ProjectID, options.ContainerNames, options.Limit)

	limit := options.Limit
	if limit <= 0 {
		limit = 100
	}

	var start, end time.Time
	var err error

	if options.StartTime != "" && options.EndTime != "" {
		start, err = time.Parse(time.RFC3339, options.StartTime)
		if err != nil {
			log.Printf("[WARN] Failed to parse start time %s: %v", options.StartTime, err)
		}
		end, err = time.Parse(time.RFC3339, options.EndTime)
		if err != nil {
			log.Printf("[WARN] Failed to parse end time %s: %v", options.EndTime, err)
		}
	}

	if start.IsZero() || end.IsZero() {
		duration := options.Duration
		if duration == "" {
			duration = "1h"
		}
		dur, err := parseDuration(duration)
		if err != nil {
			dur = 1 * time.Hour
		}
		end = time.Now()
		start = end.Add(-dur)
	}

	projectLogs := &domain.ProjectLogs{
		ProjectID:     options.ProjectID,
		TotalLogs:     0,
		TotalErrors:   0,
		TotalWarnings: 0,
		Containers:    make([]domain.ContainerLogs, 0, len(options.ContainerNames)),
		Timestamp:     time.Now().Unix(),
	}

	for _, containerName := range options.ContainerNames {

		baseQuery := fmt.Sprintf(`{k8s_namespace_name="%s", k8s_deployment_name="app-%s"}`, options.ProjectID, containerName)
		query := baseQuery

		if options.SearchText != "" {
			query += fmt.Sprintf(` |~ "(?i)%s"`, options.SearchText)
		}

		if options.Severity != "" {
			// Use LogQL json parser for robust numeric level filtering
			// Pino/Bunyan levels: trace=10, debug=20, info=30, warn=40, error=50, fatal=60
			switch strings.ToLower(options.Severity) {
			case "info":
				// Match Info (30) and above
				query += " | json | level >= 30"
			case "warn", "warning":
				// Match Warn (40) and above
				query += " | json | level >= 40"
			case "error":
				// Match Error (50) and above
				query += " | json | level >= 50"
			case "fatal":
				// Match Fatal (60) and above
				query += " | json | level >= 60"
			default:
				// Fallback to text search for custom levels
				query += fmt.Sprintf(` |~ "(?i)%s"`, options.Severity)
			}
		}
		// If no filters, ensure at least empty filter to make it valid LogQL if needed, but base selector is valid.
		if options.SearchText == "" && options.Severity == "" {
			query += ` |= ""`
		}

		log.Printf("[DEBUG] Loki LogQL query (primary) for container %s: %s", containerName, query)

		lokiResp, err := c.queryLokiRange(ctx, query, start, end, limit, "backward")
		if err != nil || len(lokiResp.Data.Result) == 0 {

			// Fallback query
			baseQuery = fmt.Sprintf(`{namespace="%s", deployment="app-%s"}`, options.ProjectID, containerName)
			query = baseQuery
			if options.SearchText != "" {
				query += fmt.Sprintf(` |~ "(?i)%s"`, options.SearchText)
			}
			if options.Severity != "" {
				query += fmt.Sprintf(` |~ "(?i)%s"`, options.Severity)
			}
			if options.SearchText == "" && options.Severity == "" {
				query += ` |= ""`
			}

			// We need to re-apply the smarter filter to the fallback query
			query = baseQuery
			if options.SearchText != "" {
				query += fmt.Sprintf(` |~ "(?i)%s"`, options.SearchText)
			}
			if options.Severity != "" {
				switch strings.ToLower(options.Severity) {
				case "info":
					query += " | json | level >= 30"
				case "warn", "warning":
					query += " | json | level >= 40"
				case "error":
					query += " | json | level >= 50"
				case "fatal":
					query += " | json | level >= 60"
				default:
					query += fmt.Sprintf(` |~ "(?i)%s"`, options.Severity)
				}
			}
			log.Printf("[DEBUG] Loki LogQL query (fallback) for container %s: %s", containerName, query)
			lokiResp, err = c.queryLokiRange(ctx, query, start, end, limit, "backward")
			if err != nil {

				projectLogs.Containers = append(projectLogs.Containers, domain.ContainerLogs{
					ContainerName: containerName,
					Logs:          []domain.LogEntry{},
					LogCount:      0,
					ErrorCount:    0,
					WarningCount:  0,
					HasMore:       false,
				})
				continue
			}
		}

		logs := convertToLogEntries(lokiResp)

		errorCount := 0
		warningCount := 0
		for _, logEntry := range logs {
			// Check for string match first
			logLineLower := strings.ToLower(logEntry.Log)
			strIsError := strings.Contains(logLineLower, "error") || strings.Contains(logLineLower, "exception") || strings.Contains(logLineLower, "fatal")
			strIsWarn := strings.Contains(logLineLower, "warn") || strings.Contains(logLineLower, "warning")

			// Simple heuristic for JSON levels without full parsing for performance
			jsonIsError := strings.Contains(logLineLower, "\"level\":50") || strings.Contains(logLineLower, "\"level\":60")
			jsonIsWarn := strings.Contains(logLineLower, "\"level\":40")

			if strIsError || jsonIsError {
				errorCount++
			} else if strIsWarn || jsonIsWarn {
				warningCount++
			}
		}

		containerLogs := domain.ContainerLogs{
			ContainerName: containerName,
			Logs:          logs,
			LogCount:      len(logs),
			ErrorCount:    errorCount,
			WarningCount:  warningCount,
			HasMore:       len(logs) >= limit,
		}

		projectLogs.Containers = append(projectLogs.Containers, containerLogs)
		projectLogs.TotalLogs += len(logs)
		projectLogs.TotalErrors += errorCount
		projectLogs.TotalWarnings += warningCount
	}

	return projectLogs, nil
}
