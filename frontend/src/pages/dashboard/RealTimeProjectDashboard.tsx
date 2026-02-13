import { getLocale } from "@app/locales/locale";
import { CreateProjectModal } from "@features/projects/components/CreateProjectModal";
import { NamespaceSelector } from "@features/observability/components/NamespaceSelector";
import { ResourceChart } from "@features/observability/components/ResourceChart";
import { getNamespaceMetrics, getProjectOverviewMetrics } from "@features/observability/api/getNamespaceMetrics";
import type { NamespaceMetrics, ProjectOverviewMetrics } from "@features/observability/api/getNamespaceMetrics";
import { Button } from "@shared/ui/Button";
import { MiniCard } from "@shared/ui/MiniCard";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { AlertCircle, RefreshCw, Activity, Server } from "lucide-react";
import { useEffect, useState } from "react";

// Import translations
import enTranslations from "@app/locales/en/dashboard.json";
import frTranslations from "@app/locales/fr/dashboard.json";

const translations = {
  en: enTranslations,
  fr: frTranslations
};

export function RealTimeProjectDashboard() {
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  const [namespaceMetrics, setNamespaceMetrics] = useState<NamespaceMetrics | null>(null);
  const [overviewMetrics, setOverviewMetrics] = useState<ProjectOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());

  // Listen for locale changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].dashboard;

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedNamespace) {
        // Fetch namespace-specific metrics
        const nsMetrics = await getNamespaceMetrics(selectedNamespace);
        setNamespaceMetrics(nsMetrics);
        setOverviewMetrics(null);
      } else {
        // Fetch overview metrics for all projects
        const overview = await getProjectOverviewMetrics();
        setOverviewMetrics(overview);
        setNamespaceMetrics(null);
      }

      setLastUpdate(new Date());
    } catch (err) {
      setError(t.prometheus_error);
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNamespace]);

  const handleNamespaceChange = (namespace: string | null) => {
    setSelectedNamespace(namespace);
  };

  const renderProjectSpecificMetrics = () => {
    if (!namespaceMetrics) return null;

    return (
      <>
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniCard title={t.pod_count}>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-neutral-50">
                {namespaceMetrics.podCount.value}
              </span>
              <span className="text-xs text-neutral-400">
                {t.running_pods}
              </span>
            </div>
          </MiniCard>

          <MiniCard title={t.namespace_cpu}>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-neutral-50">
                {namespaceMetrics.cpuUsage.value}
              </span>
              <span className="text-xs text-emerald-400">
                {namespaceMetrics.cpuUsage.changePercent}
              </span>
            </div>
          </MiniCard>

          <MiniCard title={t.namespace_memory}>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-neutral-50">
                {namespaceMetrics.memoryUsage.value}
              </span>
              <span className="text-xs text-emerald-400">
                {namespaceMetrics.memoryUsage.changePercent}
              </span>
            </div>
          </MiniCard>

          {namespaceMetrics.requestsMetric && (
            <MiniCard title={t.requests_per_second}>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-neutral-50">
                  {namespaceMetrics.requestsMetric.value}
                </span>
                <span className="text-xs text-emerald-400">
                  {namespaceMetrics.requestsMetric.changePercent}
                </span>
              </div>
            </MiniCard>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SoftPanel>
            <h2 className="mb-4 text-lg font-semibold text-neutral-50">{t.cpu_utilization}</h2>
            <ResourceChart
              title={t.cpu_utilization}
              data={namespaceMetrics.cpuUtilization}
              color="#fb923c"
              loading={false}
            />
          </SoftPanel>

          <SoftPanel>
            <h2 className="mb-4 text-lg font-semibold text-neutral-50">{t.memory_utilization}</h2>
            <ResourceChart
              title={t.memory_utilization}
              data={namespaceMetrics.memoryUtilization}
              color="#10b981"
              loading={false}
            />
          </SoftPanel>
        </section>
      </>
    );
  };

  const renderOverviewMetrics = () => {
    if (!overviewMetrics) return null;

    return (
      <>
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniCard title={t.project_overview}>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-neutral-50">
                {overviewMetrics.totalProjects}
              </span>
              <span className="text-xs text-neutral-400">
                {t.all_projects}
              </span>
            </div>
          </MiniCard>

          <MiniCard title={t.total_pods}>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-neutral-50">
                {overviewMetrics.totalPods}
              </span>
              <span className="text-xs text-neutral-400">
                cluster-wide
              </span>
            </div>
          </MiniCard>

          <MiniCard title={t.cpu_usage}>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-neutral-50">
                {overviewMetrics.totalCpuCores.toFixed(2)}
              </span>
              <span className="text-xs text-neutral-400">
                {t.cores}
              </span>
            </div>
          </MiniCard>

          <MiniCard title="Memory Usage">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-neutral-50">
                {overviewMetrics.totalMemoryGB.toFixed(2)}
              </span>
              <span className="text-xs text-neutral-400">
                {t.gb}
              </span>
            </div>
          </MiniCard>
        </section>

        <section>
          <SoftPanel>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Server className="h-4 w-4" />
                  <span>Cluster Nodes</span>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-neutral-50">
                    {overviewMetrics.clusterOverview.runningNodes}/{overviewMetrics.clusterOverview.totalNodes}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    nodes running
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Activity className="h-4 w-4" />
                  <span>Cluster CPU</span>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-neutral-50">
                    {overviewMetrics.clusterOverview.cpuUsagePercent.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    average utilization
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Activity className="h-4 w-4" />
                  <span>Cluster Memory</span>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-neutral-50">
                    {overviewMetrics.clusterOverview.memoryUsagePercent.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    average utilization
                  </div>
                </div>
              </div>
            </div>

            {overviewMetrics.uptimeFormatted && (
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div className="text-xs text-emerald-200">
                  <div className="font-medium">System Uptime</div>
                  <div className="mt-1 text-emerald-300/80">
                    {overviewMetrics.uptimeFormatted}
                  </div>
                </div>
              </div>
            )}
          </SoftPanel>
        </section>
      </>
    );
  };

  return (
    <div className="app-container py-8">
      <section className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-50">{t.real_time_metrics}</h1>
            <p className="mt-1 text-sm text-neutral-400">{t.overview_subtitle}</p>
          </div>
          
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400">
                {t.last_updated} {lastUpdate.toLocaleTimeString()}
              </span>
              <Button
                onClick={() => fetchMetrics()}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                {t.refresh}
              </Button>
            </div>
            
            <NamespaceSelector
              selectedNamespace={selectedNamespace}
              onNamespaceChange={handleNamespaceChange}
            />
            
            <Button
              onClick={() => setIsModalOpen(true)}
              size="lg"
              className="bg-gradient-kleff rounded-full px-6 text-sm font-semibold text-black"
            >
              {t.deploy_new_project}
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <section className="mb-6">
          <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <div className="font-medium">{t.prometheus_unavailable}</div>
              <div className="text-sm">{error}</div>
            </div>
            <Button
              onClick={fetchMetrics}
              variant="outline" 
              size="sm"
              className="ml-auto"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        </section>
      )}

      {loading && (
        <section className="mb-8">
          <SoftPanel>
            <div className="flex justify-center py-12">
              <div className="text-center">
                <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-kleff-primary border-t-transparent mx-auto"></div>
                <p className="text-sm text-neutral-400">Loading metrics...</p>
              </div>
            </div>
          </SoftPanel>
        </section>
      )}

      {!loading && !error && (
        <>
          {selectedNamespace && renderProjectSpecificMetrics()}
          {!selectedNamespace && renderOverviewMetrics()}

          {!namespaceMetrics && !overviewMetrics && (
            <section>
              <SoftPanel>
                <div className="py-12 text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
                  <h3 className="mb-2 text-lg font-semibold text-neutral-50">
                    {t.no_data_available}
                  </h3>
                  <p className="text-sm text-neutral-400">
                    {selectedNamespace 
                      ? `No metrics available for namespace "${selectedNamespace}"`
                      : "No cluster metrics available"
                    }
                  </p>
                  <Button
                    onClick={fetchMetrics}
                    variant="outline"
                    className="mt-4"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              </SoftPanel>
            </section>
          )}
        </>
      )}

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setIsModalOpen(false)}
      />
    </div>
  );
}