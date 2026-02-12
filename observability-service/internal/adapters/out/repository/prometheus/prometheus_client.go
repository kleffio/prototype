package prometheus

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"
)

type prometheusClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewPrometheusClient(baseURL string) ports.MetricsRepository {
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		MaxConnsPerHost:     100,
		IdleConnTimeout:     90 * time.Second,

		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,

		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 20 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,

		DisableCompression: false,
		ForceAttemptHTTP2:  true,
	}

	return &prometheusClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout:   45 * time.Second,
			Transport: transport,
		},
	}
}

type PrometheusResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric map[string]string `json:"metric"`
			Value  []interface{}     `json:"value,omitempty"`
			Values [][]interface{}   `json:"values,omitempty"`
		} `json:"result"`
	} `json:"data"`
}

func (c *prometheusClient) queryPrometheus(ctx context.Context, query string) (*PrometheusResponse, error) {
	encodedQuery := url.QueryEscape(query)
	apiURL := fmt.Sprintf("%s/api/v1/query?query=%s", c.baseURL, encodedQuery)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("prometheus returned status %d: %s", resp.StatusCode, string(body))
	}

	var promResp PrometheusResponse
	if err := json.NewDecoder(resp.Body).Decode(&promResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &promResp, nil
}

func (c *prometheusClient) queryPrometheusRange(ctx context.Context, query string, duration string) (*PrometheusResponse, error) {
	d, err := parseDuration(duration)
	if err != nil {
		return nil, fmt.Errorf("invalid duration: %w", err)
	}

	now := time.Now()
	start := now.Add(-d)

	var step string
	switch {
	case d <= 1*time.Hour:
		step = "30s"
	case d <= 6*time.Hour:
		step = "1m"
	case d <= 24*time.Hour:
		step = "5m"
	case d <= 7*24*time.Hour:
		step = "15m"
	case d <= 30*24*time.Hour:
		step = "1h"
	default:
		step = "3h"
	}

	encodedQuery := url.QueryEscape(query)
	apiURL := fmt.Sprintf("%s/api/v1/query_range?query=%s&start=%d&end=%d&step=%s",
		c.baseURL,
		encodedQuery,
		start.Unix(),
		now.Unix(),
		step,
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("prometheus returned status %d: %s", resp.StatusCode, string(body))
	}

	var promResp PrometheusResponse
	if err := json.NewDecoder(resp.Body).Decode(&promResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &promResp, nil
}

func parseDuration(duration string) (time.Duration, error) {
	if len(duration) < 2 {
		return 0, fmt.Errorf("invalid duration format")
	}

	unit := duration[len(duration)-1:]
	valueStr := duration[:len(duration)-1]

	var value int
	_, err := fmt.Sscanf(valueStr, "%d", &value)
	if err != nil {
		return 0, fmt.Errorf("invalid duration value: %w", err)
	}

	switch unit {
	case "h":
		return time.Duration(value) * time.Hour, nil
	case "d":
		return time.Duration(value) * 24 * time.Hour, nil
	case "m":
		return time.Duration(value) * time.Minute, nil
	case "s":
		return time.Duration(value) * time.Second, nil
	default:
		return 0, fmt.Errorf("unsupported duration unit: %s", unit)
	}
}

func extractValue(value []interface{}) (float64, error) {
	if len(value) < 2 {
		return 0, fmt.Errorf("invalid value format")
	}

	switch v := value[1].(type) {
	case string:
		return strconv.ParseFloat(v, 64)
	case float64:
		return v, nil
	default:
		return 0, fmt.Errorf("unexpected value type: %T", value[1])
	}
}

func extractTimeSeries(values [][]interface{}) []domain.TimeSeriesDataPoint {
	result := make([]domain.TimeSeriesDataPoint, 0, len(values))

	for _, v := range values {
		if len(v) < 2 {
			continue
		}

		timestamp, ok := v[0].(float64)
		if !ok {
			continue
		}

		value, err := extractValue(v)
		if err != nil {
			continue
		}

		result = append(result, domain.TimeSeriesDataPoint{
			Timestamp: int64(timestamp * 1000),
			Value:     value,
		})
	}

	return result
}

func calculateChangePercent(current, previous float64) float64 {
	if previous == 0 {
		return 0
	}
	return ((current - previous) / previous) * 100
}

func determineStatus(value float64, warningThreshold, criticalThreshold float64) string {
	if value >= criticalThreshold {
		return "critical"
	} else if value >= warningThreshold {
		return "warning"
	} else if value >= warningThreshold*0.5 {
		return "good"
	}
	return "excellent"
}
