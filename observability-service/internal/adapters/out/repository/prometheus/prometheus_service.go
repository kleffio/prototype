package prometheus

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"prometheus-metrics-api/internal/core/domain"
)

func (c *prometheusClient) GetClusterOverview(ctx context.Context) (*domain.ClusterOverview, error) {
	overview := &domain.ClusterOverview{}

	resp, err := c.queryPrometheus(ctx, `count(kube_node_info)`)
	if err == nil && len(resp.Data.Result) > 0 {
		if val, err := extractValue(resp.Data.Result[0].Value); err == nil {
			overview.TotalNodes = int(val)
		}
	}

	resp, err = c.queryPrometheus(ctx, `count(kube_node_info{condition="Ready"})`)
	if err == nil && len(resp.Data.Result) > 0 {
		if val, err := extractValue(resp.Data.Result[0].Value); err == nil {
			overview.RunningNodes = int(val)
		}
	}

	resp, err = c.queryPrometheus(ctx, `count(kube_pod_info)`)
	if err == nil && len(resp.Data.Result) > 0 {
		if val, err := extractValue(resp.Data.Result[0].Value); err == nil {
			overview.TotalPods = int(val)
		}
	}

	resp, err = c.queryPrometheus(ctx, `count(count by (namespace) (kube_pod_info))`)
	if err == nil && len(resp.Data.Result) > 0 {
		if val, err := extractValue(resp.Data.Result[0].Value); err == nil {
			overview.TotalNamespaces = int(val)
		}
	}

	resp, err = c.queryPrometheus(ctx, `sum(rate(container_cpu_usage_seconds_total[5m])) / sum(machine_cpu_cores) * 100`)
	if err == nil && len(resp.Data.Result) > 0 {
		if val, err := extractValue(resp.Data.Result[0].Value); err == nil {
			overview.CPUUsagePercent = val
		}
	}

	resp, err = c.queryPrometheus(ctx, `sum(container_memory_usage_bytes) / sum(machine_memory_bytes) * 100`)
	if err == nil && len(resp.Data.Result) > 0 {
		if val, err := extractValue(resp.Data.Result[0].Value); err == nil {
			overview.MemoryUsagePercent = val
		}
	}

	resp, err = c.queryPrometheus(ctx, `min(time() - node_boot_time_seconds)`)
	if err == nil && len(resp.Data.Result) > 0 {
		if val, err := extractValue(resp.Data.Result[0].Value); err == nil {
			overview.UptimeSeconds = val
			overview.UptimeFormatted = formatUptime(val)
		}
	}

	return overview, nil
}

func (c *prometheusClient) GetRequestsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	currentQuery := `sum(rate(http_requests_total[5m]))`
	resp, err := c.queryPrometheus(ctx, currentQuery)
	if err != nil {
		return nil, err
	}

	var current float64
	if len(resp.Data.Result) > 0 {
		current, _ = extractValue(resp.Data.Result[0].Value)
	}

	sparklineQuery := `sum(rate(http_requests_total[5m]))`
	sparkResp, err := c.queryPrometheusRange(ctx, sparklineQuery, duration)
	if err != nil {
		return nil, err
	}

	var sparkline []domain.TimeSeriesDataPoint
	if len(sparkResp.Data.Result) > 0 {
		sparkline = extractTimeSeries(sparkResp.Data.Result[0].Values)
	}

	var changePercent float64
	if len(sparkline) > 1 {
		previous := sparkline[0].Value
		changePercent = calculateChangePercent(current, previous)
	}

	return &domain.MetricCard{
		Title:         "HTTP Requests",
		Value:         fmt.Sprintf("%.0f req/s", current),
		RawValue:      current,
		ChangePercent: fmt.Sprintf("%+.1f%%", changePercent),
		ChangeLabel:   "vs " + duration + " ago",
		Status:        determineStatus(current, 1000, 5000),
		Sparkline:     sparkline,
	}, nil
}

func (c *prometheusClient) GetPodsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	currentQuery := `count(kube_pod_info)`
	resp, err := c.queryPrometheus(ctx, currentQuery)
	if err != nil {
		return nil, err
	}

	var current float64
	if len(resp.Data.Result) > 0 {
		current, _ = extractValue(resp.Data.Result[0].Value)
	}

	sparklineQuery := `count(kube_pod_info)`
	sparkResp, err := c.queryPrometheusRange(ctx, sparklineQuery, duration)
	if err != nil {
		return nil, err
	}

	var sparkline []domain.TimeSeriesDataPoint
	if len(sparkResp.Data.Result) > 0 {
		sparkline = extractTimeSeries(sparkResp.Data.Result[0].Values)
	}

	var changePercent float64
	if len(sparkline) > 1 {
		previous := sparkline[0].Value
		changePercent = calculateChangePercent(current, previous)
	}

	return &domain.MetricCard{
		Title:         "Total Pods",
		Value:         fmt.Sprintf("%.0f", current),
		RawValue:      current,
		ChangePercent: fmt.Sprintf("%+.1f%%", changePercent),
		ChangeLabel:   "vs " + duration + " ago",
		Status:        determineStatus(current, 100, 500),
		Sparkline:     sparkline,
	}, nil
}

func (c *prometheusClient) GetNodesMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	currentQuery := `count(kube_node_info)`
	resp, err := c.queryPrometheus(ctx, currentQuery)
	if err != nil {
		return nil, err
	}

	var current float64
	if len(resp.Data.Result) > 0 {
		current, _ = extractValue(resp.Data.Result[0].Value)
	}

	sparklineQuery := `count(kube_node_info)`
	sparkResp, err := c.queryPrometheusRange(ctx, sparklineQuery, duration)
	if err != nil {
		return nil, err
	}

	var sparkline []domain.TimeSeriesDataPoint
	if len(sparkResp.Data.Result) > 0 {
		sparkline = extractTimeSeries(sparkResp.Data.Result[0].Values)
	}

	var changePercent float64
	if len(sparkline) > 1 {
		previous := sparkline[0].Value
		changePercent = calculateChangePercent(current, previous)
	}

	return &domain.MetricCard{
		Title:         "Cluster Nodes",
		Value:         fmt.Sprintf("%.0f", current),
		RawValue:      current,
		ChangePercent: fmt.Sprintf("%+.1f%%", changePercent),
		ChangeLabel:   "vs " + duration + " ago",
		Status:        "good",
		Sparkline:     sparkline,
	}, nil
}

func (c *prometheusClient) GetTenantsMetric(ctx context.Context, duration string) (*domain.MetricCard, error) {
	currentQuery := `count(count by (tenant) (kube_pod_info))`
	resp, err := c.queryPrometheus(ctx, currentQuery)
	if err != nil {
		return nil, err
	}

	var current float64
	if len(resp.Data.Result) > 0 {
		current, _ = extractValue(resp.Data.Result[0].Value)
	}

	sparklineQuery := `count(count by (tenant) (kube_pod_info))`
	sparkResp, err := c.queryPrometheusRange(ctx, sparklineQuery, duration)
	if err != nil {
		return nil, err
	}

	var sparkline []domain.TimeSeriesDataPoint
	if len(sparkResp.Data.Result) > 0 {
		sparkline = extractTimeSeries(sparkResp.Data.Result[0].Values)
	}

	var changePercent float64
	if len(sparkline) > 1 {
		previous := sparkline[0].Value
		changePercent = calculateChangePercent(current, previous)
	}

	return &domain.MetricCard{
		Title:         "Active Tenants",
		Value:         fmt.Sprintf("%.0f", current),
		RawValue:      current,
		ChangePercent: fmt.Sprintf("%+.1f%%", changePercent),
		ChangeLabel:   "vs " + duration + " ago",
		Status:        "excellent",
		Sparkline:     sparkline,
	}, nil
}

func (c *prometheusClient) GetCPUUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
	currentQuery := `sum(rate(container_cpu_usage_seconds_total[5m])) / sum(machine_cpu_cores) * 100`
	resp, err := c.queryPrometheus(ctx, currentQuery)
	if err != nil {
		return nil, err
	}

	var current float64
	if len(resp.Data.Result) > 0 {
		current, _ = extractValue(resp.Data.Result[0].Value)
	}

	historyQuery := `sum(rate(container_cpu_usage_seconds_total[5m])) / sum(machine_cpu_cores) * 100`
	histResp, err := c.queryPrometheusRange(ctx, historyQuery, duration)
	if err != nil {
		return nil, err
	}

	var history []domain.TimeSeriesDataPoint
	if len(histResp.Data.Result) > 0 {
		history = extractTimeSeries(histResp.Data.Result[0].Values)
	}

	var changePercent float64
	trend := "stable"
	if len(history) > 1 {
		previous := history[0].Value
		changePercent = calculateChangePercent(current, previous)

		if changePercent > 5 {
			trend = "up"
		} else if changePercent < -5 {
			trend = "down"
		}
	}

	return &domain.ResourceUtilization{
		CurrentValue:  current,
		ChangePercent: changePercent,
		Trend:         trend,
		History:       history,
	}, nil
}

func (c *prometheusClient) GetMemoryUtilization(ctx context.Context, duration string) (*domain.ResourceUtilization, error) {
	currentQuery := `sum(container_memory_usage_bytes) / sum(machine_memory_bytes) * 100`
	resp, err := c.queryPrometheus(ctx, currentQuery)
	if err != nil {
		return nil, err
	}

	var current float64
	if len(resp.Data.Result) > 0 {
		current, _ = extractValue(resp.Data.Result[0].Value)
	}

	historyQuery := `sum(container_memory_usage_bytes) / sum(machine_memory_bytes) * 100`
	histResp, err := c.queryPrometheusRange(ctx, historyQuery, duration)
	if err != nil {
		return nil, err
	}

	var history []domain.TimeSeriesDataPoint
	if len(histResp.Data.Result) > 0 {
		history = extractTimeSeries(histResp.Data.Result[0].Values)
	}

	var changePercent float64
	trend := "stable"
	if len(history) > 1 {
		previous := history[0].Value
		changePercent = calculateChangePercent(current, previous)

		if changePercent > 5 {
			trend = "up"
		} else if changePercent < -5 {
			trend = "down"
		}
	}

	return &domain.ResourceUtilization{
		CurrentValue:  current,
		ChangePercent: changePercent,
		Trend:         trend,
		History:       history,
	}, nil
}

func (c *prometheusClient) GetNodes(ctx context.Context) ([]domain.NodeMetric, error) {
	query := `kube_node_info`
	resp, err := c.queryPrometheus(ctx, query)
	if err != nil {
		return nil, err
	}

	nodes := make([]domain.NodeMetric, 0)

	for _, result := range resp.Data.Result {
		nodeName := result.Metric["node"]

		cpuQuery := fmt.Sprintf(`sum(rate(container_cpu_usage_seconds_total{node="%s"}[5m])) / sum(machine_cpu_cores{node="%s"}) * 100`, nodeName, nodeName)
		cpuResp, _ := c.queryPrometheus(ctx, cpuQuery)
		var cpuUsage float64
		if len(cpuResp.Data.Result) > 0 {
			cpuUsage, _ = extractValue(cpuResp.Data.Result[0].Value)
		}

		memQuery := fmt.Sprintf(`sum(container_memory_usage_bytes{node="%s"}) / sum(machine_memory_bytes{node="%s"}) * 100`, nodeName, nodeName)
		memResp, _ := c.queryPrometheus(ctx, memQuery)
		var memUsage float64
		if len(memResp.Data.Result) > 0 {
			memUsage, _ = extractValue(memResp.Data.Result[0].Value)
		}

		podQuery := fmt.Sprintf(`count(kube_pod_info{node="%s"})`, nodeName)
		podResp, _ := c.queryPrometheus(ctx, podQuery)
		var podCount int
		if len(podResp.Data.Result) > 0 {
			if val, err := extractValue(podResp.Data.Result[0].Value); err == nil {
				podCount = int(val)
			}
		}

		uptimeQuery := fmt.Sprintf(`time() - node_boot_time_seconds{instance=~".*%s.*"}`, nodeName)
		uptimeResp, _ := c.queryPrometheus(ctx, uptimeQuery)
		var uptimeSeconds float64
		var uptimeFormatted string
		if len(uptimeResp.Data.Result) > 0 {
			if uptime, err := extractValue(uptimeResp.Data.Result[0].Value); err == nil {
				uptimeSeconds = uptime
				uptimeFormatted = formatUptime(uptime)
			}
		}

		nodes = append(nodes, domain.NodeMetric{
			Name:               nodeName,
			CPUUsagePercent:    cpuUsage,
			MemoryUsagePercent: memUsage,
			PodCount:           podCount,
			Status:             "Ready",
			UptimeSeconds:      uptimeSeconds,
			UptimeFormatted:    uptimeFormatted,
		})
	}

	return nodes, nil
}

func (c *prometheusClient) GetNamespaces(ctx context.Context) ([]domain.NamespaceMetric, error) {
	query := `count by (namespace) (kube_pod_info)`
	resp, err := c.queryPrometheus(ctx, query)
	if err != nil {
		return nil, err
	}

	namespaces := make([]domain.NamespaceMetric, 0)

	for _, result := range resp.Data.Result {
		namespace := result.Metric["namespace"]

		podCount, _ := extractValue(result.Value)

		cpuQuery := fmt.Sprintf(`sum(rate(container_cpu_usage_seconds_total{namespace="%s"}[5m]))`, namespace)
		cpuResp, _ := c.queryPrometheus(ctx, cpuQuery)
		var cpuUsage float64
		if len(cpuResp.Data.Result) > 0 {
			cpuUsage, _ = extractValue(cpuResp.Data.Result[0].Value)
		}

		memQuery := fmt.Sprintf(`sum(container_memory_usage_bytes{namespace="%s"})`, namespace)
		memResp, _ := c.queryPrometheus(ctx, memQuery)
		var memUsage float64
		if len(memResp.Data.Result) > 0 {
			memUsage, _ = extractValue(memResp.Data.Result[0].Value)
		}

		namespaces = append(namespaces, domain.NamespaceMetric{
			Name:        namespace,
			PodCount:    int(podCount),
			CPUUsage:    cpuUsage,
			MemoryUsage: memUsage,
		})
	}

	return namespaces, nil
}

func (c *prometheusClient) GetDatabaseIOMetrics(ctx context.Context, duration string, namespaces []string) (*domain.DatabaseMetrics, error) {
	metrics := &domain.DatabaseMetrics{
		Source: "Prometheus",
	}

	// Determine namespace filter
	// If specific namespaces are provided, filter only those.
	// Otherwise, exclude system namespaces.
	namespaceFilter := `namespace!~"kube-system|monitoring|ingress-nginx|local-path-storage"`
	if len(namespaces) > 0 {
		namespaceFilter = fmt.Sprintf(`namespace=~"%s"`, strings.Join(namespaces, "|"))
	}

	// Helper to format query
	formatQuery := func(metric string) string {
		return fmt.Sprintf(`sum(rate(%s{container!="", container!="POD", %s}[5m]))`, metric, namespaceFilter)
	}

	// Disk Read Bytes
	if resp, err := c.queryPrometheus(ctx, formatQuery("container_fs_reads_bytes_total")); err == nil && len(resp.Data.Result) > 0 {
		metrics.DiskReadBytesPerSec, _ = extractValue(resp.Data.Result[0].Value)
	}

	// Disk Write Bytes
	if resp, err := c.queryPrometheus(ctx, formatQuery("container_fs_writes_bytes_total")); err == nil && len(resp.Data.Result) > 0 {
		metrics.DiskWriteBytesPerSec, _ = extractValue(resp.Data.Result[0].Value)
	}

	// Network Receive
	if resp, err := c.queryPrometheus(ctx, formatQuery("container_network_receive_bytes_total")); err == nil && len(resp.Data.Result) > 0 {
		metrics.NetworkReceiveBytesPerSec, _ = extractValue(resp.Data.Result[0].Value)
	}

	// Network Transmit
	if resp, err := c.queryPrometheus(ctx, formatQuery("container_network_transmit_bytes_total")); err == nil && len(resp.Data.Result) > 0 {
		metrics.NetworkTransmitBytesPerSec, _ = extractValue(resp.Data.Result[0].Value)
	}

	// History Queries (Range)

	if resp, err := c.queryPrometheusRange(ctx, formatQuery("container_fs_reads_bytes_total"), duration); err == nil && len(resp.Data.Result) > 0 {
		metrics.DiskReadHistory = extractTimeSeries(resp.Data.Result[0].Values)
	}

	if resp, err := c.queryPrometheusRange(ctx, formatQuery("container_fs_writes_bytes_total"), duration); err == nil && len(resp.Data.Result) > 0 {
		metrics.DiskWriteHistory = extractTimeSeries(resp.Data.Result[0].Values)
	}

	if resp, err := c.queryPrometheusRange(ctx, formatQuery("container_network_receive_bytes_total"), duration); err == nil && len(resp.Data.Result) > 0 {
		metrics.NetworkReceiveHistory = extractTimeSeries(resp.Data.Result[0].Values)
	}

	if resp, err := c.queryPrometheusRange(ctx, formatQuery("container_network_transmit_bytes_total"), duration); err == nil && len(resp.Data.Result) > 0 {
		metrics.NetworkTransmitHistory = extractTimeSeries(resp.Data.Result[0].Values)
	}

	return metrics, nil
}

func (c *prometheusClient) GetProjectUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectUsageMetrics, error) {
	metrics := &domain.ProjectUsageMetrics{
		ProjectID: projectID,
		Window:    "current",
	}

	// Real-time Memory: Current Working Set
	memoryQuery := fmt.Sprintf(`sum(container_memory_working_set_bytes{namespace="%s", container!="", container!="POD"}) / (1024^3)`, projectID)
	if resp, err := c.queryPrometheus(ctx, memoryQuery); err == nil && len(resp.Data.Result) > 0 {
		metrics.MemoryUsageGB, _ = extractValue(resp.Data.Result[0].Value)
	}

	// Real-time CPU: Rate over last 5 minutes
	cpuQuery := fmt.Sprintf(`sum(rate(container_cpu_usage_seconds_total{namespace="%s", container!="", container!="POD"}[5m]))`, projectID)
	if resp, err := c.queryPrometheus(ctx, cpuQuery); err == nil && len(resp.Data.Result) > 0 {
		metrics.CPURequestCores, _ = extractValue(resp.Data.Result[0].Value)
	}

	// Real-time Network Receive: Rate over last 5 minutes
	netRxQuery := fmt.Sprintf(`sum(rate(container_network_receive_bytes_total{namespace="%s", container!="", container!="POD"}[5m]))`, projectID)
	if resp, err := c.queryPrometheus(ctx, netRxQuery); err == nil && len(resp.Data.Result) > 0 {
		metrics.NetworkReceiveBytesPerSec, _ = extractValue(resp.Data.Result[0].Value)
	}

	// Real-time Network Transmit: Rate over last 5 minutes
	netTxQuery := fmt.Sprintf(`sum(rate(container_network_transmit_bytes_total{namespace="%s", container!="", container!="POD"}[5m]))`, projectID)
	if resp, err := c.queryPrometheus(ctx, netTxQuery); err == nil && len(resp.Data.Result) > 0 {
		metrics.NetworkTransmitBytesPerSec, _ = extractValue(resp.Data.Result[0].Value)
	}

	// Real-time Disk Read: Rate over last 5 minutes
	diskReadQuery := fmt.Sprintf(`sum(rate(container_fs_reads_bytes_total{namespace="%s", container!="", container!="POD"}[5m]))`, projectID)
	if resp, err := c.queryPrometheus(ctx, diskReadQuery); err == nil && len(resp.Data.Result) > 0 {
		metrics.DiskReadBytesPerSec, _ = extractValue(resp.Data.Result[0].Value)
	}

	// Real-time Disk Write: Rate over last 5 minutes
	diskWriteQuery := fmt.Sprintf(`sum(rate(container_fs_writes_bytes_total{namespace="%s", container!="", container!="POD"}[5m]))`, projectID)
	if resp, err := c.queryPrometheus(ctx, diskWriteQuery); err == nil && len(resp.Data.Result) > 0 {
		metrics.DiskWriteBytesPerSec, _ = extractValue(resp.Data.Result[0].Value)
	}

	return metrics, nil
}

func (c *prometheusClient) GetProjectUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectUsageMetrics, error) {
	metrics := &domain.ProjectUsageMetrics{
		ProjectID: projectID,
		Window:    fmt.Sprintf("%dd", days),
	}

	// Memory query: sum(avg_over_time(container_memory_working_set_bytes{namespace="%s", container!="", container!="POD"}[%dd])) / (1024^3)
	memoryQuery := fmt.Sprintf(`sum(avg_over_time(container_memory_working_set_bytes{namespace="%s", container!="", container!="POD"}[%dd])) / (1024^3)`, projectID, days)
	memoryResp, err := c.queryPrometheus(ctx, memoryQuery)
	if err == nil && len(memoryResp.Data.Result) > 0 {
		if val, err := extractValue(memoryResp.Data.Result[0].Value); err == nil {
			metrics.MemoryUsageGB = val
		}
	}
	// If no data, MemoryUsageGB remains 0.0

	// CPU query: sum(avg_over_time(rate(container_cpu_usage_seconds_total{namespace="%s", container!="", container!="POD"}[5m])[%dd:1m]))
	cpuQuery := fmt.Sprintf(`sum(avg_over_time(rate(container_cpu_usage_seconds_total{namespace="%s", container!="", container!="POD"}[5m])[%dd:1m]))`, projectID, days)
	cpuResp, err := c.queryPrometheus(ctx, cpuQuery)
	if err == nil && len(cpuResp.Data.Result) > 0 {
		if val, err := extractValue(cpuResp.Data.Result[0].Value); err == nil {
			metrics.CPURequestCores = val
		}
	}
	// If no data, CPURequestCores remains 0.0

	// Network Receive query
	netRxQuery := fmt.Sprintf(`sum(avg_over_time(rate(container_network_receive_bytes_total{namespace="%s"}[5m])[%dd:1m]))`, projectID, days)
	netRxResp, err := c.queryPrometheus(ctx, netRxQuery)
	if err == nil && len(netRxResp.Data.Result) > 0 {
		if val, err := extractValue(netRxResp.Data.Result[0].Value); err == nil {
			metrics.NetworkReceiveBytesPerSec = val
		}
	}

	// Network Transmit query
	netTxQuery := fmt.Sprintf(`sum(avg_over_time(rate(container_network_transmit_bytes_total{namespace="%s"}[5m])[%dd:1m]))`, projectID, days)
	netTxResp, err := c.queryPrometheus(ctx, netTxQuery)
	if err == nil && len(netTxResp.Data.Result) > 0 {
		if val, err := extractValue(netTxResp.Data.Result[0].Value); err == nil {
			metrics.NetworkTransmitBytesPerSec = val
		}
	}

	// Disk Read query
	diskReadQuery := fmt.Sprintf(`sum(avg_over_time(rate(container_fs_reads_bytes_total{namespace="%s"}[5m])[%dd:1m]))`, projectID, days)
	diskReadResp, err := c.queryPrometheus(ctx, diskReadQuery)
	if err == nil && len(diskReadResp.Data.Result) > 0 {
		if val, err := extractValue(diskReadResp.Data.Result[0].Value); err == nil {
			metrics.DiskReadBytesPerSec = val
		}
	}

	// Disk Write query
	diskWriteQuery := fmt.Sprintf(`sum(avg_over_time(rate(container_fs_writes_bytes_total{namespace="%s"}[5m])[%dd:1m]))`, projectID, days)
	diskWriteResp, err := c.queryPrometheus(ctx, diskWriteQuery)
	if err == nil && len(diskWriteResp.Data.Result) > 0 {
		if val, err := extractValue(diskWriteResp.Data.Result[0].Value); err == nil {
			metrics.DiskWriteBytesPerSec = val
		}
	}

	return metrics, nil
}

func (c *prometheusClient) GetProjectTotalUsageMetrics(ctx context.Context, projectID string) (*domain.ProjectTotalUsageMetrics, error) {
	return c.GetProjectTotalUsageMetricsWithDays(ctx, projectID, 30)
}

func (c *prometheusClient) GetProjectTotalUsageMetricsWithDays(ctx context.Context, projectID string, days int) (*domain.ProjectTotalUsageMetrics, error) {
	metrics := &domain.ProjectTotalUsageMetrics{
		ProjectID: projectID,
		Window:    "total",
	}

	cpuQuery := fmt.Sprintf(`sum(container_cpu_usage_seconds_total{namespace="%s", container!="", container!="POD"}) / 3600`, projectID)
	cpuResp, err := c.queryPrometheus(ctx, cpuQuery)
	if err == nil && len(cpuResp.Data.Result) > 0 {
		if val, err := extractValue(cpuResp.Data.Result[0].Value); err == nil {
			metrics.CPUHours = val
		}
	}

	memoryQuery := fmt.Sprintf(`sum(avg_over_time(container_memory_working_set_bytes{namespace="%s", container!="", container!="POD"}[:])) * (time() - min(container_start_time_seconds{namespace="%s", container!="", container!="POD"})) / 3600 / 1024^3`, projectID, projectID)
	memoryResp, err := c.queryPrometheus(ctx, memoryQuery)
	if err == nil && len(memoryResp.Data.Result) > 0 {
		if val, err := extractValue(memoryResp.Data.Result[0].Value); err == nil {
			metrics.MemoryGBHours = val
		}
	}

	return metrics, nil
}

func (c *prometheusClient) GetSystemUptime(ctx context.Context) (float64, error) {
	query := `time() - node_boot_time_seconds`
	resp, err := c.queryPrometheus(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to query system uptime: %w", err)
	}

	if len(resp.Data.Result) == 0 {
		return 0, fmt.Errorf("no uptime data available")
	}

	uptime, err := extractValue(resp.Data.Result[0].Value)
	if err != nil {
		return 0, fmt.Errorf("failed to extract uptime value: %w", err)
	}

	return uptime, nil
}

func (c *prometheusClient) GetUptimeMetrics(ctx context.Context, duration string) (*domain.UptimeMetrics, error) {
	metrics := &domain.UptimeMetrics{
		NodeUptimes: make([]domain.NodeUptimeMetric, 0),
	}

	systemUptimeQuery := `min(time() - node_boot_time_seconds)`
	resp, err := c.queryPrometheus(ctx, systemUptimeQuery)
	if err == nil && len(resp.Data.Result) > 0 {
		if uptime, err := extractValue(resp.Data.Result[0].Value); err == nil {
			metrics.SystemUptimeSeconds = uptime
			metrics.SystemUptimeFormatted = formatUptime(uptime)
		}
	}

	nodeUptimeQuery := `time() - node_boot_time_seconds`
	nodeResp, err := c.queryPrometheus(ctx, nodeUptimeQuery)
	if err == nil {
		totalUptime := 0.0
		for _, result := range nodeResp.Data.Result {
			nodeName := result.Metric["instance"]
			if nodeName == "" {
				nodeName = result.Metric["node"]
			}

			uptime, err := extractValue(result.Value)
			if err != nil {
				continue
			}

			bootTime := time.Now().Unix() - int64(uptime)

			nodeMetric := domain.NodeUptimeMetric{
				NodeName:         nodeName,
				UptimeSeconds:    uptime,
				UptimeFormatted:  formatUptime(uptime),
				BootTimestamp:    bootTime,
				BootTimeReadable: time.Unix(bootTime, 0).Format("2006-01-02 15:04:05 MST"),
			}

			metrics.NodeUptimes = append(metrics.NodeUptimes, nodeMetric)
			totalUptime += uptime
		}

		if len(metrics.NodeUptimes) > 0 {
			metrics.AverageUptimeSeconds = totalUptime / float64(len(metrics.NodeUptimes))
			metrics.AverageUptimeFormatted = formatUptime(metrics.AverageUptimeSeconds)
		}
	}

	historyQuery := `min(time() - node_boot_time_seconds)`
	histResp, err := c.queryPrometheusRange(ctx, historyQuery, duration)
	if err == nil && len(histResp.Data.Result) > 0 {
		metrics.UptimeHistory = extractTimeSeries(histResp.Data.Result[0].Values)
	}

	return metrics, nil
}

func (c *prometheusClient) GetAllMetrics(ctx context.Context, duration string) (*domain.AggregatedMetrics, error) {
	result := &domain.AggregatedMetrics{}

	var wg sync.WaitGroup
	var mu sync.Mutex
	errors := make([]error, 0)

	addError := func(err error) {
		if err != nil {
			mu.Lock()
			errors = append(errors, err)
			mu.Unlock()
		}
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		overview, err := c.GetClusterOverview(ctx)
		if err != nil {
			addError(fmt.Errorf("GetClusterOverview: %w", err))
		} else {
			mu.Lock()
			result.Overview = overview
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		uptime, err := c.GetSystemUptime(ctx)
		if err != nil {
			addError(fmt.Errorf("GetSystemUptime: %w", err))
		} else {
			mu.Lock()
			result.SystemUptime = uptime
			result.SystemUptimeFormatted = formatUptime(uptime)
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		nodes, err := c.GetNodes(ctx)
		if err != nil {
			addError(fmt.Errorf("GetNodes: %w", err))
		} else {
			mu.Lock()
			result.Nodes = nodes
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		namespaces, err := c.GetNamespaces(ctx)
		if err != nil {
			addError(fmt.Errorf("GetNamespaces: %w", err))
		} else {
			mu.Lock()
			result.Namespaces = namespaces
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		metric, err := c.GetRequestsMetric(ctx, duration)
		if err != nil {
			addError(fmt.Errorf("GetRequestsMetric: %w", err))
		} else {
			mu.Lock()
			result.RequestsMetric = metric
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		metric, err := c.GetPodsMetric(ctx, duration)
		if err != nil {
			addError(fmt.Errorf("GetPodsMetric: %w", err))
		} else {
			mu.Lock()
			result.PodsMetric = metric
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		metric, err := c.GetNodesMetric(ctx, duration)
		if err != nil {
			addError(fmt.Errorf("GetNodesMetric: %w", err))
		} else {
			mu.Lock()
			result.NodesMetric = metric
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		metric, err := c.GetTenantsMetric(ctx, duration)
		if err != nil {
			addError(fmt.Errorf("GetTenantsMetric: %w", err))
		} else {
			mu.Lock()
			result.TenantsMetric = metric
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		utilization, err := c.GetCPUUtilization(ctx, duration)
		if err != nil {
			addError(fmt.Errorf("GetCPUUtilization: %w", err))
		} else {
			mu.Lock()
			result.CPUUtilization = utilization
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		utilization, err := c.GetMemoryUtilization(ctx, duration)
		if err != nil {
			addError(fmt.Errorf("GetMemoryUtilization: %w", err))
		} else {
			mu.Lock()
			result.MemoryUtilization = utilization
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		dbMetrics, err := c.GetDatabaseIOMetrics(ctx, duration, nil)
		if err != nil {
			addError(fmt.Errorf("GetDatabaseIOMetrics: %w", err))
		} else {
			mu.Lock()
			result.DatabaseIOMetrics = dbMetrics
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		uptimeMetrics, err := c.GetUptimeMetrics(ctx, duration)
		if err != nil {
			addError(fmt.Errorf("GetUptimeMetrics: %w", err))
		} else {
			mu.Lock()
			result.UptimeMetrics = uptimeMetrics
			mu.Unlock()
		}
	}()

	wg.Wait()

	return result, nil
}

func formatUptime(seconds float64) string {
	duration := time.Duration(seconds) * time.Second

	days := int(duration.Hours() / 24)
	hours := int(duration.Hours()) % 24
	minutes := int(duration.Minutes()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	} else if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	} else {
		return fmt.Sprintf("%dm", minutes)
	}
}
