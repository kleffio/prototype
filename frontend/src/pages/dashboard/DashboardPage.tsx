import { getLocale } from "@app/locales/locale";
import enTranslations from "@app/locales/en/dashboard.json";
import frTranslations from "@app/locales/fr/dashboard.json";
import { CreateProjectModal } from "@features/projects/components/CreateProjectModal";
import { getProjectUsage } from "@features/observability/api/getProjectMetrics";
import type { ProjectUsage } from "@features/observability/types/projectUsage.types";
import { useProjects } from "@features/projects/hooks/useProjects";
import { MiniCard } from "@shared/ui/MiniCard";
import { Button } from "@shared/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/ui/Table";
import { SoftPanel } from "@shared/ui/SoftPanel";
import {
  RefreshCw,
  Server,
  Cpu,
  HardDrive,
  Activity,
  TrendingUp,
  BookOpen,
  Database
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { TutorialSheet } from "./components/TutorialSheet";
import { DiskGraph } from "./components/DiskGraph";

const translations = { en: enTranslations, fr: frTranslations };

export function DashboardPage() {
  const { projects: allProjects, isLoading: projectsLoading, reload } = useProjects();
  // Filter out deleted projects to match ProjectsPage behavior
  const projects = useMemo(
    () => allProjects.filter((p) => p.projectStatus !== "DELETED"),
    [allProjects]
  );

  const [projectUsages, setProjectUsages] = useState<ProjectUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
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

  const fetchProjectMetrics = useCallback(async () => {
    if (projectsLoading) return;

    if (projects.length === 0) {
      setProjectUsages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const usagePromises = projects.map((project) =>
        getProjectUsage(project.projectId).catch((err) => {
          console.warn(`Failed to fetch usage for project ${project.projectId}:`, err);
          return null;
        })
      );

      const usages = await Promise.all(usagePromises);
      const validUsages = usages.filter((usage): usage is ProjectUsage => usage !== null);

      setProjectUsages(validUsages);
      setLastUpdate(new Date());
    } catch (err) {
      setError("Failed to fetch project metrics");
      console.error("Error fetching project metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [projects, projectsLoading]);

  useEffect(() => {
    if (!projectsLoading) {
      fetchProjectMetrics();
      const interval = setInterval(fetchProjectMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [projectsLoading, fetchProjectMetrics]);

  // Calculate aggregated metrics
  const totalCpuCores = projectUsages.reduce((sum, usage) => sum + usage.cpuRequestCores, 0);
  const totalMemoryGB = projectUsages.reduce((sum, usage) => sum + usage.memoryUsageGB, 0);
  const totalDiskRead = projectUsages.reduce(
    (sum, usage) => sum + (usage.diskReadBytesPerSec || 0),
    0
  );
  const totalDiskWrite = projectUsages.reduce(
    (sum, usage) => sum + (usage.diskWriteBytesPerSec || 0),
    0
  );

  const activeProjects = projects.length;
  const projectsWithUsage = projectUsages.length;

  if (loading && projectUsages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="text-muted-foreground ml-2">{t.project_usage.loading}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4">
      {/* WCAG 2.0 AA: Main content with id for skip link target */}
      <h1 className="sr-only">{t.overview_title}</h1>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.overview_title}</h2>
          <p className="text-muted-foreground">{t.overview_subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTutorialOpen(true)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            {t.quick_actions}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reload()}
            disabled={loading || projectsLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading || projectsLoading ? "animate-spin" : ""}`} />
            {t.refresh}
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>{t.deploy_new_project}</Button>
        </div>
      </div>

      {/* WCAG 2.0 AA: Error Display with live region */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-4"
        >
          {t.project_usage.error}
        </div>
      )}

      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniCard title={t.project_overview}>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{activeProjects}</div>
            <Server className="text-primary h-5 w-5" />
          </div>
        </MiniCard>
        <MiniCard title={t.projects_with_data || t.metrics_overview}>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{projectsWithUsage}</div>
            <Activity className="text-primary h-5 w-5" />
          </div>
        </MiniCard>
        <MiniCard title={t.cpu_usage || t.performance}>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {totalCpuCores.toFixed(2)} {t.cores}
            </div>
            <Cpu className="text-primary h-5 w-5" />
          </div>
        </MiniCard>
        <MiniCard title={t.memory_utilization}>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {totalMemoryGB.toFixed(2)} {t.gb}
            </div>
            <HardDrive className="text-primary h-5 w-5" />
          </div>
        </MiniCard>
        <MiniCard title={t.avg_disk || t.current_disk_io || "Current Disk I/O"}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                R: {(totalDiskRead / 1024 / 1024).toFixed(2)} MB/s
              </span>
              <span className="text-sm text-neutral-400">
                W: {(totalDiskWrite / 1024 / 1024).toFixed(2)} MB/s
              </span>
            </div>
            <Database className="text-primary h-5 w-5" />
          </div>
        </MiniCard>
      </div>

      {/* Graphs */}
      <DiskGraph />

      {/* WCAG 2.0 AA: Project Usage Table with caption */}
      {projectUsages.length > 0 && (
        <SoftPanel>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            <h3 id="resource-usage-heading" className="text-lg font-semibold text-neutral-50">
              {t.project_metrics?.title || t.project_usage.title || "Resource Usage by Project"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table aria-labelledby="resource-usage-heading">
              <caption className="sr-only">
                {t.project_metrics?.title ||
                  t.project_usage.title ||
                  "Resource usage metrics for all projects including CPU cores, memory usage, disk I/O, and measurement window."}
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">
                    {t.resource_attribution?.headers?.project || t.project_filter || "Project"}
                  </TableHead>
                  <TableHead scope="col">
                    {t.project_metrics?.avg_cpu || t.cpu_usage || "CPU Cores"}
                  </TableHead>
                  <TableHead scope="col">
                    {t.project_metrics?.avg_memory || t.memory_utilization || "Memory (GB)"}
                  </TableHead>
                  <TableHead scope="col">{t.project_metrics?.avg_disk || "Disk (KB/s)"}</TableHead>
                  <TableHead scope="col">{t.project_usage?.time_window || "Window"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectUsages
                  .sort((a, b) => b.cpuRequestCores - a.cpuRequestCores)
                  .map((usage) => {
                    const project = projects.find((p) => p.projectId === usage.projectID);

                    // Filter out usages for projects that no longer exist in the main list
                    if (!project) return null;

                    return (
                      <TableRow key={usage.projectID}>
                        <TableCell>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-neutral-500">{usage.projectID}</div>
                        </TableCell>
                        <TableCell>{usage.cpuRequestCores.toFixed(3)}</TableCell>
                        <TableCell>{usage.memoryUsageGB.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="text-neutral-300">
                              R: {((usage.diskReadBytesPerSec || 0) / 1024).toFixed(1)}
                            </span>
                            <span className="text-neutral-500">
                              W: {((usage.diskWriteBytesPerSec || 0) / 1024).toFixed(1)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-neutral-500">{usage.window}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </SoftPanel>
      )}

      {/* Empty State */}
      {projects.length === 0 && !projectsLoading && (
        <div className="py-12 text-center">
          <Server className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">{t.no_projects_available}</h3>
          <p className="text-muted-foreground mb-4">{t.create_new_deployment}</p>
          <Button onClick={() => setIsModalOpen(true)}>{t.deploy_new_project}</Button>
        </div>
      )}

      {/* Last Update */}
      <div className="text-muted-foreground text-center text-sm">
        {t.last_updated} {lastUpdate.toLocaleTimeString()}
      </div>

      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <TutorialSheet open={isTutorialOpen} onOpenChange={setIsTutorialOpen} />
    </div>
  );
}
