export type InsightSeverity = "low" | "medium" | "high" | "critical";
export type InsightType =
  | "right_sizing"
  | "scaling"
  | "reliability"
  | "anomaly"
  | "cost_optimization"
  | "slo";

export interface InsightRecommendation {
  type: string;
  severity: InsightSeverity;
  resource: string;
  current: string;
  recommendation: string;
  savings?: string;
  impact?: string;
  confidence?: number;
  basedOn?: string;
}

export interface InsightAnomaly {
  detectedAt: string;
  type: string;
  resource: string;
  value: string;
  baseline: string;
  current: string;
  severity: InsightSeverity;
}

export interface CostSavingsInsight {
  idleCpuCores: number;
  idleMemoryGb: number;
  estimatedMonthlyUsd: number;
  note?: string;
}

export interface SLOStatus {
  sloTargetPercent: number;
  errorRatePercent: number;
  withinSLO: boolean;
  errorBudgetRemainingPercent: number;
  note?: string;
}

export interface InsightsSummary {
  totalNamespaces: number;
  totalRecommendations: number;
  totalAnomalies: number;
  dataPointsProcessed: number;
  partialData: boolean;
}

export interface InsightsMetadata {
  generationMs: number;
  cacheHit: boolean;
  analysisWindow: string;
  thresholdsUsed: {
    anomalyStdDev: number;
    sloErrorRateTargetPercent: number;
  };
}

export interface InsightsResponse {
  recommendations: InsightRecommendation[];
  anomalies: InsightAnomaly[];
  costSavings: CostSavingsInsight;
  sloStatus: SLOStatus;
  summary: InsightsSummary;
  metadata: InsightsMetadata;
  generatedAt: string;
}

export const SEVERITY_CLASSES: Record<InsightSeverity, string> = {
  low: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  critical: "bg-red-500/15 text-red-300 border-red-500/30"
};
