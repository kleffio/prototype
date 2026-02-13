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
import { ExportMetricsButton } from "@features/observability/components/ExportMetricsButton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

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
      setError(
        "Unable to retrieve cluster metrics. Please verify the observability service is running and accessible."
      );
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
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-neutral-50">Metrics Overview</h1>
                <p className="mt-1 text-sm text-neutral-400">
                  Monitor your Kubernetes cluster metrics
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
                <ExportMetricsButton />
                <button
                  onClick={() => fetchData()}
                  className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:border-white/40 hover:bg-white/10"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-neutral-200 hover:border-white/40 hover:bg-white/10 focus:ring-2 focus:ring-white/20 focus:outline-none"
                  style={{
                    colorScheme: "dark"
                  }}
                >
                  <option value="5m" className="bg-neutral-900 text-neutral-200">
                    Last 5 minutes
                  </option>
                  <option value="15m" className="bg-neutral-900 text-neutral-200">
                    Last 15 minutes
                  </option>
                  <option value="30m" className="bg-neutral-900 text-neutral-200">
                    Last 30 minutes
                  </option>
                  <option value="1h" className="bg-neutral-900 text-neutral-200">
                    Last 1 hour
                  </option>
                  <option value="3h" className="bg-neutral-900 text-neutral-200">
                    Last 3 hours
                  </option>
                  <option value="6h" className="bg-neutral-900 text-neutral-200">
                    Last 6 hours
                  </option>
                  <option value="12h" className="bg-neutral-900 text-neutral-200">
                    Last 12 hours
                  </option>
                  <option value="24h" className="bg-neutral-900 text-neutral-200">
                    Last 24 hours
                  </option>
                </select>
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
                      title: "CPU Usage",
                      value: `${overview.cpuUsagePercent.toFixed(1)}%`,
                      rawValue: overview.cpuUsagePercent,
                      changePercent: "+0.0%",
                      changeLabel: "Cluster average",
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
            <h2 className="mb-4 text-lg font-semibold text-neutral-50">Performance</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ResourceChart
                title="CPU Utilization"
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
                title="Memory Utilization"
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
            <h2 className="mb-4 text-lg font-semibold text-neutral-50">Infrastructure</h2>
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
