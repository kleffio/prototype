import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";

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
    return <InsightsLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
        <p className="font-medium">Unable to load insights</p>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={() => void fetchInsights()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm transition hover:bg-red-500/30"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
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
            <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-100">
              <Sparkles className="h-4 w-4 text-kleff-gold" />
              Recommendations
            </h3>
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
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-center text-sm text-neutral-400">
            No recommendations match this filter.
          </div>
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
          {data.anomalies.length > 0 && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300">
              {data.anomalies.length} detected
            </span>
          )}
        </div>
        {data.anomalies.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-center text-sm text-neutral-400">
            No active anomalies detected. Your cluster is running smoothly.
          </div>
        ) : (
          <div className="space-y-3">
            {data.anomalies.map((anomaly, idx) => (
              <div
                key={`${anomaly.resource}-${anomaly.type}-${idx}`}
                className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 transition hover:border-orange-500/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-100">
                      {anomaly.resource}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {anomaly.type.replaceAll("_", " ")} · {anomaly.value}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      anomaly.severity === "critical"
                        ? "bg-red-500/20 text-red-300"
                        : anomaly.severity === "high"
                          ? "bg-orange-500/20 text-orange-300"
                          : "bg-yellow-500/20 text-yellow-300"
                    }`}
                  >
                    {anomaly.severity}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
                  <span>Baseline: {anomaly.baseline}</span>
                  <span>Current: {anomaly.current}</span>
                  <span>Detected: {new Date(anomaly.detectedAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InsightsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Primary Stats Skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-4">
            <Skeleton className="h-4 w-24 bg-neutral-800" />
            <Skeleton className="mt-2 h-8 w-20 bg-neutral-800" />
            <Skeleton className="mt-2 h-3 w-32 bg-neutral-800" />
          </div>
        ))}
      </div>

      {/* SLO & Metadata Skeleton */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-4">
            <Skeleton className="h-5 w-24 bg-neutral-800" />
            <div className="mt-4 grid grid-cols-3 gap-4">
              {[1, 2, 3].map((j) => (
                <div key={j}>
                  <Skeleton className="h-3 w-16 bg-neutral-800" />
                  <Skeleton className="mt-1 h-6 w-12 bg-neutral-800" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-2 w-full bg-neutral-800" />
          </div>
        ))}
      </div>

      {/* Recommendations Skeleton */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-32 bg-neutral-800" />
            <Skeleton className="mt-1 h-4 w-48 bg-neutral-800" />
          </div>
          <Skeleton className="h-9 w-24 bg-neutral-800" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
            <Skeleton className="h-4 w-48 bg-neutral-800" />
            <Skeleton className="mt-2 h-3 w-full max-w-md bg-neutral-800" />
            <Skeleton className="mt-1 h-3 w-64 bg-neutral-800" />
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Analyzing cluster metrics...
      </div>
    </div>
  );
}