import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/ui/Table";
import { Spinner } from "@shared/ui/Spinner";
import { X, Activity, ArrowUpDown } from "lucide-react";
import { getProjectActivityLogs } from "../api/getActionLogs";
import { getProjectCollaborators } from "../api/collaborators";
import type { ActionLog } from "../types/ActionLog";
import { getUsernameById } from "@features/users/api/getUsernameById";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/Select";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

interface ActionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  ownerId: string;
}

export function ActionLogModal({ isOpen, onClose, projectId, ownerId }: ActionLogModalProps) {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ActionLog | "collaboratorName";
    direction: "asc" | "desc";
  } | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("all");

  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].actionLog;

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const [logsData, collaboratorsData] = await Promise.all([
          getProjectActivityLogs(projectId),
          getProjectCollaborators(projectId)
        ]);

        setLogs(logsData);
        setError(null);

        // Collect all relevant user IDs (both eager actors and current collaborators)
        const logUserIds = logsData.map((log) => log.collaborator);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const collaboratorUserIds = (collaboratorsData as any[]).map((c) => c.userId);
        const allUserIds = Array.from(new Set([...logUserIds, ...collaboratorUserIds]));

        // Fetch usernames for all
        const nameMap: Record<string, string> = { ...usernames };

        await Promise.all(
          allUserIds.map(async (userId) => {
            if (!nameMap[userId]) {
              try {
                const name = await getUsernameById(userId);
                nameMap[userId] = name;
              } catch (e) {
                console.warn(`Failed to fetch username for ${userId}`, e);
                nameMap[userId] = userId; // Fallback to ID
              }
            }
          })
        );
        setUsernames(nameMap);
      } catch (err) {
        console.error("Error loading logs or collaborators:", err);
        setError(t.failed_load);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDetails = (details: any): React.ReactNode => {
    if (!details) return "-";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedDetails: Record<string, any> = {};

    // 1. Try to treat as object if it already is
    if (typeof details === "object") {
      parsedDetails = details;
    }
    // 2. Try to parse as JSON string
    else if (typeof details === "string" && (details.startsWith("{") || details.startsWith("["))) {
      try {
        parsedDetails = JSON.parse(details);
      } catch (e) {
        // Not JSON, fall through to Java toString parser
        void e;
      }
    }

    // Check if we successfully parsed something
    if (Object.keys(parsedDetails).length > 0) {
      return (
        <div className="flex flex-col gap-1.5 text-xs">
          {Object.entries(parsedDetails).map(([key, value]) => {
            // Skip internal keys or name (already shown in action column)
            if (key === "name" || key === "container_name" || key === "target_user_id") return null;

            // Environment Variable specific formatting
            if (key === "added_vars" && Array.isArray(value)) {
              return (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className="font-medium text-green-400">{t.added_env_vars}</span>
                  {value.map((v: string) => (
                    <span key={v} className="pl-2 text-neutral-400">
                      • {v}
                    </span>
                  ))}
                </div>
              );
            }
            if (key === "deleted_vars" && Array.isArray(value)) {
              return (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className="font-medium text-red-400">{t.deleted_env_vars}</span>
                  {value.map((v: string) => (
                    <span key={v} className="pl-2 text-neutral-400">
                      • {v}
                    </span>
                  ))}
                </div>
              );
            }
            if (key === "updated_vars" && Array.isArray(value)) {
              return (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className="font-medium text-amber-400">{t.updated_env_vars}</span>
                  {value.map((v: string) => (
                    <span key={v} className="pl-2 text-neutral-400">
                      • {v}
                    </span>
                  ))}
                </div>
              );
            }
            if (key === "old_role" && parsedDetails["new_role"]) {
              return (
                <div key="role_change" className="flex gap-1">
                  <span className="font-medium text-neutral-500">{t.role}</span>
                  <span className="text-neutral-300">
                    {value} <span className="text-neutral-600">→</span> {parsedDetails["new_role"]}
                  </span>
                </div>
              );
            }
            if (key === "new_role") return null; // handled above

            // Fallback for other keys
            return (
              <div key={key} className="flex gap-1">
                <span className="font-medium text-neutral-500">
                  {key
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
                  :
                </span>
                <span className="text-neutral-300">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            );
          })}
          {parsedDetails["target_user_id"] && (
            <div className="mt-1 flex gap-1 border-t border-white/5 pt-0.5">
              <span className="font-medium text-neutral-500">{t.target_user}</span>
              <span className="font-mono text-neutral-300">
                {usernames[parsedDetails["target_user_id"]] || parsedDetails["target_user_id"]}
              </span>
            </div>
          )}
        </div>
      );
    }

    // Legacy Java toString format: {key=value, key2=value}
    if (typeof details === "string" && details.startsWith("{") && details.endsWith("}")) {
      const content = details.slice(1, -1);
      if (!content) return "-";

      const pairs = content.split(", ");
      return (
        <div className="flex flex-col gap-1">
          {pairs.map((pair, i) => {
            const [key, ...values] = pair.split("=");
            const value = values.join("="); // Handle values containing =
            if (!key || !value) return <span key={i}>{pair}</span>;

            return (
              <div key={i} className="flex gap-1 text-xs">
                <span className="font-medium text-neutral-500">
                  {key
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
                  :
                </span>
                <span className="text-neutral-300">{value}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return String(details);
  };

  const getLogDetails = (log: ActionLog) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedDetails: any = {};
    let resourceName = "";
    let isJson = false;

    try {
      if (log.details && typeof log.details === "string") {
        if (log.details.startsWith("{") || log.details.startsWith("[")) {
          parsedDetails = JSON.parse(log.details);
          isJson = true;
        }
      } else if (typeof log.details === "object") {
        parsedDetails = log.details;
        isJson = true;
      }
    } catch (e) {
      // Failed to parse JSON, stick to string
      void e;
    }

    // Extract Resource Name
    if (isJson) {
      resourceName = parsedDetails.name || parsedDetails.container_name || "";
    }
    // Fallback for Legacy Java toString format: {name=MyContainer}
    else if (log.details && typeof log.details === "string") {
      const match = log.details.match(/name=([^,|}]+)/);
      if (match && match[1]) {
        resourceName = match[1].trim();
      }
    }

    return { parsedDetails, resourceName, isJson };
  };

  const handleSort = (key: keyof ActionLog | "collaboratorName") => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Use all loaded usernames for the filter dropdown, excluding the project owner
  const allKnownCollaborators = Object.keys(usernames).filter((id) => id !== ownerId);

  const sortedLogs = [...logs]
    .filter((log) => log.collaborator !== ownerId)
    .filter((log) => selectedCollaborator === "all" || log.collaborator === selectedCollaborator)
    .sort((a, b) => {
      if (!sortConfig) return 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let aValue: any = a[sortConfig.key as keyof ActionLog];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let bValue: any = b[sortConfig.key as keyof ActionLog];

      if (sortConfig.key === "collaboratorName") {
        aValue = (usernames[a.collaborator] || a.collaborator).toLowerCase();
        bValue = (usernames[b.collaborator] || b.collaborator).toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <SoftPanel className="relative z-10 flex max-h-[85vh] w-full max-w-6xl flex-col border border-white/10 bg-black/80 shadow-2xl ring-1 shadow-black/80 ring-white/5">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 p-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 shadow-inner shadow-amber-500/5">
                <Activity className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">{t.title}</h2>
                <p className="mt-0.5 text-sm text-neutral-400">{t.subtitle}</p>
              </div>
            </div>

            {/* Collaborator Filter */}
            <div className="w-56">
              <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                <SelectTrigger className="h-9 border-white/10 bg-white/5 text-xs text-white">
                  <SelectValue placeholder={t.all_collaborators} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all_collaborators}</SelectItem>
                  {allKnownCollaborators.map((id) => (
                    <SelectItem key={id} value={id}>
                      {usernames[id] || id.substring(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            onClick={onClose}
            className="group rounded-full border border-transparent p-2 transition-colors hover:border-white/10 hover:bg-white/10"
          >
            <X className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-0">
          <div className="custom-scrollbar h-full overflow-auto">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Spinner className="h-8 w-8 text-amber-500" />
                <p className="text-sm text-neutral-500">{t.loading}</p>
              </div>
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2">
                <div className="rounded-full bg-red-500/10 p-3">
                  <X className="h-6 w-6 text-red-400" />
                </div>
                <p className="font-medium text-red-400">{error}</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 border-b border-white/10 bg-black/90 backdrop-blur-sm">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead
                      className="w-[200px] cursor-pointer py-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-white"
                      onClick={() => handleSort("action")}
                    >
                      <div className="flex items-center gap-2">
                        {t.action}
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-[180px] cursor-pointer py-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-white"
                      onClick={() => handleSort("collaboratorName")}
                    >
                      <div className="flex items-center gap-2">
                        {t.collaborator}
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-[180px] cursor-pointer py-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-white"
                      onClick={() => handleSort("timestamp")}
                    >
                      <div className="flex items-center gap-2">
                        {t.date}
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      </div>
                    </TableHead>
                    <TableHead className="py-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                      {t.details}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-neutral-500">
                        {t.no_activity}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedLogs.map((log) => {
                      const { parsedDetails, resourceName, isJson } = getLogDetails(log);

                      return (
                        <TableRow
                          key={log.id}
                          className="group border-white/5 transition-colors hover:bg-white/[0.02]"
                        >
                          <TableCell className="py-2.5 font-medium text-neutral-200">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{formatAction(log.action)}</span>
                              {resourceName && (
                                <span className="text-xs font-normal text-amber-500/80">
                                  — {resourceName}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-neutral-300">
                            <div className="flex items-center gap-2">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-neutral-800 to-neutral-900 text-[9px] font-medium text-neutral-400 transition-colors group-hover:border-white/20">
                                {(usernames[log.collaborator] || log.collaborator)
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <span className="text-xs text-neutral-400">
                                {usernames[log.collaborator] || (
                                  <span className="font-mono opacity-50">
                                    {log.collaborator.substring(0, 8)}...
                                  </span>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 font-mono text-xs whitespace-nowrap text-neutral-500">
                            {new Date(log.timestamp).toLocaleString(undefined, {
                              month: "numeric",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true
                            })}
                          </TableCell>
                          <TableCell
                            className="max-w-md py-2.5 text-xs text-neutral-500"
                            title={typeof log.details === "string" ? log.details : ""}
                          >
                            {isJson ? formatDetails(parsedDetails) : formatDetails(log.details)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </SoftPanel>
    </div>,
    document.body
  );
}
