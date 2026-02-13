package services

import (
	"context"
	"strings"
	"testing"
	"time"

	"prometheus-metrics-api/internal/core/domain"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock repositories

type exportMockLogsRepo struct {
	logs *domain.ProjectLogs
	err  error
}

func (m *exportMockLogsRepo) GetProjectContainerLogs(_ context.Context, _ string, _ []string, _ int, _ string) (*domain.ProjectLogs, error) {
	return m.logs, m.err
}

type exportMockMetricsRepo struct {
	metrics *domain.AggregatedMetrics
	err     error
}

func (m *exportMockMetricsRepo) GetAllMetrics(_ context.Context, _ string) (*domain.AggregatedMetrics, error) {
	return m.metrics, m.err
}

func (m *exportMockMetricsRepo) GetClusterOverview(_ context.Context) (*domain.ClusterOverview, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetRequestsMetric(_ context.Context, _ string) (*domain.MetricCard, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetPodsMetric(_ context.Context, _ string) (*domain.MetricCard, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetNodesMetric(_ context.Context, _ string) (*domain.MetricCard, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetTenantsMetric(_ context.Context, _ string) (*domain.MetricCard, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetCPUUtilization(_ context.Context, _ string) (*domain.ResourceUtilization, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetMemoryUtilization(_ context.Context, _ string) (*domain.ResourceUtilization, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetNodes(_ context.Context) ([]domain.NodeMetric, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetNamespaces(_ context.Context) ([]domain.NamespaceMetric, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetUptimeMetrics(_ context.Context, _ string) (*domain.UptimeMetrics, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetSystemUptime(_ context.Context) (float64, error) {
	return 0, nil
}
func (m *exportMockMetricsRepo) GetDatabaseIOMetrics(_ context.Context, _ string, _ []string) (*domain.DatabaseMetrics, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetProjectUsageMetrics(_ context.Context, _ string) (*domain.ProjectUsageMetrics, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetProjectUsageMetricsWithDays(_ context.Context, _ string, _ int) (*domain.ProjectUsageMetrics, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetProjectTotalUsageMetrics(_ context.Context, _ string) (*domain.ProjectTotalUsageMetrics, error) {
	return nil, nil
}
func (m *exportMockMetricsRepo) GetProjectTotalUsageMetricsWithDays(_ context.Context, _ string, _ int) (*domain.ProjectTotalUsageMetrics, error) {
	return nil, nil
}

// Tests

func TestExportLogsCSV(t *testing.T) {
	mockLogs := &domain.ProjectLogs{
		ProjectID: "test-project",
		TotalLogs: 2,
		Containers: []domain.ContainerLogs{
			{
				ContainerName: "web-app",
				Logs: []domain.LogEntry{
					{Timestamp: "1700000000000000000", Log: "INFO: Server started on port 8080"},
					{Timestamp: "1700000001000000000", Log: "ERROR: Connection refused"},
				},
				LogCount: 2,
			},
		},
	}

	svc := NewExportService(&exportMockLogsRepo{logs: mockLogs}, &exportMockMetricsRepo{})

	params := domain.ExportParams{
		Format:    domain.FormatCSV,
		From:      time.Now().Add(-1 * time.Hour),
		To:        time.Now(),
		ProjectID: "test-project",
	}

	data, filename, err := svc.ExportLogs(context.Background(), params)
	require.NoError(t, err)
	assert.Contains(t, filename, "logs-test-project-")
	assert.True(t, strings.HasSuffix(filename, ".csv"))

	content := string(data)
	assert.Contains(t, content, "timestamp,container,level,message")
	assert.Contains(t, content, "web-app")
	assert.Contains(t, content, "INFO")
	assert.Contains(t, content, "ERROR")
}

func TestExportLogsTXT(t *testing.T) {
	mockLogs := &domain.ProjectLogs{
		ProjectID: "test-project",
		TotalLogs: 1,
		Containers: []domain.ContainerLogs{
			{
				ContainerName: "api",
				Logs: []domain.LogEntry{
					{Timestamp: "1700000000000000000", Log: "Request received"},
				},
				LogCount: 1,
			},
		},
	}

	svc := NewExportService(&exportMockLogsRepo{logs: mockLogs}, &exportMockMetricsRepo{})

	params := domain.ExportParams{
		Format:    domain.FormatTXT,
		From:      time.Now().Add(-1 * time.Hour),
		To:        time.Now(),
		ProjectID: "test-project",
	}

	data, filename, err := svc.ExportLogs(context.Background(), params)
	require.NoError(t, err)
	assert.True(t, strings.HasSuffix(filename, ".txt"))

	content := string(data)
	assert.Contains(t, content, "[api]")
	assert.Contains(t, content, "Request received")
}

func TestExportLogsUnsupportedFormat(t *testing.T) {
	mockLogs := &domain.ProjectLogs{
		ProjectID: "test-project",
		TotalLogs: 1,
		Containers: []domain.ContainerLogs{
			{
				ContainerName: "api",
				Logs: []domain.LogEntry{
					{Timestamp: "1700000000000000000", Log: "test"},
				},
				LogCount: 1,
			},
		},
	}

	svc := NewExportService(&exportMockLogsRepo{logs: mockLogs}, &exportMockMetricsRepo{})

	params := domain.ExportParams{
		Format:    domain.FormatPDF,
		From:      time.Now().Add(-1 * time.Hour),
		To:        time.Now(),
		ProjectID: "test-project",
	}

	_, _, err := svc.ExportLogs(context.Background(), params)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported log export format")
}

func TestExportLogsEmptyDataset(t *testing.T) {
	mockLogs := &domain.ProjectLogs{
		ProjectID:  "test-project",
		TotalLogs:  0,
		Containers: []domain.ContainerLogs{},
	}

	svc := NewExportService(&exportMockLogsRepo{logs: mockLogs}, &exportMockMetricsRepo{})

	params := domain.ExportParams{
		Format:    domain.FormatCSV,
		From:      time.Now().Add(-1 * time.Hour),
		To:        time.Now(),
		ProjectID: "test-project",
	}

	_, _, err := svc.ExportLogs(context.Background(), params)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no logs found")
}

func TestExportMetricsCSV(t *testing.T) {
	mockMetrics := &domain.AggregatedMetrics{
		Overview: &domain.ClusterOverview{
			TotalNodes:         3,
			RunningNodes:       3,
			TotalPods:          25,
			TotalNamespaces:    5,
			CPUUsagePercent:    45.2,
			MemoryUsagePercent: 62.8,
			UptimeSeconds:      86400,
			UptimeFormatted:    "1d 0h 0m",
		},
		Nodes: []domain.NodeMetric{
			{Name: "node-1", CPUUsagePercent: 30.0, MemoryUsagePercent: 50.0, PodCount: 10, Status: "Ready"},
		},
	}

	svc := NewExportService(&exportMockLogsRepo{}, &exportMockMetricsRepo{metrics: mockMetrics})

	params := domain.ExportParams{
		Format: domain.FormatCSV,
		From:   time.Now().Add(-1 * time.Hour),
		To:     time.Now(),
	}

	data, filename, err := svc.ExportMetrics(context.Background(), params)
	require.NoError(t, err)
	assert.Contains(t, filename, "metrics-cluster-")
	assert.True(t, strings.HasSuffix(filename, ".csv"))

	content := string(data)
	assert.Contains(t, content, "metric_name,timestamp,value,unit")
	assert.Contains(t, content, "total_nodes")
	assert.Contains(t, content, "total_pods")
	assert.Contains(t, content, "cpu_usage_percent")
	assert.Contains(t, content, "node_node-1_cpu")
}

func TestExportMetricsPDF(t *testing.T) {
	mockMetrics := &domain.AggregatedMetrics{
		Overview: &domain.ClusterOverview{
			TotalNodes:         2,
			RunningNodes:       2,
			TotalPods:          10,
			TotalNamespaces:    3,
			CPUUsagePercent:    40.0,
			MemoryUsagePercent: 55.0,
			UptimeSeconds:      3600,
			UptimeFormatted:    "1h 0m",
		},
	}

	svc := NewExportService(&exportMockLogsRepo{}, &exportMockMetricsRepo{metrics: mockMetrics})

	params := domain.ExportParams{
		Format: domain.FormatPDF,
		From:   time.Now().Add(-1 * time.Hour),
		To:     time.Now(),
	}

	data, filename, err := svc.ExportMetrics(context.Background(), params)
	require.NoError(t, err)
	assert.True(t, strings.HasSuffix(filename, ".pdf"))
	assert.True(t, len(data) > 0)
	// PDF files start with %PDF
	assert.True(t, strings.HasPrefix(string(data), "%PDF"))
}

func TestExportMetricsUnsupportedFormat(t *testing.T) {
	mockMetrics := &domain.AggregatedMetrics{
		Overview: &domain.ClusterOverview{TotalNodes: 1},
	}

	svc := NewExportService(&exportMockLogsRepo{}, &exportMockMetricsRepo{metrics: mockMetrics})

	params := domain.ExportParams{
		Format: domain.FormatTXT,
		From:   time.Now().Add(-1 * time.Hour),
		To:     time.Now(),
	}

	_, _, err := svc.ExportMetrics(context.Background(), params)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported metrics export format")
}

func TestDetectLogLevel(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"FATAL: system crash", "FATAL"},
		{"ERROR: connection failed", "ERROR"},
		{"java.lang.NullPointerException", "ERROR"},
		{"WARNING: disk space low", "WARN"},
		{"WARN: deprecated API", "WARN"},
		{"DEBUG: processing request", "DEBUG"},
		{"TRACE: entering method", "TRACE"},
		{"Starting server on port 8080", "INFO"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			assert.Equal(t, tt.expected, detectLogLevel(tt.input))
		})
	}
}

func TestFormatNanoTimestamp(t *testing.T) {
	result := formatNanoTimestamp("1700000000000000000")
	assert.Contains(t, result, "2023")
	assert.NotEqual(t, "1700000000000000000", result)

	result = formatNanoTimestamp("invalid")
	assert.Equal(t, "invalid", result)
}

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		input    time.Duration
		expected string
	}{
		{1 * time.Hour, "1h"},
		{6 * time.Hour, "6h"},
		{24 * time.Hour, "24h"},
		{30 * time.Minute, "30m"},
		{0, "1h"},
		{-1 * time.Hour, "1h"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			assert.Equal(t, tt.expected, formatDuration(tt.input))
		})
	}
}
