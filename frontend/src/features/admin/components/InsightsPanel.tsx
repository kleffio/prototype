import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { getInsights } from "@features/admin/api/getInsights";
import type { InsightsResponse, InsightSeverity } from "@features/admin/types/insights";
import { InsightsSummary } from "./InsightsSummary";
import { InsightCard } from "./InsightCard";
import { Skeleton } from "@shared/ui/Skeleton";

type FilterType = "all" | InsightSeverity;

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
      const response = await getInsights(auth.user.access_token, "7d");
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [auth.user?.access_token]);

  useEffect(() => {
    void fetchInsights();
  }, [fetchInsights]);

  const filteredRecommendations = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.recommendations;
    return data.recommendations.filter((rec) => rec.severity === filter);
  }, [data, filter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full bg-neutral-800" />
        <Skeleton className="h-56 w-full bg-neutral-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
        <p className="font-medium">Unable to load insights</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-4 text-sm text-neutral-400">
        No insights available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InsightsSummary data={data} />

      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">Insights</h3>
            <p className="text-sm text-neutral-400">
              Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={() => void fetchInsights()}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {filteredRecommendations.length === 0 ? (
          <p className="text-sm text-neutral-400">No recommendations match this filter.</p>
        ) : (
          <div className="space-y-3">
            {filteredRecommendations.map((insight, idx) => (
              <InsightCard key={`${insight.type}-${insight.resource}-${idx}`} insight={insight} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-300" />
          <h3 className="text-base font-semibold text-neutral-100">Anomalies</h3>
        </div>
        {data.anomalies.length === 0 ? (
          <p className="text-sm text-neutral-400">No active anomalies detected.</p>
        ) : (
          <div className="space-y-3">
            {data.anomalies.map((anomaly, idx) => (
              <div key={`${anomaly.resource}-${anomaly.type}-${idx}`} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <p className="text-sm font-medium text-neutral-100">
                  {anomaly.resource} · {anomaly.type.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-sm text-neutral-300">{anomaly.value}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Baseline: {anomaly.baseline} · Current: {anomaly.current}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
