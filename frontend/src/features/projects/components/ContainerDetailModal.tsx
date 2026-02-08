import React from "react";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Button } from "@shared/ui/Button";
import { Badge } from "@shared/ui/Badge";
import { ConfirmationDialog } from "@shared/ui/ConfirmationDialog";
import {
  X,
  ExternalLink,
  Settings,
  Hash,
  Box,
  Code,
  GitBranch,
  Copy,
  Play,
  Square,
  Trash2,
  Network,
  Edit,
  AlertTriangle
} from "lucide-react";
import { formatRepoUrl, formatPort } from "@shared/lib/utils";
import type { Container } from "@features/projects/types/Container";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";
import { SecureComponent } from "@app/components/SecureComponent";

const translations = {
  en: enTranslations,
  fr: frTranslations
};

interface ContainerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  container: Container | null;
  onEditEnv?: (container: Container) => void;
  onEditContainer?: (container: Container) => void;
  onDelete?: (containerId: string) => Promise<void>;
}

export function ContainerDetailModal({
  isOpen,
  onClose,
  container,
  onEditEnv,
  onEditContainer,
  onDelete
}: ContainerDetailModalProps) {
  const [copiedId, setCopiedId] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [locale, setLocale] = React.useState(getLocale());
  const t = translations[locale].projectDetail.containerDetail;

  React.useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocale(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  if (!isOpen || !container) return null;

  const appUrl = `https://${container.containerId}.kleff.io`;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(container.containerId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error("Failed to copy container ID:", err);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(container.containerId);
      onClose();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete container:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const truncateId = (id: string) => {
    if (id.length <= 20) return id;
    return `${id.slice(0, 8)}...${id.slice(-8)}`;
  };

  return (
    <section className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <section className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto px-4 sm:px-0">
        <SoftPanel className="border border-white/10 bg-black/70 shadow-2xl shadow-black/60">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Box className="h-6 w-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">{container.name}</h2>
                <Badge
                  variant={
                    container.status?.toLowerCase().includes("running")
                      ? "success"
                      : container.status?.toLowerCase().includes("stopped")
                        ? "secondary"
                        : "warning"
                  }
                  className="mt-1 text-xs"
                >
                  {container.status?.toLowerCase().includes("running") && (
                    <span className="relative mr-1.5 inline-flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                  )}
                  {container.status || t.unknown}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(appUrl, "_blank")}
                className="text-blue-400 hover:bg-blue-400/10 hover:text-blue-300"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t.visit_app}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 transition hover:border-white/30 hover:bg-white/10 hover:text-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Details Section */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">{t.details}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Container ID */}
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <Hash className="h-5 w-5 flex-shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-neutral-100">{t.container_id}</div>
                  <button
                    onClick={handleCopyId}
                    className="group flex items-center gap-1 truncate font-mono text-sm text-neutral-200 transition-colors hover:text-blue-400"
                    title="Click to copy"
                    data-container-id={container.containerId}
                  >
                    {truncateId(container.containerId)}
                    <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                  {copiedId && (
                    <span className="animate-pulse text-xs text-emerald-400">{t.copied}</span>
                  )}
                </div>
              </div>

              {/* Ports */}
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <Network className="h-5 w-5 flex-shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-neutral-100">{t.ports}</div>
                  <div className="truncate font-mono text-sm text-neutral-200">
                    {container.ports.length > 0 ? (
                      container.ports.map((port, index) => (
                        <span key={index}>
                          {formatPort(port)}
                          {index < container.ports.length - 1 && ", "}
                        </span>
                      ))
                    ) : (
                      <span className="text-neutral-400">{t.none}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Branch */}
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <GitBranch className="h-5 w-5 flex-shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-neutral-100">{t.branch}</div>
                  <div className="truncate font-mono text-sm text-neutral-200">
                    {container.branch || t.main}
                  </div>
                </div>
              </div>

              {/* Database */}
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="h-5 w-5 flex-shrink-0 text-neutral-400">
                  {container.enableDatabase ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                      <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                      <path d="M3 12h18"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                      <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                      <path d="M3 12h18"></path>
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-neutral-100">Database</div>
                  <div className="truncate font-mono text-sm text-neutral-200">
                    {container.enableDatabase 
                      ? `${container.storageSizeGB} GB` 
                      : "Disabled"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Source Code Section */}
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold text-white">{t.source_code}</h3>
            <div
              className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/10"
              onClick={() => {
                const repo = formatRepoUrl(container.repoUrl);
                if (repo.link) window.open(repo.link, "_blank");
              }}
            >
              <div className="flex items-center gap-3">
                <Code className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="font-medium text-neutral-100">
                    {(() => {
                      const repo = formatRepoUrl(container.repoUrl);
                      return repo.display;
                    })()}
                  </div>
                  <div className="text-sm text-neutral-400">{t.click_to_open_repo}</div>
                </div>
              </div>
              <ExternalLink className="h-5 w-5 text-neutral-400" />
            </div>
          </div>

          {/* Environment Variables Section - Full Width */}
          {container.envVariables && Object.keys(container.envVariables).length > 0 && (
            <div className="mt-8 rounded-lg bg-slate-900/60 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{t.environment_variables}</h3>
                {onEditEnv && (
                  <SecureComponent requiredPermission="MANAGE_ENV_VARS">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditEnv(container)}
                      className="border-slate-600 bg-slate-700 text-xs text-slate-300 hover:border-slate-500 hover:bg-slate-600"
                    >
                      <Settings className="mr-1 h-3 w-3" />
                      {t.edit_variables}
                    </Button>
                  </SecureComponent>
                )}
              </div>
              <div className="space-y-3">
                {Object.entries(container.envVariables).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded border border-slate-700 bg-slate-800/60 p-3"
                  >
                    <span className="min-w-0 flex-1 font-mono text-sm font-semibold text-slate-300">
                      {key}
                    </span>
                    <span className="text-sm text-slate-500">=</span>
                    <span className="min-w-0 flex-1 font-mono text-sm break-all text-white">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer - Action Buttons */}
          <div className="mt-8 border-t border-slate-700 pt-6">
            <div className="flex flex-wrap justify-end gap-3">
              <SecureComponent requiredPermission="DEPLOY">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t.restart}
                </Button>
              </SecureComponent>
              <SecureComponent requiredPermission="DEPLOY">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600"
                >
                  <Square className="mr-2 h-4 w-4" />
                  {t.stop}
                </Button>
              </SecureComponent>
              {onEditContainer && (
                <SecureComponent requiredPermission="DEPLOY">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditContainer(container)}
                    className="border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {t.edit_container}
                  </Button>
                </SecureComponent>
              )}
              {onEditEnv && (
                <SecureComponent requiredPermission="MANAGE_ENV_VARS">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditEnv(container)}
                    className="border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {t.edit_environment_variables}
                  </Button>
                </SecureComponent>
              )}
              <SecureComponent requiredPermission="DELETE_PROJECT">
                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t.delete}
                </Button>
              </SecureComponent>
            </div>
          </div>
        </SoftPanel>
      </section>

      {/* Enhanced Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t.delete_container}
        description={t.delete_container_description}
        confirmText={t.delete}
        cancelText={t.cancel}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="destructive"
        isLoading={isDeleting}
      >
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{t.irreversible_action}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-300">{t.delete_container_warning}</p>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-white/5 p-3">
            <span className="font-mono text-xs text-neutral-400">{t.container_id}:</span>
            <span className="font-mono text-sm font-semibold text-white">{container.name}</span>
          </div>
        </div>
      </ConfirmationDialog>
    </section>
  );
}
