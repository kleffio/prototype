package prometheus

import (
	"context"
	"fmt"
	"strings"

	"prometheus-metrics-api/internal/core/domain"
)

func (c *prometheusClient) GetInsightNamespaces(ctx context.Context) ([]string, error) {
	resp, err := c.queryPrometheus(ctx, `sum by (namespace) (kube_pod_info{namespace!=""})`)
	if err != nil {
		return nil, err
	}

	namespaces := make([]string, 0, len(resp.Data.Result))
	seen := map[string]struct{}{}
	for _, result := range resp.Data.Result {
		namespace := strings.TrimSpace(result.Metric["namespace"])
		if namespace == "" {
			continue
		}
		if _, ok := seen[namespace]; ok {
			continue
		}
		seen[namespace] = struct{}{}
		namespaces = append(namespaces, namespace)
	}

	return namespaces, nil
}

func (c *prometheusClient) GetCPUUsageSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error) {
	query := `sum by (namespace) (rate(container_cpu_usage_seconds_total{namespace!="",container!="",container!="POD"}[5m]))`
	return c.querySeriesByNamespace(ctx, query, duration)
}

func (c *prometheusClient) GetMemoryUsageSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error) {
	query := `sum by (namespace) (container_memory_working_set_bytes{namespace!="",container!="",container!="POD"})`
	return c.querySeriesByNamespace(ctx, query, duration)
}

func (c *prometheusClient) GetRequestRateSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error) {
	query := `sum by (namespace) (rate(http_requests_total{namespace!=""}[5m]))`
	return c.querySeriesByNamespace(ctx, query, duration)
}

func (c *prometheusClient) GetErrorRateSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error) {
	query := `sum by (namespace) (rate(http_requests_total{namespace!="",status=~"5.."}[5m]))`
	return c.querySeriesByNamespace(ctx, query, duration)
}

func (c *prometheusClient) GetNetworkIOSeriesByNamespace(ctx context.Context, duration string) (map[string][]domain.TimeSeriesDataPoint, error) {
	query := `sum by (namespace) (rate(container_network_receive_bytes_total{namespace!=""}[5m]) + rate(container_network_transmit_bytes_total{namespace!=""}[5m]))`
	return c.querySeriesByNamespace(ctx, query, duration)
}

func (c *prometheusClient) GetCPURequestsByNamespace(ctx context.Context) (map[string]float64, error) {
	query := `sum by (namespace) (kube_pod_container_resource_requests{resource="cpu",unit="core",namespace!=""})`
	return c.queryInstantByNamespace(ctx, query)
}

func (c *prometheusClient) GetMemoryRequestsByNamespace(ctx context.Context) (map[string]float64, error) {
	query := `sum by (namespace) (kube_pod_container_resource_requests{resource="memory",unit="byte",namespace!=""})`
	return c.queryInstantByNamespace(ctx, query)
}

func (c *prometheusClient) GetRestartCountByNamespace(ctx context.Context, duration string) (map[string]float64, error) {
	query := fmt.Sprintf(`sum by (namespace) (increase(kube_pod_container_status_restarts_total{namespace!=""}[%s]))`, duration)
	return c.queryInstantByNamespace(ctx, query)
}

func (c *prometheusClient) querySeriesByNamespace(ctx context.Context, query, duration string) (map[string][]domain.TimeSeriesDataPoint, error) {
	resp, err := c.queryPrometheusRange(ctx, query, duration)
	if err != nil {
		return nil, err
	}

	result := make(map[string][]domain.TimeSeriesDataPoint, len(resp.Data.Result))
	for _, item := range resp.Data.Result {
		namespace := strings.TrimSpace(item.Metric["namespace"])
		if namespace == "" {
			continue
		}
		result[namespace] = extractTimeSeries(item.Values)
	}
	return result, nil
}

func (c *prometheusClient) queryInstantByNamespace(ctx context.Context, query string) (map[string]float64, error) {
	resp, err := c.queryPrometheus(ctx, query)
	if err != nil {
		return nil, err
	}

	result := make(map[string]float64, len(resp.Data.Result))
	for _, item := range resp.Data.Result {
		namespace := strings.TrimSpace(item.Metric["namespace"])
		if namespace == "" {
			continue
		}

		value, err := extractValue(item.Value)
		if err != nil {
			continue
		}
		result[namespace] = value
	}

	return result, nil
}
