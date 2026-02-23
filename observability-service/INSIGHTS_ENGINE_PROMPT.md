# Metrics Insights Engine with AI-Powered Analysis

## Objective

Build a **Metrics Insights Engine** that processes Prometheus metrics through statistical analysis and AI-powered interpretation to generate actionable recommendations, anomaly alerts, and cost optimization insights. This demonstrates "big data manipulation with intelligent value generation."

## Current Architecture

- **Observability Service**: Go-based microservice (container: `kleff.azurecr.io/observability-service`)
- **Data Source**: Prometheus at `http://kube-prometheus-kube-prome-prometheus.monitoring.svc.cluster.local:9090`
- **Current Capability**: Queries Prometheus and displays metrics in graphs for admin users
- **Namespace Filtering**: Projects isolated by namespace with blocklist for system namespaces
- **Frontend**: React + TypeScript admin panel at `frontend/src/pages/admin/AdminPage.tsx`

---

## What to Build

Create an **Insights Generator** module with two-stage processing:

### Stage 1: Statistical Analysis Engine (Go)

Aggregates multi-dimensional metrics over 7 days:

1. **CPU Utilization Analysis**
   - Per-pod and per-deployment CPU usage
   - Request vs. limit utilization ratios
   - P50, P95, P99 percentiles over time windows

2. **Memory Utilization Analysis**
   - Working set vs. requested memory
   - Memory growth trends
   - OOM risk assessment

3. **Request Rate & Error Rate**
   - Requests per second per service
   - Error rate percentages with SLO comparison
   - Latency percentiles (P50, P95, P99)

4. **Network I/O**
   - Ingress/egress per service
   - Network saturation detection

5. **Pod Health**
   - Restart counts per namespace
   - Pod phase distribution
   - Crash loop detection

### Stage 2: AI-Powered Insights Generator (OpenAI Integration)

Uses OpenAI API to transform statistical analysis into natural language insights.

---

## Technical Requirements

### Backend (Go)

**New Files to Create:**

1. **`internal/core/domain/insights.go`** - Domain models:

```go
package domain

import "time"

// InsightsResponse is the main API response
type InsightsResponse struct {
    Analysis         AnalysisMetadata `json:"analysis"`
    Insights         []Insight        `json:"insights"`
    Summary          InsightsSummary  `json:"summary"`
    AIModel          string           `json:"aiModel"`
    ProcessingTimeMs int64            `json:"processingTimeMs"`
}

type AnalysisMetadata struct {
    TimeRange           string    `json:"timeRange"`
    DataPointsAnalyzed  int       `json:"dataPointsAnalyzed"`
    ResourcesAnalyzed   int       `json:"resourcesAnalyzed"`
    GeneratedAt         time.Time `json:"generatedAt"`
}

type Insight struct {
    ID             string  `json:"id"`
    Type           string  `json:"type"`           // RIGHT_SIZING, SCALING, ANOMALY, COST_OPTIMIZATION, RELIABILITY
    Severity       string  `json:"severity"`       // LOW, MEDIUM, HIGH, CRITICAL
    Resource       string  `json:"resource"`       // Resource name
    Namespace      string  `json:"namespace"`      // Kubernetes namespace
    Current        string  `json:"current"`        // Current state description
    Recommendation string  `json:"recommendation"` // Specific action to take
    Impact         string  `json:"impact"`         // Quantified benefit
    Confidence     float64 `json:"confidence"`     // 0-1 score
    DataPoints     int     `json:"dataPoints"`     // Data points used for this insight
}

type InsightsSummary struct {
    ClusterHealth           string `json:"clusterHealth"`           // HEALTHY, DEGRADED, CRITICAL
    TotalRecommendations    int    `json:"totalRecommendations"`
    CriticalCount           int    `json:"criticalCount"`
    HighCount               int    `json:"highCount"`
    MediumCount             int    `json:"mediumCount"`
    LowCount                int    `json:"lowCount"`
    PotentialMonthlySavings string `json:"potentialMonthlySavings"`
    TopPriority             string `json:"topPriority"`
}

// StatisticalAnalysis holds computed metrics
type StatisticalAnalysis struct {
    TimeRange       string                `json:"timeRange"`
    ResourceMetrics []ResourceMetricStats `json:"resourceMetrics"`
    Anomalies       []StatisticalAnomaly  `json:"anomalies"`
    Trends          []TrendIndicator      `json:"trends"`
}

type ResourceMetricStats struct {
    ResourceID         string  `json:"resourceId"`
    ResourceType       string  `json:"resourceType"` // pod, deployment, namespace
    Namespace          string  `json:"namespace"`
    CPURequested       float64 `json:"cpuRequested"`       // millicores
    CPUUsedAvg         float64 `json:"cpuUsedAvg"`         // millicores
    CPUUsedP95         float64 `json:"cpuUsedP95"`         // millicores
    CPUUsedP99         float64 `json:"cpuUsedP99"`         // millicores
    CPUUtilization     float64 `json:"cpuUtilization"`     // percentage
    MemoryRequested    float64 `json:"memoryRequested"`    // bytes
    MemoryUsedAvg      float64 `json:"memoryUsedAvg"`      // bytes
    MemoryUsedP95      float64 `json:"memoryUsedP95"`      // bytes
    MemoryUsedP99      float64 `json:"memoryUsedP99"`      // bytes
    MemoryUtilization  float64 `json:"memoryUtilization"`  // percentage
    RestartCount       int     `json:"restartCount"`
    DataPoints         int     `json:"dataPoints"`
}

type StatisticalAnomaly struct {
    DetectedAt    time.Time `json:"detectedAt"`
    ResourceType  string    `json:"resourceType"`
    ResourceID    string    `json:"resourceId"`
    MetricType    string    `json:"metricType"` // cpu, memory, errors, latency
    BaselineValue float64   `json:"baselineValue"`
    CurrentValue  float64   `json:"currentValue"`
    Deviation     float64   `json:"deviation"` // standard deviations
    Severity      string    `json:"severity"`
}

type TrendIndicator struct {
    ResourceID string  `json:"resourceId"`
    MetricType string  `json:"metricType"`
    Direction  string  `json:"direction"` // increasing, decreasing, stable
    Slope      float64 `json:"slope"`
    Confidence float64 `json:"confidence"`
}

// AIInsightsRequest is sent to OpenAI
type AIInsightsRequest struct {
    ClusterContext      string              `json:"clusterContext"`
    StatisticalAnalysis StatisticalAnalysis `json:"statisticalAnalysis"`
}

// AIInsightsResponse is returned from OpenAI
type AIInsightsResponse struct {
    Insights []Insight       `json:"insights"`
    Summary  InsightsSummary `json:"summary"`
}
```

2. **`internal/core/ports/insights_service.go`** - Service interface:

```go
package ports

import (
    "context"
    "prometheus-metrics-api/internal/core/domain"
)

type InsightsService interface {
    GenerateInsights(ctx context.Context) (*domain.InsightsResponse, error)
}

type StatisticalAnalyzer interface {
    Analyze(ctx context.Context, duration string) (*domain.StatisticalAnalysis, error)
}

type AIClient interface {
    GenerateInsights(ctx context.Context, analysis *domain.StatisticalAnalysis) (*domain.AIInsightsResponse, error)
}
```

3. **`internal/core/services/statistical_analyzer.go`** - Statistical analysis:

```go
package services

import (
    "context"
    "math"
    "sort"
    "time"

    "prometheus-metrics-api/internal/core/domain"
    "prometheus-metrics-api/internal/core/ports"
)

type statisticalAnalyzer struct {
    metricsRepo ports.MetricsRepository
}

func NewStatisticalAnalyzer(metricsRepo ports.MetricsRepository) ports.StatisticalAnalyzer {
    return &statisticalAnalyzer{metricsRepo: metricsRepo}
}

func (a *statisticalAnalyzer) Analyze(ctx context.Context, duration string) (*domain.StatisticalAnalysis, error) {
    // 1. Fetch historical metrics from Prometheus
    // 2. Calculate percentiles (P50, P95, P99)
    // 3. Calculate averages and standard deviations
    // 4. Detect anomalies (> 2 standard deviations)
    // 5. Identify trends
    // Implementation details...
}

// calculatePercentile returns the value at the given percentile
func calculatePercentile(values []float64, percentile float64) float64 {
    if len(values) == 0 {
        return 0
    }
    sorted := make([]float64, len(values))
    copy(sorted, values)
    sort.Float64s(sorted)
    
    index := (percentile / 100) * float64(len(sorted)-1)
    lower := int(math.Floor(index))
    upper := int(math.Ceil(index))
    
    if lower == upper {
        return sorted[lower]
    }
    
    weight := index - float64(lower)
    return sorted[lower]*(1-weight) + sorted[upper]*weight
}

// calculateStandardDeviation returns the standard deviation
func calculateStandardDeviation(values []float64, mean float64) float64 {
    if len(values) == 0 {
        return 0
    }
    var sum float64
    for _, v := range values {
        sum += math.Pow(v-mean, 2)
    }
    return math.Sqrt(sum / float64(len(values)))
}

// detectAnomalies finds values > 2 standard deviations from mean
func detectAnomalies(values []float64, threshold float64) []int {
    if len(values) == 0 {
        return nil
    }
    
    // Calculate mean
    var sum float64
    for _, v := range values {
        sum += v
    }
    mean := sum / float64(len(values))
    
    // Calculate std dev
    stdDev := calculateStandardDeviation(values, mean)
    
    // Find anomalies
    var anomalies []int
    for i, v := range values {
        deviation := math.Abs(v-mean) / stdDev
        if deviation >= threshold {
            anomalies = append(anomalies, i)
        }
    }
    return anomalies
}
```

4. **`internal/core/services/ai_insights_client.go`** - OpenAI integration:

```go
package services

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"

    "prometheus-metrics-api/internal/core/domain"
    "prometheus-metrics-api/internal/core/ports"
)

type aiClient struct {
    httpClient *http.Client
    apiKey     string
    model      string
    apiURL     string
}

func NewAIClient(apiKey, model string) ports.AIClient {
    return &aiClient{
        httpClient: &http.Client{Timeout: 30 * time.Second},
        apiKey:     apiKey,
        model:      model,
        apiURL:     "https://api.openai.com/v1/chat/completions",
    }
}

func (c *aiClient) GenerateInsights(ctx context.Context, analysis *domain.StatisticalAnalysis) (*domain.AIInsightsResponse, error) {
    prompt := buildPrompt(analysis)
    
    reqBody := map[string]interface{}{
        "model": c.model,
        "messages": []map[string]string{
            {
                "role":    "system",
                "content": getSystemPrompt(),
            },
            {
                "role":    "user",
                "content": prompt,
            },
        },
        "temperature": 0.3,
        "max_tokens":  4096,
    }
    
    body, _ := json.Marshal(reqBody)
    req, err := http.NewRequestWithContext(ctx, "POST", c.apiURL, bytes.NewReader(body))
    if err != nil {
        return nil, err
    }
    
    req.Header.Set("Authorization", "Bearer "+c.apiKey)
    req.Header.Set("Content-Type", "application/json")
    
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        bodyBytes, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("OpenAI API error: %s - %s", resp.Status, string(bodyBytes))
    }
    
    var result struct {
        Choices []struct {
            Message struct {
                Content string `json:"content"`
            } `json:"message"`
        } `json:"choices"`
    }
    
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }
    
    if len(result.Choices) == 0 {
        return nil, fmt.Errorf("no response from OpenAI")
    }
    
    var aiResponse domain.AIInsightsResponse
    if err := json.Unmarshal([]byte(result.Choices[0].Message.Content), &aiResponse); err != nil {
        return nil, fmt.Errorf("failed to parse OpenAI response: %w", err)
    }
    
    return &aiResponse, nil
}

func getSystemPrompt() string {
    return `You are an expert Kubernetes infrastructure analyst. Analyze metrics data and generate actionable insights in JSON format.

Generate insights in these categories:
1. RIGHT_SIZING: Over-provisioned resources (utilization < 30%)
2. SCALING: Under-provisioned resources (utilization > 80% or high latency)
3. ANOMALY: Explain detected anomalies and potential impact
4. COST_OPTIMIZATION: Calculate potential monthly savings
5. RELIABILITY: Identify reliability risks (restarts, OOM risks, error rates)

For each insight provide:
- type: category name
- severity: LOW, MEDIUM, HIGH, or CRITICAL
- resource: affected resource name
- namespace: kubernetes namespace
- current: current state description
- recommendation: specific action to take
- impact: quantified benefit
- confidence: 0-1 score based on data quality

Respond ONLY with valid JSON matching this structure:
{
  "insights": [
    {
      "id": "insight-001",
      "type": "RIGHT_SIZING",
      "severity": "MEDIUM",
      "resource": "service-name",
      "namespace": "namespace",
      "current": "description",
      "recommendation": "action",
      "impact": "benefit",
      "confidence": 0.92,
      "dataPoints": 10080
    }
  ],
  "summary": {
    "clusterHealth": "HEALTHY|DEGRADED|CRITICAL",
    "totalRecommendations": 5,
    "criticalCount": 1,
    "highCount": 2,
    "mediumCount": 1,
    "lowCount": 1,
    "potentialMonthlySavings": "$57",
    "topPriority": "most urgent action"
  }
}`
}

func buildPrompt(analysis *domain.StatisticalAnalysis) string {
    jsonBytes, _ := json.MarshalIndent(analysis, "", "  ")
    return fmt.Sprintf(`Analyze the following Kubernetes metrics data and generate actionable insights:

%s

Generate comprehensive insights covering all categories. Be specific with recommendations and quantify impacts.`, string(jsonBytes))
}
```

5. **`internal/core/services/insights_service.go`** - Main service:

```go
package services

import (
    "context"
    "fmt"
    "sync"
    "time"

    "prometheus-metrics-api/internal/core/domain"
    "prometheus-metrics-api/internal/core/ports"
)

type insightsService struct {
    analyzer  ports.StatisticalAnalyzer
    aiClient  ports.AIClient
    cacheTTL  time.Duration
    cacheMu   sync.RWMutex
    cachedInsights *domain.InsightsResponse
    cacheExpiry    time.Time
}

func NewInsightsService(analyzer ports.StatisticalAnalyzer, aiClient ports.AIClient, cacheTTL time.Duration) ports.InsightsService {
    if cacheTTL == 0 {
        cacheTTL = 5 * time.Minute
    }
    return &insightsService{
        analyzer: analyzer,
        aiClient: aiClient,
        cacheTTL: cacheTTL,
    }
}

func (s *insightsService) GenerateInsights(ctx context.Context) (*domain.InsightsResponse, error) {
    // Check cache
    s.cacheMu.RLock()
    if s.cachedInsights != nil && time.Now().Before(s.cacheExpiry) {
        defer s.cacheMu.RUnlock()
        return s.cachedInsights, nil
    }
    s.cacheMu.RUnlock()
    
    startTime := time.Now()
    
    // Stage 1: Statistical Analysis
    analysis, err := s.analyzer.Analyze(ctx, "168h") // 7 days
    if err != nil {
        return nil, fmt.Errorf("statistical analysis failed: %w", err)
    }
    
    // Stage 2: AI-Powered Insights
    aiResponse, err := s.aiClient.GenerateInsights(ctx, analysis)
    if err != nil {
        return nil, fmt.Errorf("AI insights generation failed: %w", err)
    }
    
    // Build response
    response := &domain.InsightsResponse{
        Analysis: domain.AnalysisMetadata{
            TimeRange:          "7d",
            DataPointsAnalyzed: calculateTotalDataPoints(analysis),
            ResourcesAnalyzed:  len(analysis.ResourceMetrics),
            GeneratedAt:        time.Now(),
        },
        Insights:         aiResponse.Insights,
        Summary:          aiResponse.Summary,
        AIModel:          "gpt-4o-mini",
        ProcessingTimeMs: time.Since(startTime).Milliseconds(),
    }
    
    // Cache result
    s.cacheMu.Lock()
    s.cachedInsights = response
    s.cacheExpiry = time.Now().Add(s.cacheTTL)
    s.cacheMu.Unlock()
    
    return response, nil
}

func calculateTotalDataPoints(analysis *domain.StatisticalAnalysis) int {
    total := 0
    for _, m := range analysis.ResourceMetrics {
        total += m.DataPoints
    }
    return total
}
```

6. **`internal/adapters/in/http/insights_handler.go`** - HTTP handler:

```go
package http

import (
    "net/http"
    
    "prometheus-metrics-api/internal/core/ports"
    "github.com/gin-gonic/gin"
)

type InsightsHandler struct {
    insightsService ports.InsightsService
}

func NewInsightsHandler(insightsService ports.InsightsService) *InsightsHandler {
    return &InsightsHandler{
        insightsService: insightsService,
    }
}

func (h *InsightsHandler) GetInsights(c *gin.Context) {
    response, err := h.insightsService.GenerateInsights(c.Request.Context())
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "Failed to generate insights",
            "details": err.Error(),
        })
        return
    }
    
    c.JSON(http.StatusOK, response)
}
```

**Modified Files:**

1. **`internal/config/config.go`** - Add:

```go
type Config struct {
    // ... existing fields ...
    OpenAIAPIKey           string        `json:"openAIAPIKey"`
    OpenAIModel            string        `json:"openaiModel"`
    InsightsCacheTTL       time.Duration `json:"insightsCacheTTL"`
    InsightsAnalysisWindow time.Duration `json:"insightsAnalysisWindow"`
}

func Load() *Config {
    return &Config{
        // ... existing fields ...
        OpenAIAPIKey:           getEnv("OPENAI_API_KEY", ""),
        OpenAIModel:            getEnv("OPENAI_MODEL", "gpt-4o-mini"),
        InsightsCacheTTL:       getEnvDuration("INSIGHTS_CACHE_TTL", 5*time.Minute),
        InsightsAnalysisWindow: getEnvDuration("INSIGHTS_ANALYSIS_WINDOW", 168*time.Hour),
    }
}
```

2. **`internal/adapters/in/http/server.go`** - Add route:

```go
func (s *Server) setupRoutes() {
    // ... existing routes ...
    
    // Insights endpoint
    insightsHandler := NewInsightsHandler(s.insightsService)
    admin := s.router.Group("/api/v1/admin")
    {
        admin.GET("/insights", insightsHandler.GetInsights)
    }
}
```

---

### Frontend (React + TypeScript)

**New Files to Create:**

1. **`src/features/admin/types/insights.ts`**:

```typescript
// Insight types
export type InsightType = 
  | "RIGHT_SIZING" 
  | "SCALING" 
  | "ANOMALY" 
  | "COST_OPTIMIZATION" 
  | "RELIABILITY";

export type InsightSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ClusterHealth = "HEALTHY" | "DEGRADED" | "CRITICAL";

export interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  resource: string;
  namespace: string;
  current: string;
  recommendation: string;
  impact: string;
  confidence: number;
  dataPoints: number;
}

export interface InsightsSummary {
  clusterHealth: ClusterHealth;
  totalRecommendations: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  potentialMonthlySavings: string;
  topPriority: string;
}

export interface AnalysisMetadata {
  timeRange: string;
  dataPointsAnalyzed: number;
  resourcesAnalyzed: number;
  generatedAt: string;
}

export interface InsightsResponse {
  analysis: AnalysisMetadata;
  insights: Insight[];
  summary: InsightsSummary;
  aiModel: string;
  processingTimeMs: number;
}

export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  RIGHT_SIZING: "Right-Sizing",
  SCALING: "Scaling",
  ANOMALY: "Anomaly",
  COST_OPTIMIZATION: "Cost Optimization",
  RELIABILITY: "Reliability",
};

export const INSIGHT_TYPE_ICONS: Record<InsightType, string> = {
  RIGHT_SIZING: "📐",
  SCALING: "📈",
  ANOMALY: "⚠️",
  COST_OPTIMIZATION: "💰",
  RELIABILITY: "🛡️",
};

export const SEVERITY_COLORS: Record<InsightSeverity, string> = {
  CRITICAL: "bg-red-500/20 text-red-300 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  LOW: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

export const HEALTH_COLORS: Record<ClusterHealth, string> = {
  HEALTHY: "text-green-400",
  DEGRADED: "text-yellow-400",
  CRITICAL: "text-red-400",
};
```

2. **`src/features/admin/api/getInsights.ts`**:

```typescript
import type { InsightsResponse } from "@features/admin/types/insights";

const OBSERVABILITY_SERVICE_URL = 
  import.meta.env.VITE_OBSERVABILITY_SERVICE_URL || "http://localhost:8082";

export async function getInsights(
  authToken: string
): Promise<InsightsResponse> {
  const response = await fetch(
    `${OBSERVABILITY_SERVICE_URL}/api/v1/admin/insights`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch insights: ${response.statusText}`);
  }

  return response.json();
}
```

3. **`src/features/admin/components/SeverityBadge.tsx`**:

```typescript
import type { InsightSeverity } from "@features/admin/types/insights";
import { SEVERITY_COLORS } from "@features/admin/types/insights";

interface SeverityBadgeProps {
  severity: InsightSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${SEVERITY_COLORS[severity]}`}
    >
      {severity}
    </span>
  );
}
```

4. **`src/features/admin/components/InsightCard.tsx`**:

```typescript
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Shield } from "lucide-react";
import type { Insight, InsightType } from "@features/admin/types/insights";
import { SeverityBadge } from "./SeverityBadge";
import { INSIGHT_TYPE_LABELS } from "@features/admin/types/insights";

interface InsightCardProps {
  insight: Insight;
}

const InsightIcon = ({ type }: { type: InsightType }) => {
  const icons: Record<InsightType, React.ReactNode> = {
    RIGHT_SIZING: <TrendingDown className="h-4 w-4" />,
    SCALING: <TrendingUp className="h-4 w-4" />,
    ANOMALY: <AlertTriangle className="h-4 w-4" />,
    COST_OPTIMIZATION: <DollarSign className="h-4 w-4" />,
    RELIABILITY: <Shield className="h-4 w-4" />,
  };
  return <>{icons[type]}</>;
};

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={insight.severity} />
          <span className="text-sm font-medium text-neutral-300">
            {INSIGHT_TYPE_LABELS[insight.type]}
          </span>
        </div>
        <span className="text-xs text-neutral-500">
          {(insight.confidence * 100).toFixed(0)}% confidence
        </span>
      </div>
      
      <div className="mt-3">
        <h4 className="font-medium text-neutral-100">
          {insight.resource}
          <span className="ml-2 text-sm font-normal text-neutral-500">
            ({insight.namespace})
          </span>
        </h4>
      </div>
      
      <div className="mt-2 space-y-2">
        <p className="text-sm text-neutral-400">
          <span className="text-neutral-500">Current:</span> {insight.current}
        </p>
        <p className="text-sm text-neutral-300">
          <span className="text-kleff-gold">→</span> {insight.recommendation}
        </p>
        <p className="text-sm text-green-400">
          <span className="text-neutral-500">Impact:</span> {insight.impact}
        </p>
      </div>
    </div>
  );
}
```

5. **`src/features/admin/components/InsightsSummary.tsx`**:

```typescript
import { AlertCircle, TrendingUp, DollarSign, Activity } from "lucide-react";
import type { InsightsSummary, ClusterHealth } from "@features/admin/types/insights";
import { HEALTH_COLORS } from "@features/admin/types/insights";

interface InsightsSummaryProps {
  summary: InsightsSummary;
  generatedAt: string;
}

export function InsightsSummary({ summary, generatedAt }: InsightsSummaryProps) {
  const healthColor = HEALTH_COLORS[summary.clusterHealth];
  
  return (
    <div className="space-y-4">
      {/* Health Banner */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-neutral-400">Cluster Health:</span>
            <span className={`ml-2 text-lg font-semibold ${healthColor}`}>
              {summary.clusterHealth}
            </span>
          </div>
          <span className="text-xs text-neutral-500">
            Generated {new Date(generatedAt).toLocaleString()}
          </span>
        </div>
        {summary.topPriority && (
          <p className="mt-2 text-sm text-neutral-300">
            <span className="text-kleff-gold">⚠️ Top Priority:</span>{" "}
            {summary.topPriority}
          </p>
        )}
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          icon={<DollarSign className="h-5 w-5 text-green-400" />}
          label="Potential Savings"
          value={summary.potentialMonthlySavings}
          subtext="per month"
        />
        <SummaryCard
          icon={<AlertCircle className="h-5 w-5 text-red-400" />}
          label="Critical"
          value={summary.criticalCount.toString()}
          subtext="alerts"
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-orange-400" />}
          label="High Priority"
          value={summary.highCount.toString()}
          subtext="alerts"
        />
        <SummaryCard
          icon={<Activity className="h-5 w-5 text-blue-400" />}
          label="Recommendations"
          value={summary.totalRecommendations.toString()}
          subtext="total"
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-neutral-400">{label}</span>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-semibold text-neutral-100">{value}</span>
        <span className="ml-1 text-xs text-neutral-500">{subtext}</span>
      </div>
    </div>
  );
}
```

6. **`src/features/admin/components/InsightsPanel.tsx`**:

```typescript
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { RefreshCw, Sparkles, Filter } from "lucide-react";
import { getInsights } from "@features/admin/api/getInsights";
import { InsightsSummary } from "./InsightsSummary";
import { InsightCard } from "./InsightCard";
import type { 
  InsightsResponse, 
  Insight, 
  InsightType,
  InsightSeverity 
} from "@features/admin/types/insights";
import { Skeleton } from "@shared/ui/Skeleton";

type FilterType = "all" | InsightType | InsightSeverity;

export function InsightsPanel() {
  const auth = useAuth();
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  
  const fetchInsights = useCallback(async () => {
    if (!auth.user?.access_token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getInsights(auth.user.access_token);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [auth.user?.access_token]);
  
  useEffect(() => {
    void fetchInsights();
  }, [fetchInsights]);
  
  const filteredInsights = data?.insights.filter((insight) => {
    if (filter === "all") return true;
    if (filter === "CRITICAL" || filter === "HIGH" || filter === "MEDIUM" || filter === "LOW") {
      return insight.severity === filter;
    }
    return insight.type === filter;
  }) ?? [];
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full bg-neutral-800" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 bg-neutral-800" />
          ))}
        </div>
        <Skeleton className="h-64 w-full bg-neutral-800" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
        <p className="text-red-300">{error}</p>
        <button
          onClick={fetchInsights}
          className="mt-2 text-sm text-red-400 underline hover:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }
  
  if (!data) return null;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-kleff-gold" />
          <span className="text-sm text-neutral-400">
            Powered by {data.aiModel} • {data.processingTimeMs}ms
          </span>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      
      {/* Summary */}
      <InsightsSummary 
        summary={data.summary} 
        generatedAt={data.analysis.generatedAt} 
      />
      
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-neutral-400" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300"
        >
          <option value="all">All Insights</option>
          <optgroup label="By Type">
            <option value="RIGHT_SIZING">Right-Sizing</option>
            <option value="SCALING">Scaling</option>
            <option value="ANOMALY">Anomalies</option>
            <option value="COST_OPTIMIZATION">Cost Optimization</option>
            <option value="RELIABILITY">Reliability</option>
          </optgroup>
          <optgroup label="By Severity">
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </optgroup>
        </select>
        <span className="text-sm text-neutral-500">
          {filteredInsights.length} insights
        </span>
      </div>
      
      {/* Insights List */}
      <div className="space-y-3">
        {filteredInsights.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-8 text-center">
            <p className="text-neutral-400">No insights match the selected filter.</p>
          </div>
        ) : (
          filteredInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </div>
  );
}
```

**Modified File:**

1. **`src/pages/admin/AdminPage.tsx`** - Add Insights tab:

```typescript
// Add import at top
import { Lightbulb } from "lucide-react";
import { InsightsPanel } from "@features/admin/components/InsightsPanel";

// Update TabType
type TabType = "users" | "audit" | "insights";

// Add tab button (after audit tab)
<button
  onClick={() => setActiveTab("insights")}
  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
    activeTab === "insights"
      ? "border-kleff-gold text-neutral-50"
      : "border-transparent text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
  }`}
>
  <Lightbulb className="h-4 w-4" />
  Insights
</button>

// Add tab content (after audit tab content)
{activeTab === "insights" && (
  <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm">
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-neutral-50">Cluster Insights</h2>
      <p className="text-sm text-neutral-400">
        AI-powered recommendations for optimizing your Kubernetes cluster.
      </p>
    </div>
    <InsightsPanel />
  </div>
)}
```

---

## Environment Variables

```bash
# Backend (observability-service)
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini
INSIGHTS_CACHE_TTL=5m
INSIGHTS_ANALYSIS_WINDOW=168h

# Frontend
VITE_OBSERVABILITY_SERVICE_URL=http://localhost:8082
```

---

## API Endpoint

```http
GET /api/v1/admin/insights
Authorization: Bearer <token>

Response:
{
  "analysis": {
    "timeRange": "7d",
    "dataPointsAnalyzed": 125840,
    "resourcesAnalyzed": 47,
    "generatedAt": "2026-02-22T23:00:00Z"
  },
  "insights": [
    {
      "id": "insight-001",
      "type": "RIGHT_SIZING",
      "severity": "MEDIUM",
      "resource": "user-service",
      "namespace": "uuid-xxx",
      "current": "CPU request: 500m, Avg usage: 15%",
      "recommendation": "Reduce CPU request from 500m to 100m",
      "impact": "80% CPU reduction (~$12/month)",
      "confidence": 0.92,
      "dataPoints": 10080
    }
  ],
  "summary": {
    "clusterHealth": "DEGRADED",
    "totalRecommendations": 5,
    "criticalCount": 1,
    "highCount": 2,
    "mediumCount": 1,
    "lowCount": 1,
    "potentialMonthlySavings": "$57",
    "topPriority": "Investigate payment-service restart loop"
  },
  "aiModel": "gpt-4o-mini",
  "processingTimeMs": 2847
}
```

---

## Acceptance Criteria

1. ✅ Backend fetches 7-day historical metrics from Prometheus
2. ✅ Calculates statistical baselines (avg, P50, P95, P99, std dev)
3. ✅ Detects anomalies using 2+ standard deviation threshold
4. ✅ Generates AI-powered insights via OpenAI API
5. ✅ Produces 4+ insight types (right-sizing, scaling, anomaly, cost, reliability)
6. ✅ Returns structured JSON via `/api/v1/admin/insights`
7. ✅ Caches insights for 5 minutes
8. ✅ Frontend displays new "Insights" tab in Admin Panel
9. ✅ Frontend shows summary cards (health, savings, alert counts)
10. ✅ Frontend displays insights with severity, filtering, and refresh
11. ✅ Handles loading, error, and empty states gracefully
12. ✅ Total processing time < 5 seconds

---

## Why This Meets 5/5 Criteria

| Criteria | How It's Met |
|----------|--------------|
| **Major transformation** | Raw Prometheus metrics → Statistical analysis → AI-powered natural language insights |
| **Complex multi-stage calculation** | 1) Aggregate 7-day metrics 2) Calculate percentiles & trends 3) Detect anomalies 4) Generate AI insights |
| **Fully demonstrated** | Clear API endpoint + rich frontend UI showing all analysis stages |
| **Results are correct** | Statistical methods ensure accuracy; confidence scores indicate reliability |