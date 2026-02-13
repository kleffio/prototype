import { getAllMetrics } from "@features/observability/api/getAllMetrics";
import { MetricCard } from "@features/observability/components/MetricCard";
import { NamespacesTable } from "@features/observability/components/NamespacesTable";
import { NodesList } from "@features/observability/components/NodesList";
import { ResourceChart } from "@features/observability/components/ResourceChart";
import type {
  ClusterOverview,
  MetricCard as MetricCardType,
  NamespaceMetric,
  NodeMetric,
  ResourceUtilization
} from "@features/observability/types/metrics";
import enTranslations from "@app/locales/en/dashboard.json";
import frTranslations from "@app/locales/fr/dashboard.json";
import { getLocale } from "@app/locales/locale";
import { ExportMetricsButton } from "@features/observability/components/ExportMetricsButton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

const translations = { en: enTranslations, fr: frTranslations };

export function MetricsDashboard() {
  const [overview, setOverview] = useState<ClusterOverview | null>(null);
  const [requestsMetric, setRequestsMetric] = useState<MetricCardType | null>(null);
  const [podsMetric, setPodsMetric] = useState<MetricCardType | null>(null);
  const [nodesMetric, setNodesMetric] = useState<MetricCardType | null>(null);
  const [cpuData, setCpuData] = useState<ResourceUtilization | null>(null);
  const [memoryData, setMemoryData] = useState<ResourceUtilization | null>(null);
  const [nodes, setNodes] = useState<NodeMetric[]>([]);
  const [namespaces, setNamespaces] = useState<NamespaceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<string>("1h");
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].dashboard;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cluster-wide metrics
      const metrics = await getAllMetrics(timeRange);

      setOverview(metrics.overview);
      setRequestsMetric(metrics.requestsMetric);
      setPodsMetric(metrics.podsMetric);
      setNodesMetric(metrics.nodesMetric);
      setCpuData(metrics.cpuUtilization);
      setMemoryData(metrics.memoryUtilization);
      setNodes(metrics.nodes || []);
      setNamespaces(metrics.namespaces || []);

      setLastUpdate(new Date());
    } catch (err) {
      setError(t.cluster_error);
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  return (
    <div
      className="bg-kleff-bg relative isolate flex h-screen overflow-hidden"
      data-testid="systems-page"
    >
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="bg-modern-noise bg-kleff-spotlight h-full w-full opacity-60" />
        <div className="bg-kleff-grid absolute inset-0 opacity-[0.25]" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-white/10 via-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t from-black via-transparent" />

      <div className="flex-1 overflow-auto">
        <div className="app-container py-8">
          <div className="mb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-neutral-50">
                  {t.metrics_overview}
                </h1>
                <p className="mt-1 text-sm text-neutral-400">
                  {t.monitor_cluster}
                </p>
              </div>
              
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400">
                    {t.last_updated} {lastUpdate.toLocaleTimeString()}
                  </span>
                  <ExportMetricsButton />
                  <button
                    onClick={() => fetchData()}
                    className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:border-white/40 hover:bg-white/10"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t.refresh}
                  </button>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-neutral-200 hover:border-white/40 hover:bg-white/10 focus:ring-2 focus:ring-white/20 focus:outline-none"
                    style={{
                      colorScheme: "dark"
                    }}
                  >
                    {(Object.entries(t.time_ranges) as [string, string][]).map(([value, label]) => (
                      <option key={value} value={value} className="bg-neutral-900 text-neutral-200">
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="mb-4 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400"
              data-testid="systems-error"
            >
              <AlertCircle size={20} className="shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Render cluster-wide metrics */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              metric={
                requestsMetric ?? {
                  title: "",
                  value: "",
                  rawValue: 0,
                      changePercent: "",
                      changeLabel: "",
                      status: "good",
                      sparkline: []
                    }
                  }
                  loading={loading || !requestsMetric}
                />
                <MetricCard
                  metric={
                    podsMetric ?? {
                      title: "",
                      value: "",
                      rawValue: 0,
                      changePercent: "",
                      changeLabel: "",
                      status: "good",
                      sparkline: []
                    }
                  }
                  loading={loading || !podsMetric}
                />
                <MetricCard
                  metric={
                    nodesMetric ?? {
                      title: "",
                      value: "",
                      rawValue: 0,
                      changePercent: "",
                      changeLabel: "",
                      status: "good",
                      sparkline: []
                    }
                  }
                  loading={loading || !nodesMetric}
                />
                <MetricCard
                  metric={
                    overview && overview.cpuUsagePercent != null
                      ? {
                          title: t.cpu_usage,
                          value: `${overview.cpuUsagePercent.toFixed(1)}%`,
                          rawValue: overview.cpuUsagePercent,
                          changePercent: "+0.0%",
                          changeLabel: t.cluster_average,
                          status: overview.cpuUsagePercent > 80 ? "critical" : "good",
                          sparkline: []
                        }
                      : {
                          title: "",
                          value: "",
                          rawValue: 0,
                          changePercent: "",
                          changeLabel: "",
                          status: "good",
                          sparkline: []
                        }
                  }
                  loading={loading || !(overview && overview.cpuUsagePercent != null)}
                />
              </div>

              <div className="mb-6">
                <h2 className="mb-4 text-lg font-semibold text-neutral-50">{t.performance}</h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ResourceChart
                    title={t.cpu_utilization}
                    data={
                      cpuData ?? {
                        currentValue: 0,
                        changePercent: 0,
                        trend: "stable",
                        history: []
                      }
                    }
                    color="#fb923c"
                    loading={loading || !cpuData}
                  />
                  <ResourceChart
                    title={t.memory_utilization}
                    data={
                      memoryData ?? {
                        currentValue: 0,
                        changePercent: 0,
                        trend: "stable",
                        history: []
                      }
                    }
                    color="#10b981"
                    loading={loading || !memoryData}
                  />
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-lg font-semibold text-neutral-50">{t.infrastructure}</h2>
                <div className="space-y-6">
                  <NodesList nodes={nodes} loading={loading || nodes.length === 0} />
                  <NamespacesTable
                    namespaces={namespaces}
                    loading={loading || namespaces.length === 0}
                  />
                </div>
              </div>

        </div>
      </div>
    </div>
  );
}
