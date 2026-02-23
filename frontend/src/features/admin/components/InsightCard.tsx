import { Lightbulb } from "lucide-react";
import type { InsightRecommendation } from "../types/insights";
import { SeverityBadge } from "./SeverityBadge";

interface InsightCardProps {
  insight: InsightRecommendation;
}

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <article className="rounded-xl border border-neutral-800/80 bg-neutral-900/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-kleff-gold" />
          <p className="text-xs font-semibold tracking-wide text-neutral-300 uppercase">
            {insight.type.replaceAll("_", " ")}
          </p>
        </div>
        <SeverityBadge severity={insight.severity} />
      </div>

      <p className="text-sm font-medium text-neutral-100">{insight.resource}</p>
      <p className="mt-2 text-sm text-neutral-400">{insight.current}</p>
      <p className="mt-2 text-sm text-neutral-200">
        <span className="text-kleff-gold">→</span> {insight.recommendation}
      </p>

      {insight.savings && <p className="mt-2 text-sm text-emerald-300">Savings: {insight.savings}</p>}
      {insight.impact && <p className="mt-1 text-sm text-neutral-300">Impact: {insight.impact}</p>}

      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
        <span>{insight.basedOn ?? "rule-based analysis"}</span>
        <span>{Math.round((insight.confidence ?? 0.7) * 100)}% confidence</span>
      </div>
    </article>
  );
}
