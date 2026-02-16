package services

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"strconv"
	"strings"
	"time"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"

	"github.com/go-pdf/fpdf"
)

type exportService struct {
	logsRepo    ports.LogsRepository
	metricsRepo ports.MetricsRepository
}

func NewExportService(logsRepo ports.LogsRepository, metricsRepo ports.MetricsRepository) ports.ExportService {
	return &exportService{
		logsRepo:    logsRepo,
		metricsRepo: metricsRepo,
	}
}

func (s *exportService) ExportLogs(ctx context.Context, params domain.ExportParams) ([]byte, string, error) {
	duration := params.To.Sub(params.From)
	durationStr := formatDuration(duration)

	containerNames := []string{}
	// In a real implementation we should get the container list for the project
	// For now this might return empty results if containers are not specified
	logs, err := s.logsRepo.GetProjectContainerLogs(ctx, domain.LogFilterOptions{
		ProjectID:      params.ProjectID,
		ContainerNames: containerNames,
		Limit:          5000,
		Duration:       durationStr,
	})
	if err != nil {
		return nil, "", fmt.Errorf("failed to fetch logs: %w", err)
	}

	var allEntries []logExportEntry
	for _, container := range logs.Containers {
		for _, entry := range container.Logs {
			allEntries = append(allEntries, logExportEntry{
				Timestamp:    formatNanoTimestamp(entry.Timestamp),
				Container:    container.ContainerName,
				Level:        detectLogLevel(entry.Log),
				Message:      entry.Log,
				RawTimestamp: entry.Timestamp,
			})
		}
	}

	if len(allEntries) == 0 {
		return nil, "", fmt.Errorf("no logs found for the specified time range")
	}

	timestamp := time.Now().Format("20060102-150405")

	switch params.Format {
	case domain.FormatCSV:
		data, err := formatLogsCSV(allEntries)
		if err != nil {
			return nil, "", err
		}
		filename := fmt.Sprintf("logs-%s-%s.csv", params.ProjectID, timestamp)
		return data, filename, nil

	case domain.FormatTXT:
		data := formatLogsTXT(allEntries)
		filename := fmt.Sprintf("logs-%s-%s.txt", params.ProjectID, timestamp)
		return data, filename, nil

	default:
		return nil, "", fmt.Errorf("unsupported log export format: %s (supported: csv, txt)", params.Format)
	}
}

func (s *exportService) ExportMetrics(ctx context.Context, params domain.ExportParams) ([]byte, string, error) {
	duration := params.To.Sub(params.From)
	durationStr := formatDuration(duration)

	metrics, err := s.metricsRepo.GetAllMetrics(ctx, durationStr)
	if err != nil {
		return nil, "", fmt.Errorf("failed to fetch metrics: %w", err)
	}

	if metrics == nil {
		return nil, "", fmt.Errorf("no metrics found for the specified time range")
	}

	timestamp := time.Now().Format("20060102-150405")
	projectSuffix := "cluster"
	if params.ProjectID != "" {
		projectSuffix = params.ProjectID
	}

	switch params.Format {
	case domain.FormatCSV:
		data, err := formatMetricsCSV(metrics, params)
		if err != nil {
			return nil, "", err
		}
		filename := fmt.Sprintf("metrics-%s-%s.csv", projectSuffix, timestamp)
		return data, filename, nil

	case domain.FormatPDF:
		data, err := formatMetricsPDF(metrics, params)
		if err != nil {
			return nil, "", err
		}
		filename := fmt.Sprintf("metrics-%s-%s.pdf", projectSuffix, timestamp)
		return data, filename, nil

	default:
		return nil, "", fmt.Errorf("unsupported metrics export format: %s (supported: csv, pdf)", params.Format)
	}
}

type logExportEntry struct {
	Timestamp    string
	Container    string
	Level        string
	Message      string
	RawTimestamp string
}

func formatLogsCSV(entries []logExportEntry) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	if err := w.Write([]string{"timestamp", "container", "level", "message"}); err != nil {
		return nil, fmt.Errorf("failed to write CSV header: %w", err)
	}

	for _, entry := range entries {
		if err := w.Write([]string{entry.Timestamp, entry.Container, entry.Level, entry.Message}); err != nil {
			return nil, fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("CSV flush error: %w", err)
	}

	return buf.Bytes(), nil
}

func formatLogsTXT(entries []logExportEntry) []byte {
	var buf bytes.Buffer

	for _, entry := range entries {
		fmt.Fprintf(&buf, "[%s] [%s] [%s] %s\n", entry.Timestamp, entry.Container, entry.Level, entry.Message)
	}

	return buf.Bytes()
}

func formatMetricsCSV(metrics *domain.AggregatedMetrics, params domain.ExportParams) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	if err := w.Write([]string{"metric_name", "timestamp", "value", "unit"}); err != nil {
		return nil, fmt.Errorf("failed to write CSV header: %w", err)
	}

	ts := time.Now().Format(time.RFC3339)

	if metrics.Overview != nil {
		writeMetricRow(w, "total_nodes", ts, fmt.Sprintf("%d", metrics.Overview.TotalNodes), "count")
		writeMetricRow(w, "running_nodes", ts, fmt.Sprintf("%d", metrics.Overview.RunningNodes), "count")
		writeMetricRow(w, "total_pods", ts, fmt.Sprintf("%d", metrics.Overview.TotalPods), "count")
		writeMetricRow(w, "total_namespaces", ts, fmt.Sprintf("%d", metrics.Overview.TotalNamespaces), "count")
		writeMetricRow(w, "cpu_usage_percent", ts, fmt.Sprintf("%.2f", metrics.Overview.CPUUsagePercent), "percent")
		writeMetricRow(w, "memory_usage_percent", ts, fmt.Sprintf("%.2f", metrics.Overview.MemoryUsagePercent), "percent")
		writeMetricRow(w, "uptime_seconds", ts, fmt.Sprintf("%.0f", metrics.Overview.UptimeSeconds), "seconds")
	}

	if metrics.CPUUtilization != nil {
		for _, point := range metrics.CPUUtilization.History {
			pointTS := time.Unix(point.Timestamp, 0).Format(time.RFC3339)
			writeMetricRow(w, "cpu_utilization", pointTS, fmt.Sprintf("%.4f", point.Value), "percent")
		}
	}

	if metrics.MemoryUtilization != nil {
		for _, point := range metrics.MemoryUtilization.History {
			pointTS := time.Unix(point.Timestamp, 0).Format(time.RFC3339)
			writeMetricRow(w, "memory_utilization", pointTS, fmt.Sprintf("%.4f", point.Value), "percent")
		}
	}

	if metrics.Nodes != nil {
		for _, node := range metrics.Nodes {
			writeMetricRow(w, fmt.Sprintf("node_%s_cpu", node.Name), ts, fmt.Sprintf("%.2f", node.CPUUsagePercent), "percent")
			writeMetricRow(w, fmt.Sprintf("node_%s_memory", node.Name), ts, fmt.Sprintf("%.2f", node.MemoryUsagePercent), "percent")
			writeMetricRow(w, fmt.Sprintf("node_%s_pods", node.Name), ts, fmt.Sprintf("%d", node.PodCount), "count")
		}
	}

	if metrics.Namespaces != nil {
		for _, ns := range metrics.Namespaces {
			writeMetricRow(w, fmt.Sprintf("namespace_%s_pods", ns.Name), ts, fmt.Sprintf("%d", ns.PodCount), "count")
			writeMetricRow(w, fmt.Sprintf("namespace_%s_cpu", ns.Name), ts, fmt.Sprintf("%.4f", ns.CPUUsage), "cores")
			writeMetricRow(w, fmt.Sprintf("namespace_%s_memory", ns.Name), ts, fmt.Sprintf("%.4f", ns.MemoryUsage), "bytes")
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("CSV flush error: %w", err)
	}

	return buf.Bytes(), nil
}

func writeMetricRow(w *csv.Writer, name, timestamp, value, unit string) {
	_ = w.Write([]string{name, timestamp, value, unit})
}

func formatMetricsPDF(metrics *domain.AggregatedMetrics, params domain.ExportParams) ([]byte, error) {
	pdf := fpdf.New("L", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 15)
	pdf.AddPage()

	// Title
	pdf.SetFont("Helvetica", "B", 18)
	pdf.Cell(0, 12, "Kleff Metrics Report")
	pdf.Ln(14)

	// Report metadata
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(100, 100, 100)
	pdf.Cell(0, 6, fmt.Sprintf("Generated: %s", time.Now().Format("2006-01-02 15:04:05 MST")))
	pdf.Ln(6)
	pdf.Cell(0, 6, fmt.Sprintf("Period: %s to %s", params.From.Format("2006-01-02 15:04"), params.To.Format("2006-01-02 15:04")))
	pdf.Ln(10)

	pdf.SetTextColor(0, 0, 0)

	// Cluster Overview
	if metrics.Overview != nil {
		pdf.SetFont("Helvetica", "B", 14)
		pdf.Cell(0, 10, "Cluster Overview")
		pdf.Ln(10)

		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetFillColor(240, 240, 240)
		headers := []string{"Metric", "Value"}
		widths := []float64{120, 80}
		for i, header := range headers {
			pdf.CellFormat(widths[i], 8, header, "1", 0, "C", true, 0, "")
		}
		pdf.Ln(-1)

		pdf.SetFont("Helvetica", "", 9)
		overviewRows := [][]string{
			{"Total Nodes", fmt.Sprintf("%d", metrics.Overview.TotalNodes)},
			{"Running Nodes", fmt.Sprintf("%d", metrics.Overview.RunningNodes)},
			{"Total Pods", fmt.Sprintf("%d", metrics.Overview.TotalPods)},
			{"Total Namespaces", fmt.Sprintf("%d", metrics.Overview.TotalNamespaces)},
			{"CPU Usage", fmt.Sprintf("%.1f%%", metrics.Overview.CPUUsagePercent)},
			{"Memory Usage", fmt.Sprintf("%.1f%%", metrics.Overview.MemoryUsagePercent)},
			{"Uptime", metrics.Overview.UptimeFormatted},
		}
		for _, row := range overviewRows {
			pdf.CellFormat(widths[0], 7, row[0], "1", 0, "L", false, 0, "")
			pdf.CellFormat(widths[1], 7, row[1], "1", 0, "L", false, 0, "")
			pdf.Ln(-1)
		}
		pdf.Ln(8)
	}

	// Nodes table
	if len(metrics.Nodes) > 0 {
		pdf.SetFont("Helvetica", "B", 14)
		pdf.Cell(0, 10, "Nodes")
		pdf.Ln(10)

		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetFillColor(240, 240, 240)
		nodeHeaders := []string{"Node Name", "CPU %", "Memory %", "Pods", "Status", "Uptime"}
		nodeWidths := []float64{60, 35, 35, 30, 35, 60}
		for i, header := range nodeHeaders {
			pdf.CellFormat(nodeWidths[i], 8, header, "1", 0, "C", true, 0, "")
		}
		pdf.Ln(-1)

		pdf.SetFont("Helvetica", "", 9)
		for _, node := range metrics.Nodes {
			pdf.CellFormat(nodeWidths[0], 7, node.Name, "1", 0, "L", false, 0, "")
			pdf.CellFormat(nodeWidths[1], 7, fmt.Sprintf("%.1f%%", node.CPUUsagePercent), "1", 0, "R", false, 0, "")
			pdf.CellFormat(nodeWidths[2], 7, fmt.Sprintf("%.1f%%", node.MemoryUsagePercent), "1", 0, "R", false, 0, "")
			pdf.CellFormat(nodeWidths[3], 7, fmt.Sprintf("%d", node.PodCount), "1", 0, "R", false, 0, "")
			pdf.CellFormat(nodeWidths[4], 7, node.Status, "1", 0, "C", false, 0, "")
			pdf.CellFormat(nodeWidths[5], 7, node.UptimeFormatted, "1", 0, "L", false, 0, "")
			pdf.Ln(-1)
		}
		pdf.Ln(8)
	}

	// Namespaces table
	if len(metrics.Namespaces) > 0 {
		pdf.SetFont("Helvetica", "B", 14)
		pdf.Cell(0, 10, "Namespaces")
		pdf.Ln(10)

		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetFillColor(240, 240, 240)
		nsHeaders := []string{"Namespace", "Pods", "CPU (cores)", "Memory (bytes)"}
		nsWidths := []float64{80, 40, 50, 60}
		for i, header := range nsHeaders {
			pdf.CellFormat(nsWidths[i], 8, header, "1", 0, "C", true, 0, "")
		}
		pdf.Ln(-1)

		pdf.SetFont("Helvetica", "", 9)
		for _, ns := range metrics.Namespaces {
			pdf.CellFormat(nsWidths[0], 7, ns.Name, "1", 0, "L", false, 0, "")
			pdf.CellFormat(nsWidths[1], 7, fmt.Sprintf("%d", ns.PodCount), "1", 0, "R", false, 0, "")
			pdf.CellFormat(nsWidths[2], 7, fmt.Sprintf("%.4f", ns.CPUUsage), "1", 0, "R", false, 0, "")
			pdf.CellFormat(nsWidths[3], 7, fmt.Sprintf("%.2f", ns.MemoryUsage), "1", 0, "R", false, 0, "")
			pdf.Ln(-1)
		}
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func detectLogLevel(logLine string) string {
	lower := strings.ToLower(logLine)
	switch {
	case strings.Contains(lower, "fatal"):
		return "FATAL"
	case strings.Contains(lower, "error") || strings.Contains(lower, "exception"):
		return "ERROR"
	case strings.Contains(lower, "warn") || strings.Contains(lower, "warning"):
		return "WARN"
	case strings.Contains(lower, "debug"):
		return "DEBUG"
	case strings.Contains(lower, "trace"):
		return "TRACE"
	default:
		return "INFO"
	}
}

func formatNanoTimestamp(nanoStr string) string {
	nanos, err := strconv.ParseInt(nanoStr, 10, 64)
	if err != nil {
		return nanoStr
	}
	t := time.Unix(0, nanos)
	return t.Format(time.RFC3339)
}

func formatDuration(d time.Duration) string {
	if d <= 0 {
		return "1h"
	}
	hours := int(d.Hours())
	minutes := int(d.Minutes()) % 60

	if hours >= 24 {
		days := hours / 24
		return fmt.Sprintf("%dh", days*24)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh", hours)
	}
	if minutes > 0 {
		return fmt.Sprintf("%dm", minutes)
	}
	return "1h"
}
