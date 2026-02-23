package domain

import "time"

type InsightsResponse struct {
	Recommendations []InsightRecommendation `json:"recommendations"`
	Anomalies       []InsightAnomaly        `json:"anomalies"`
	CostSavings     CostSavingsInsight      `json:"costSavings"`
	SLOStatus       SLOStatus               `json:"sloStatus"`
	Summary         InsightsSummary         `json:"summary"`
	Metadata        InsightsMetadata        `json:"metadata"`
	GeneratedAt     time.Time               `json:"generatedAt"`
}

type AIInsightsResponse struct {
	Recommendations []InsightRecommendation `json:"recommendations"`
	SummaryNote     string                  `json:"summaryNote,omitempty"`
}

type InsightRecommendation struct {
	Type           string  `json:"type"`
	Severity       string  `json:"severity"`
	Resource       string  `json:"resource"`
	Current        string  `json:"current"`
	Recommendation string  `json:"recommendation"`
	Savings        string  `json:"savings,omitempty"`
	Impact         string  `json:"impact,omitempty"`
	Confidence     float64 `json:"confidence,omitempty"`
	BasedOn        string  `json:"basedOn,omitempty"`
}

type InsightAnomaly struct {
	DetectedAt time.Time `json:"detectedAt"`
	Type       string    `json:"type"`
	Resource   string    `json:"resource"`
	Value      string    `json:"value"`
	Baseline   string    `json:"baseline"`
	Current    string    `json:"current"`
	Severity   string    `json:"severity"`
}

type CostSavingsInsight struct {
	IdleCPUCores        float64 `json:"idleCpuCores"`
	IdleMemoryGB        float64 `json:"idleMemoryGb"`
	EstimatedMonthlyUSD float64 `json:"estimatedMonthlyUsd"`
	Note                string  `json:"note,omitempty"`
}

type SLOStatus struct {
	SLOTargetPercent            float64 `json:"sloTargetPercent"`
	ErrorRatePercent            float64 `json:"errorRatePercent"`
	WithinSLO                   bool    `json:"withinSLO"`
	ErrorBudgetRemainingPercent float64 `json:"errorBudgetRemainingPercent"`
	Note                        string  `json:"note,omitempty"`
}

type InsightsSummary struct {
	TotalNamespaces      int  `json:"totalNamespaces"`
	TotalRecommendations int  `json:"totalRecommendations"`
	TotalAnomalies       int  `json:"totalAnomalies"`
	DataPointsProcessed  int  `json:"dataPointsProcessed"`
	PartialData          bool `json:"partialData"`
}

type InsightsMetadata struct {
	GenerationMs   int64                     `json:"generationMs"`
	CacheHit       bool                      `json:"cacheHit"`
	AnalysisWindow string                    `json:"analysisWindow"`
	ThresholdsUsed InsightsThresholdMetadata `json:"thresholdsUsed"`
}

type InsightsThresholdMetadata struct {
	AnomalyStdDev             float64 `json:"anomalyStdDev"`
	SLOErrorRateTargetPercent float64 `json:"sloErrorRateTargetPercent"`
}
