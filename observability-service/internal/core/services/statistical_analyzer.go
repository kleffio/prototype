package services

import (
	"math"
	"sort"

	"prometheus-metrics-api/internal/core/domain"
)

type seriesStats struct {
	Count      int
	Mean       float64
	StdDev     float64
	P50        float64
	P95        float64
	P99        float64
	Last       float64
	LastTimeMS int64
}

type spikeAnomaly struct {
	Timestamp        int64
	Value            float64
	PercentAboveMean float64
}

func summarizeSeries(series []domain.TimeSeriesDataPoint) seriesStats {
	if len(series) == 0 {
		return seriesStats{}
	}

	values := make([]float64, 0, len(series))
	sum := 0.0
	for _, point := range series {
		values = append(values, point.Value)
		sum += point.Value
	}

	count := len(values)
	mean := sum / float64(count)

	variance := 0.0
	for _, value := range values {
		diff := value - mean
		variance += diff * diff
	}
	variance = variance / float64(count)

	sorted := make([]float64, len(values))
	copy(sorted, values)
	sort.Float64s(sorted)

	return seriesStats{
		Count:      count,
		Mean:       mean,
		StdDev:     math.Sqrt(variance),
		P50:        quantile(sorted, 0.50),
		P95:        quantile(sorted, 0.95),
		P99:        quantile(sorted, 0.99),
		Last:       series[len(series)-1].Value,
		LastTimeMS: series[len(series)-1].Timestamp,
	}
}

func detectLatestSpike(stats seriesStats, thresholdStdDev float64) *spikeAnomaly {
	if stats.Count < 5 || stats.StdDev == 0 {
		return nil
	}
	limit := stats.Mean + thresholdStdDev*stats.StdDev
	if stats.Last <= limit {
		return nil
	}
	percentAboveMean := 0.0
	if stats.Mean > 0 {
		percentAboveMean = ((stats.Last - stats.Mean) / stats.Mean) * 100
	}
	return &spikeAnomaly{
		Timestamp:        stats.LastTimeMS,
		Value:            stats.Last,
		PercentAboveMean: percentAboveMean,
	}
}

func anomalySeverity(percentAboveMean float64) string {
	switch {
	case percentAboveMean >= 50:
		return "high"
	case percentAboveMean >= 25:
		return "medium"
	default:
		return "low"
	}
}

func quantile(sorted []float64, q float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	if q <= 0 {
		return sorted[0]
	}
	if q >= 1 {
		return sorted[len(sorted)-1]
	}
	pos := q * float64(len(sorted)-1)
	lower := int(math.Floor(pos))
	upper := int(math.Ceil(pos))
	if lower == upper {
		return sorted[lower]
	}
	weight := pos - float64(lower)
	return sorted[lower]*(1-weight) + sorted[upper]*weight
}

func bytesToGiB(bytes float64) float64 {
	return bytes / (1024 * 1024 * 1024)
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func round3(v float64) float64 {
	return math.Round(v*1000) / 1000
}
