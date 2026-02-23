import { ChevronLeft, ChevronRight, Activity, User, Shield } from "lucide-react";
import type { AdminAuditLog, AuditLogsTableState } from "../types/admin";
import { ADMIN_ACTION_LABELS } from "../types/admin";
import { Skeleton } from "@shared/ui/Skeleton";

interface AuditLogTableProps {
  logs: AdminAuditLog[];
  total: number;
  isLoading: boolean;
  state: AuditLogsTableState;
  onStateChange: (state: Partial<AuditLogsTableState>) => void;
}

export function AuditLogTable({
  logs,
  total,
  isLoading,
  state,
  onStateChange
}: AuditLogTableProps) {
  const totalPages = Math.ceil(total / state.pageSize);

  const formatAction = (action: string): string => {
    return ADMIN_ACTION_LABELS[action as keyof typeof ADMIN_ACTION_LABELS] || action;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "role_granted":
      case "role_revoked":
        return <Shield className="h-4 w-4 text-yellow-400" />;
      case "user_suspended":
      case "user_unsuspended":
        return <User className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* WCAG 2.0 AA: Table with caption for screen readers */}
      <div className="overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-900/60">
        <table className="w-full" aria-label="Admin audit logs table">
          <caption className="sr-only">
            Audit log entries showing administrative actions including who performed the action, the
            target, details, IP address, and timestamp.
          </caption>
          <thead>
            <tr className="border-b border-neutral-800/50 text-left text-xs font-medium tracking-wider text-neutral-400 uppercase">
              <th scope="col" className="px-4 py-3">
                Action
              </th>
              <th scope="col" className="px-4 py-3">
                Admin
              </th>
              <th scope="col" className="px-4 py-3">
                Target
              </th>
              <th scope="col" className="px-4 py-3">
                Details
              </th>
              <th scope="col" className="px-4 py-3">
                IP Address
              </th>
              <th scope="col" className="px-4 py-3">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-28 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-24 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-32 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-24 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-28 bg-neutral-800" />
                  </td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="transition hover:bg-neutral-800/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-sm text-neutral-200">{formatAction(log.action)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-neutral-400">
                      {log.adminUserId.substring(0, 8)}...
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.targetType && log.targetId ? (
                      <div>
                        <span className="text-xs text-neutral-500">{log.targetType}</span>
                        <div className="font-mono text-sm text-neutral-300">
                          {log.targetId.substring(0, 12)}...
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <div className="max-w-xs">
                        {"email" in log.details && Boolean(log.details.email) && (
                          <span className="text-sm text-neutral-400">
                            {String(log.details.email)}
                          </span>
                        )}
                        {"role" in log.details && Boolean(log.details.role) && (
                          <span className="ml-2 inline-flex items-center rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">
                            {String(log.details.role)}
                          </span>
                        )}
                        {"reason" in log.details && Boolean(log.details.reason) && (
                          <div className="truncate text-xs text-neutral-500">
                            {String(log.details.reason)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-neutral-500">
                      {log.ipAddress || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-neutral-400">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-500">
            Showing {(state.page - 1) * state.pageSize + 1} to{" "}
            {Math.min(state.page * state.pageSize, total)} of {total} logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStateChange({ page: state.page - 1 })}
              disabled={state.page === 1 || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-neutral-400">
              Page {state.page} of {totalPages}
            </span>
            <button
              onClick={() => onStateChange({ page: state.page + 1 })}
              disabled={state.page === totalPages || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
