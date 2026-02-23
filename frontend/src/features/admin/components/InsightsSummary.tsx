import type { InsightsResponse } from "../types/insights";

interface InsightsSummaryProps {
  data: InsightsResponse;
}

export function InsightsSummary({ data }: InsightsSummaryProps) {
  const criticalCount = data.recommendations.filter((r) => r.severity === "critical").length;
  const highCount = data.recommendations.filter((r) => r.severity === "high").length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/70 p-4">
        <p className="text-xs text-neutral-400 uppercase">Potential Savings</p>
        <p className="mt-2 text-2xl font-semibold text-emerald-300">
          ${data.costSavings.estimatedMonthlyUsd.toFixed(0)}/mo
        </p>
      </div>
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-xs text-red-200 uppercase">Critical</p>
        <p className="mt-2 text-2xl font-semibold text-red-300">{criticalCount}</p>
      </div>
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
        <p className="text-xs text-orange-200 uppercase">High Severity</p>
        <p className="mt-2 text-2xl font-semibold text-orange-300">{highCount}</p>
      </div>
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/70 p-4">
        <p className="text-xs text-neutral-400 uppercase">Namespaces Analyzed</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-100">{data.summary.totalNamespaces}</p>
      </div>
    </div>
  );
}
