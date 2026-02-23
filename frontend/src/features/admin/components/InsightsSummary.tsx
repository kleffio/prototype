import { CheckCircle, XCircle, Zap, Database, Cpu, HardDrive, Clock, RefreshCw } from "lucide-react";
import type { InsightsResponse } from "../types/insights";

interface InsightsSummaryProps {
  data: InsightsResponse;
}

export function InsightsSummary({ data }: InsightsSummaryProps) {
  const criticalCount = data.recommendations.filter((r) => r.severity === "critical").length;
  const highCount = data.recommendations.filter((r) => r.severity === "high").length;
  const mediumCount = data.recommendations.filter((r) => r.severity === "medium").length;

  return (
    <div className="space-y-4">
      {/* Primary Stats Row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Cost Savings */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-300" />
            <p className="text-xs text-emerald-200 uppercase">Potential Savings</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            ${data.costSavings.estimatedMonthlyUsd.toFixed(0)}/mo
          </p>
          <div className="mt-2 space-y-1 text-xs text-emerald-200/70">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3" /> Idle CPU
              </span>
              <span>{data.costSavings.idleCpuCores.toFixed(2)} cores</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" /> Idle Memory
              </span>
              <span>{data.costSavings.idleMemoryGb.toFixed(1)} GiB</span>
            </div>
          </div>
        </div>

        {/* Critical Issues */}
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-300" />
            <p className="text-xs text-red-200 uppercase">Critical</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-red-300">{criticalCount}</p>
          <p className="mt-2 text-xs text-red-200/70">
            {criticalCount > 0 ? "Requires immediate attention" : "No critical issues"}
          </p>
        </div>

        {/* High Severity */}
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-300" />
            <p className="text-xs text-orange-200 uppercase">High Priority</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-orange-300">{highCount}</p>
          <p className="mt-2 text-xs text-orange-200/70">
            {highCount + mediumCount} total recommendations
          </p>
        </div>

        {/* Namespaces Analyzed */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/70 p-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-neutral-400" />
            <p className="text-xs text-neutral-400 uppercase">Namespaces</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-neutral-100">{data.summary.totalNamespaces}</p>
          <p className="mt-2 text-xs text-neutral-500">
            {data.summary.dataPointsProcessed.toLocaleString()} data points
          </p>
        </div>
      </div>

      {/* SLO Status & Metadata Row */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* SLO Status */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data.sloStatus.withinSLO ? (
                <CheckCircle className="h-5 w-5 text-emerald-300" />
              ) : (
                <XCircle className="h-5 w-5 text-red-300" />
              )}
              <h4 className="text-sm font-medium text-neutral-100">SLO Status</h4>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                data.sloStatus.withinSLO
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-red-500/20 text-red-300"
              }`}
            >
              {data.sloStatus.withinSLO ? "Within SLO" : "SLO Breached"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-neutral-500">Error Rate</p>
              <p className="text-lg font-semibold text-neutral-100">
                {data.sloStatus.errorRatePercent.toFixed(2)}%
              </p>
              <p className="text-xs text-neutral-500">of {data.sloStatus.sloTargetPercent}% target</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Error Budget</p>
              <p className="text-lg font-semibold text-neutral-100">
                {data.sloStatus.errorBudgetRemainingPercent.toFixed(0)}%
              </p>
              <p className="text-xs text-neutral-500">remaining</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Anomalies</p>
              <p className="text-lg font-semibold text-neutral-100">
                {data.summary.totalAnomalies}
              </p>
              <p className="text-xs text-neutral-500">detected</p>
            </div>
          </div>

          {/* Error Budget Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Error Budget Used</span>
              <span>{(100 - data.sloStatus.errorBudgetRemainingPercent).toFixed(0)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className={`h-full transition-all ${
                  data.sloStatus.errorBudgetRemainingPercent > 50
                    ? "bg-emerald-500"
                    : data.sloStatus.errorBudgetRemainingPercent > 20
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${data.sloStatus.errorBudgetRemainingPercent}%` }}
              />
            </div>
          </div>

          {data.sloStatus.note && (
            <p className="mt-2 text-xs text-neutral-500">{data.sloStatus.note}</p>
          )}
        </div>

        {/* Analysis Metadata */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-neutral-400" />
            <h4 className="text-sm font-medium text-neutral-100">Analysis Info</h4>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Generation Time</span>
              <span className="flex items-center gap-1 text-neutral-200">
                <Clock className="h-3 w-3" />
                {data.metadata.generationMs}ms
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Cache Status</span>
              <span className={`flex items-center gap-1 ${data.metadata.cacheHit ? "text-emerald-300" : "text-neutral-200"}`}>
                <RefreshCw className="h-3 w-3" />
                {data.metadata.cacheHit ? "Cache Hit" : "Fresh Data"}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Analysis Window</span>
              <span className="text-neutral-200">{data.metadata.analysisWindow}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Anomaly Threshold</span>
              <span className="text-neutral-200">
                {data.metadata.thresholdsUsed.anomalyStdDev}σ
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">SLO Target</span>
              <span className="text-neutral-200">
                {data.metadata.thresholdsUsed.sloErrorRateTargetPercent}% error rate
              </span>
            </div>

            {data.summary.partialData && (
              <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-200">
                Some metrics were unavailable. Results may be incomplete.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// DollarSign icon component since lucide may not have it
function DollarSign({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}