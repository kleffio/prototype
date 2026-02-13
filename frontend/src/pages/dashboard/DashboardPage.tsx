import { getLocale } from "@app/locales/locale";
import { CreateProjectModal } from "@features/projects/components/CreateProjectModal";
import { getProjectUsage } from "@features/observability/api/getProjectMetrics";
import type { ProjectUsage } from "@features/observability/types/projectUsage.types";
import { useProjects } from "@features/projects/hooks/useProjects";
import { MiniCard } from "@shared/ui/MiniCard";
import { Button } from "@shared/ui/Button";
import { RefreshCw, Server, Cpu, HardDrive, Activity, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export function DashboardPage() {
  const { projects, isLoading: projectsLoading } = useProjects();
  const [projectUsages, setProjectUsages] = useState<ProjectUsage[]>([]);
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

  const fetchProjectMetrics = async () => {
    if (projectsLoading) return;
    
    if (projects.length === 0) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const usagePromises = projects.map(project => 
        getProjectUsage(project.projectId).catch(err => {
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
  };

  useEffect(() => {
    if (!projectsLoading) {
      fetchProjectMetrics();
      const interval = setInterval(fetchProjectMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [projects, projectsLoading]);

  // Calculate aggregated metrics
  const totalCpuCores = projectUsages.reduce((sum, usage) => sum + usage.cpuRequestCores, 0);
  const totalMemoryGB = projectUsages.reduce((sum, usage) => sum + usage.memoryUsageGB, 0);
  const activeProjects = projects.length;
  const projectsWithUsage = projectUsages.length;

  if (loading && projectUsages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">  
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Projects Dashboard</h1>
          <p className="text-muted-foreground">Resource usage and performance across your projects</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProjectMetrics}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            New Project
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniCard title="Total Projects">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{activeProjects}</div>
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </MiniCard>
        <MiniCard title="Projects with Data">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{projectsWithUsage}</div>
            <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        </MiniCard>
        <MiniCard title="Total CPU Usage">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{totalCpuCores.toFixed(2)} cores</div>
            <Cpu className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
        </MiniCard>
        <MiniCard title="Total Memory Usage">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{totalMemoryGB.toFixed(2)} GB</div>
            <HardDrive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </MiniCard>
      </div>

      {/* Project Usage Table */}
      {projectUsages.length > 0 && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resource Usage by Project
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Project</th>
                    <th className="pb-3 font-medium">CPU Cores</th>
                    <th className="pb-3 font-medium">Memory (GB)</th>
                    <th className="pb-3 font-medium">Window</th>
                  </tr>
                </thead>
                <tbody>
                  {projectUsages
                    .sort((a, b) => b.cpuRequestCores - a.cpuRequestCores)
                    .map((usage) => {
                      const project = projects.find(p => p.projectId === usage.projectID);
                      return (
                        <tr key={usage.projectID} className="border-b last:border-0">
                          <td className="py-3">
                            <div className="font-medium">{project?.name || usage.projectID}</div>
                            <div className="text-xs text-muted-foreground">{usage.projectID}</div>
                          </td>
                          <td className="py-3">{usage.cpuRequestCores.toFixed(2)}</td>
                          <td className="py-3">{usage.memoryUsageGB.toFixed(2)}</td>
                          <td className="py-3">
                            <span className="text-xs text-muted-foreground">{usage.window}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {projects.length === 0 && !projectsLoading && (
        <div className="text-center py-12">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
          <p className="text-muted-foreground mb-4">Create your first project to start monitoring resources</p>
          <Button onClick={() => setIsModalOpen(true)}>Create Project</Button>
        </div>
      )}

      {/* Last Update */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>

      <CreateProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}