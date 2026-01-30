import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@shared/ui/Button";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Spinner } from "@shared/ui/Spinner";
import { Badge } from "@shared/ui/Badge";
import {
  Hash,
  User,
  Layers,
  Activity,
  Calendar,
  Box,
  Users,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Crown
} from "lucide-react";
import { useProject } from "@features/projects/hooks/useProject";
import { useProjectContainers } from "@features/projects/hooks/useProjectContainers";
import { ContainerModal } from "@features/projects/components/CreateContainerModal";
import { EditEnvVariablesModal } from "@features/projects/components/EditEnvVariablesModal";
import { ContainerStatusCard } from "@features/projects/components/ContainerStatusCard";
import { ContainerDetailModal } from "@features/projects/components/ContainerDetailModal";
import updateContainerEnvVariables from "@features/projects/api/updateContainerEnvVariables";
import deleteContainer from "@features/projects/api/deleteContainer";
import type { Container } from "@features/projects/types/Container";
import { ROUTES } from "@app/routes/routes";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";
import { BillingModal } from "@features/billing/components/viewBillsModal";
import { useUsername } from "@features/users/api/getUsernameById";
import InvoiceTable from "@features/billing/components/InvoiceTable";
import ProjectMetricsCard from "@features/observability/components/ProjectMetricsCard";
import { usePermissions } from "@features/projects/hooks/usePermissions";
import { TeamModal } from "@features/projects/components/TeamModal";
import { SecureComponent } from "@app/components/SecureComponent";
import { SimpleContainerLogsSheet } from "@features/projects/components/SimpleContainerLogsSheet";
import ProjectBillingEstimatesCard from "@features/billing/components/getEstimateBilling";


const translations = {
  en: enTranslations,
  fr: frTranslations
};

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading: projectLoading, error: projectError } = useProject(projectId || "");
  const {
    containers,
    isLoading: containersLoading,
    error: containersError,
    reload,
    setContainers
  } = useProjectContainers(projectId || "");

  const { role } = usePermissions(projectId);

  const [isContainerModalOpen, setIsContainerModalOpen] = useState(false);
  const [selectedContainerForEdit, setSelectedContainerForEdit] = useState<Container | null>(null);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [locale, setLocaleState] = useState(getLocale());
  const t = translations[locale].projectDetail;

  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [logsContainer, setLogsContainer] = useState<Container | null>(null);

  // Delete flow state


  const id = project?.ownerId || "";
  const ownerUser = useUsername(id);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const handleViewLogs = (container: Container) => {
    setLogsContainer(container);
    setIsLogsOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedContainerForEdit(null);
    setIsContainerModalOpen(true);
  };

  const handleEditEnv = (container: Container) => {
    setSelectedContainer(container);
    setIsEnvModalOpen(true);
  };

  const handleEditContainer = (container: Container) => {
    setSelectedContainerForEdit(container);
    setIsContainerModalOpen(true);
  };

  const handleSaveEnvVariables = async (
    containerId: string,
    envVariables: Record<string, string>
  ) => {
    await updateContainerEnvVariables(containerId, envVariables);
    await reload();
  };



  // This is kept for the modal usage if needed, though we might use the unified flow
  const handleDeleteContainer = async (containerId: string) => {
    // Reuse logic if necessary, but for now the modal handles its own delete via the same API import
    // or we could refactor to use the same function. 
    // For minimal disruption, leaving the implementation needed by Modal as is if it calls this.

    // However, the ContainerDetailModal takes a prop `onDelete` which is this function.
    // So validation: 
    const previousContainers = containers;
    setContainers((prev) => prev.filter((c) => c.containerId !== containerId));
    try {
      await deleteContainer(containerId);
      await reload();
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404) {
        await reload();
        return;
      }
      setContainers(previousContainers);
      throw err;
    }
  };

  if (projectLoading) {
    return (
      <section className="min-h-screen">
        <div className="app-container flex justify-center py-20">
          <Spinner />
        </div>
      </section>
    );
  }

  if (projectError || !project) {
    return (
      <section className="min-h-screen">
        <div className="app-container py-16">
          <SoftPanel className="border-red-500/20 bg-red-500/5 p-12 text-center">
            <div className="mx-auto mb-4 w-fit rounded-xl bg-red-500/10 p-4">
              <ShieldCheck className="h-12 w-12 text-red-400" />
            </div>
            <p className="mb-2 text-lg font-semibold text-neutral-50">
              {t.project_not_found_title}
            </p>

            <p className="mb-6 text-sm text-red-400">{projectError || t.project_not_found}</p>
            <Link to={ROUTES.DASHBOARD_PROJECTS}>
              <Button className="bg-gradient-kleff rounded-xl px-6 py-2.5 text-sm font-bold text-black">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.back_to_projects}
              </Button>
            </Link>
          </SoftPanel>
        </div>
      </section>
    );
  }

  const runningContainers = containers.filter((c) => c.status === "RUNNING").length;
  const totalContainers = containers.length;

  return (
    <section className="min-h-screen">
      <div className="app-container space-y-6 py-8">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <Link to={ROUTES.DASHBOARD_PROJECTS}>
              <button className="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-neutral-400 transition-all hover:bg-white/5 hover:text-neutral-200">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                {t.back_to_projects}
              </button>
            </Link>

            <div className="hidden items-center gap-2 sm:flex">
              {project.stackId && (
                <Badge variant="outline" className="text-xs font-medium">
                  <Layers className="mr-1 h-3 w-3" />
                  {project.stackId}
                </Badge>
              )}
            </div>
          </div>

          <SoftPanel className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-[260px] items-start gap-4">
                <div className="bg-kleff-primary/10 ring-kleff-primary/20 rounded-2xl p-3 ring-1">
                  <Box className="text-kleff-primary h-6 w-6" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-neutral-50">{project.name}</h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
                    {project.description || t.no_description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setIsTeamModalOpen(true)}
                  variant="ghost"
                  className="rounded-xl border border-white/10 px-4 py-2"
                >
                  <Users className="mr-2 h-4 w-4" />
                  {t.team}
                </Button>

                <SecureComponent requiredPermission="DEPLOY">
                  <Button
                    onClick={handleCreateNew}
                    className="bg-gradient-kleff shadow-kleff-primary/20 hover:shadow-kleff-primary/35 rounded-xl px-5 py-2 text-sm font-bold text-black shadow-lg transition-shadow"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t.create_container}
                  </Button>
                </SecureComponent>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
              {role && (
                <Badge variant="gradient" className="text-xs font-semibold">
                  <Crown className="mr-1 h-3 w-3" />
                  {role}
                </Badge>
              )}

              <Badge
                variant={runningContainers > 0 ? "success" : "outline"}
                className="text-xs font-semibold"
              >
                <Activity className="mr-1 h-3 w-3" />
                {runningContainers} / {totalContainers} {t.running_label}
              </Badge>

              {!project.stackId ? null : (
                <Badge variant="outline" className="text-xs font-medium sm:hidden">
                  <Layers className="mr-1 h-3 w-3" />
                  {project.stackId}
                </Badge>
              )}
            </div>
          </SoftPanel>
        </header>

        <SoftPanel className="p-5">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-neutral-400 uppercase">
            {t.project_overview}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/2 p-3 ring-1 ring-white/5">
              <div className="rounded-lg bg-neutral-800 p-2">
                <Hash className="h-4 w-4 text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-500">Project ID</p>
                <p className="truncate font-mono text-sm font-medium text-neutral-200">
                  {project.projectId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white/2 p-3 ring-1 ring-white/5">
              <div className="rounded-lg bg-neutral-800 p-2">
                <User className="h-4 w-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Owner</p>
                <p className="text-sm font-medium text-neutral-200">{ownerUser.username || "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white/2 p-3 ring-1 ring-white/5">
              <div className="rounded-lg bg-neutral-800 p-2">
                <Calendar className="h-4 w-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Created</p>
                <p className="text-sm font-medium text-neutral-200">{project.createdDate || "—"}</p>
              </div>
            </div>
          </div>
        </SoftPanel>

        <SecureComponent requiredPermission="VIEW_METRICS">
          <ProjectMetricsCard projectId={project.projectId} />
        </SecureComponent>

        <ProjectBillingEstimatesCard projectId={project.projectId} />

        <SoftPanel className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-kleff-primary/10 ring-kleff-primary/20 rounded-xl p-2 ring-1">
                <Box className="text-kleff-primary h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-50">{t.running_containers}</h2>
                {containers.length > 0 && (
                  <p className="text-xs text-neutral-500">
                    {runningContainers} active · {totalContainers} total
                  </p>
                )}
              </div>
            </div>

            {containers.length > 0 && (
              <Badge variant="gradient" className="font-bold">
                {containers.length}
              </Badge>
            )}
          </div>

          {containersLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : containersError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
              <p className="text-sm text-red-400">{containersError}</p>
            </div>
          ) : containers.length > 0 ? (
            <div className="space-y-3">
              {containers.map((container) => (
                <ContainerStatusCard
                  key={container.containerId}
                  container={container}
                  onManage={(container) => {
                    setSelectedContainer(container);
                    setIsDetailModalOpen(true);
                  }}
                  onViewLogs={handleViewLogs}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="bg-kleff-primary/10 ring-kleff-primary/20 mx-auto mb-6 w-fit rounded-2xl p-6 ring-1">
                <Box className="text-kleff-primary h-12 w-12" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-neutral-50">No containers yet</h3>
              <p className="mb-6 text-sm text-neutral-400">
                {t.no_containers || "Create your first container to get started"}
              </p>
              <SecureComponent requiredPermission="DEPLOY">
                <Button
                  onClick={handleCreateNew}
                  className="bg-gradient-kleff shadow-kleff-primary/20 rounded-xl px-6 py-2.5 text-sm font-bold text-black shadow-lg"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create First Container
                </Button>
              </SecureComponent>
            </div>
          )}
        </SoftPanel>

        <SecureComponent requiredPermission="MANAGE_BILLING">
          <InvoiceTable projectId={project.projectId} />
        </SecureComponent>
      </div>

      <BillingModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        projectId={projectId || ""}
      />

      <ContainerModal
        isOpen={isContainerModalOpen}
        onClose={() => {
          setIsContainerModalOpen(false);
          setSelectedContainerForEdit(null);
        }}
        projectId={projectId || ""}
        container={selectedContainerForEdit}
        onSuccess={() => reload()}
      />

      <EditEnvVariablesModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
        container={selectedContainer}
        onSave={handleSaveEnvVariables}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        projectId={projectId || ""}
        userRole={(role as "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER") || "VIEWER"}
      />

      <ContainerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedContainer(null);
        }}
        container={selectedContainer}
        onEditEnv={handleEditEnv}
        onEditContainer={handleEditContainer}
        onDelete={handleDeleteContainer}
      />

      <SimpleContainerLogsSheet
        container={logsContainer}
        projectId={projectId || ""}
        open={isLogsOpen}
        onOpenChange={setIsLogsOpen}
      />

      {/* Delete Confirmation Dialog */}

    </section>
  );
}
