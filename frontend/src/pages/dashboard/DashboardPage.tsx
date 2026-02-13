import { getLocale } from "@app/locales/locale";
import { CreateProjectModal } from "@features/projects/components/CreateProjectModal";
import { getProjectUsage } from "@features/observability/api/getProjectMetrics";
import type { ProjectUsage } from "@features/observability/types/projectUsage.types";
import { useProjects } from "@features/projects/hooks/useProjects";
import { MiniCard } from "@shared/ui/MiniCard";
import { Button } from "@shared/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/ui/Table";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { RefreshCw, Server, Cpu, HardDrive, Activity, TrendingUp, BookOpen, Network, Database } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { TutorialSheet } from "./components/TutorialSheet";
import { NetworkDiskGraph } from "./components/NetworkDiskGraph";

export function DashboardPage() {
  const { projects: allProjects, isLoading: projectsLoading, reload } = useProjects();
  // Filter out deleted projects to match ProjectsPage behavior
  const projects = useMemo(() => 
    allProjects.filter(p => p.projectStatus !== "DELETED"),
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

  const fetchProjectMetrics = async () => {
    if (projectsLoading) return;
    
    if (projects.length === 0) {
      setProjectUsages([]);
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
  }, [projectsLoading, fetchProjectMetrics]);

  // Calculate aggregated metrics
  const totalCpuCores = projectUsages.reduce((sum, usage) => sum + usage.cpuRequestCores, 0);
  const totalMemoryGB = projectUsages.reduce((sum, usage) => sum + usage.memoryUsageGB, 0);
  const totalNetworkRx = projectUsages.reduce((sum, usage) => sum + (usage.networkReceiveBytesPerSec || 0), 0);
  const totalNetworkTx = projectUsages.reduce((sum, usage) => sum + (usage.networkTransmitBytesPerSec || 0), 0);
  const totalDiskRead = projectUsages.reduce((sum, usage) => sum + (usage.diskReadBytesPerSec || 0), 0);
  const totalDiskWrite = projectUsages.reduce((sum, usage) => sum + (usage.diskWriteBytesPerSec || 0), 0);
  
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
            variant="ghost"
            size="sm"
            onClick={() => setIsTutorialOpen(true)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <BookOpen className="h-4 w-4" />
            Guide
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reload()}
            disabled={loading || projectsLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading || projectsLoading ? "animate-spin" : ""}`} />
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniCard title="Active Projects">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{activeProjects}</div>
            <Server className="h-5 w-5 text-primary" />
          </div>
        </MiniCard>
        <MiniCard title="Projects with Data">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{projectsWithUsage}</div>
            <Activity className="h-5 w-5 text-primary" />
          </div>
        </MiniCard>
        <MiniCard title="Real-time CPU Load">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{totalCpuCores.toFixed(2)} cores</div>
            <Cpu className="h-5 w-5 text-primary" />
          </div>
        </MiniCard>
        <MiniCard title="Real-time Memory">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{totalMemoryGB.toFixed(2)} GB</div>
            <HardDrive className="h-5 w-5 text-primary" />
          </div>
        </MiniCard>
        <MiniCard title="Current Network">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
               <span className="text-lg font-bold">In: {(totalNetworkRx / 1024 / 1024).toFixed(2)} MB/s</span>
               <span className="text-sm text-neutral-400">Out: {(totalNetworkTx / 1024 / 1024).toFixed(2)} MB/s</span>
            </div>
            <Network className="h-5 w-5 text-primary" />
          </div>
        </MiniCard>
        <MiniCard title="Current Disk I/O">
          <div className="flex items-center justify-between">
             <div className="flex flex-col">
               <span className="text-lg font-bold">R: {(totalDiskRead / 1024 / 1024).toFixed(2)} MB/s</span>
               <span className="text-sm text-neutral-400">W: {(totalDiskWrite / 1024 / 1024).toFixed(2)} MB/s</span>
            </div>
            <Database className="h-5 w-5 text-primary" />
          </div>
        </MiniCard>
      </div>

      {/* Graphs */}
      <NetworkDiskGraph />

      {/* Project Usage Table */}
      {projectUsages.length > 0 && (
        <SoftPanel>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-neutral-400" />
            <h3 className="text-lg font-semibold text-neutral-50">Resource Usage by Project</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>CPU Cores</TableHead>
                  <TableHead>Memory (GB)</TableHead>
                  <TableHead>Network (KB/s)</TableHead>
                  <TableHead>Disk (KB/s)</TableHead>
                  <TableHead>Window</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectUsages
                  .sort((a, b) => b.cpuRequestCores - a.cpuRequestCores)
                  .map((usage) => {
                    const project = projects.find(p => p.projectId === usage.projectID);
                    
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
                             <span className="text-neutral-300">↓ {((usage.networkReceiveBytesPerSec || 0) / 1024).toFixed(1)}</span>
                             <span className="text-neutral-500">↑ {((usage.networkTransmitBytesPerSec || 0) / 1024).toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                             <span className="text-neutral-300">R: {((usage.diskReadBytesPerSec || 0) / 1024).toFixed(1)}</span>
                             <span className="text-neutral-500">W: {((usage.diskWriteBytesPerSec || 0) / 1024).toFixed(1)}</span>
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

      <TutorialSheet 
        open={isTutorialOpen} 
        onOpenChange={setIsTutorialOpen} 
      />
    </div>
  );
}