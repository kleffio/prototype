import { useState, useEffect, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { Link } from "react-router-dom";
import { Users, Activity, ArrowLeft, Brain } from "lucide-react";

import { getUsers } from "@features/admin/api/getUsers";
import { getUserDetails } from "@features/admin/api/getUserDetails";
import { getAdminAuditLogs } from "@features/admin/api/getAdminAuditLogs";
import { UsersTable } from "@features/admin/components/UsersTable";
import { UserDetailModal } from "@features/admin/components/UserDetailModal";
import { AuditLogTable } from "@features/admin/components/AuditLogTable";
import { InsightsPanel } from "@features/admin/components/InsightsPanel";

import type {
  AdminUserListItem,
  AdminUserDetail,
  AdminAuditLog,
  UsersTableState,
  AuditLogsTableState
} from "@features/admin/types/admin";

import { ROUTES } from "@app/routes/routes";
import { KleffDot } from "@shared/ui/KleffDot";
import { Skeleton } from "@shared/ui/Skeleton";

type TabType = "users" | "audit" | "insights";

export function AdminPage() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("users");

  // Users state
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersState, setUsersState] = useState<UsersTableState>({
    page: 1,
    pageSize: 20,
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  // Selected user for detail modal
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditState, setAuditState] = useState<AuditLogsTableState>({
    page: 1,
    pageSize: 20,
    filter: {}
  });

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!auth.user?.access_token) return;

    setUsersLoading(true);
    try {
      const result = await getUsers(auth.user.access_token, {
        page: usersState.page,
        pageSize: usersState.pageSize,
        search: usersState.search
      });
      setUsers(result.users);
      setUsersTotal(result.total);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setUsersLoading(false);
    }
  }, [auth.user?.access_token, usersState.page, usersState.pageSize, usersState.search]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    if (!auth.user?.access_token) return;

    setAuditLoading(true);
    try {
      const result = await getAdminAuditLogs(auth.user.access_token, {
        page: auditState.page,
        pageSize: auditState.pageSize,
        filter: auditState.filter
      });
      setAuditLogs(result.items);
      setAuditTotal(result.total);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setAuditLoading(false);
    }
  }, [auth.user?.access_token, auditState.page, auditState.pageSize, auditState.filter]);

  // Initial fetch and when state changes
  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (activeTab === "audit") {
      void fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  // Handle user selection
  const handleSelectUser = async (user: AdminUserListItem) => {
    if (!auth.user?.access_token) return;

    setSelectedUserLoading(true);
    setShowDetailModal(true);
    setSelectedUser(null);

    try {
      const details = await getUserDetails(auth.user.access_token, user.id);
      setSelectedUser(details);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      setShowDetailModal(false);
    } finally {
      setSelectedUserLoading(false);
    }
  };

  // Handle user update (refresh data)
  const handleUserUpdated = () => {
    void fetchUsers();
    if (selectedUser) {
      // Refetch selected user details
      void (async () => {
        if (!auth.user?.access_token) return;
        try {
          const details = await getUserDetails(auth.user.access_token, selectedUser.id);
          setSelectedUser(details);
        } catch (error) {
          console.error("Failed to refresh user details:", error);
        }
      })();
    }
  };

  // Handle users state change
  const handleUsersStateChange = (newState: Partial<UsersTableState>) => {
    setUsersState((prev) => ({ ...prev, ...newState }));
  };

  // Handle audit state change
  const handleAuditStateChange = (newState: Partial<AuditLogsTableState>) => {
    setAuditState((prev) => ({ ...prev, ...newState }));
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kleff-bg">
        <Skeleton className="h-32 w-64 bg-neutral-800" />
      </div>
    );
  }

  return (
    <div className="bg-kleff-bg text-foreground relative min-h-screen">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="bg-modern-noise bg-kleff-spotlight h-full w-full opacity-60" />
        <div className="bg-kleff-grid absolute inset-0 opacity-[0.25]" />
      </div>

      {/* WCAG 2.0 AA: Header landmark */}
      <header className="relative z-50 border-b border-white/10 bg-[#0f0f10]/40 backdrop-blur-xl" role="banner">
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#0f0f10]/60 via-[#0f0f10]/50 to-[#0f0f10]/60" />
        <div className="pointer-events-none absolute inset-0 z-0 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to={ROUTES.DASHBOARD} className="group flex items-center gap-3 transition">
              <KleffDot variant="full" size={24} />
              <span className="text-sm font-semibold tracking-[0.32em] text-neutral-100 uppercase">
                LEFF
              </span>
              <span className="mx-2 text-neutral-600">|</span>
              <span className="text-base font-medium text-neutral-400">Admin Panel</span>
            </Link>
            <Link
              to={ROUTES.DASHBOARD}
              className="flex items-center gap-2 text-sm text-neutral-400 transition hover:text-neutral-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-0 flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-neutral-50">System Administration</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Manage users, roles, and monitor system activity
            </p>
          </div>

          {/* WCAG 2.0 AA: Tab Navigation with proper ARIA roles */}
          <div className="mb-6 border-b border-neutral-800">
            <nav className="flex gap-4" role="tablist" aria-label="Admin panel sections">
              <button
                onClick={() => setActiveTab("users")}
                role="tab"
                aria-selected={activeTab === "users"}
                aria-controls="users-panel"
                id="users-tab"
                tabIndex={activeTab === "users" ? 0 : -1}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === "users"
                    ? "border-kleff-gold text-neutral-50"
                    : "border-transparent text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                }`}
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                User Management
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                role="tab"
                aria-selected={activeTab === "audit"}
                aria-controls="audit-panel"
                id="audit-tab"
                tabIndex={activeTab === "audit" ? 0 : -1}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === "audit"
                    ? "border-kleff-gold text-neutral-50"
                    : "border-transparent text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                }`}
              >
                <Activity className="h-4 w-4" aria-hidden="true" />
                Audit Logs
              </button>
              <button
                onClick={() => setActiveTab("insights")}
                role="tab"
                aria-selected={activeTab === "insights"}
                aria-controls="insights-panel"
                id="insights-tab"
                tabIndex={activeTab === "insights" ? 0 : -1}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === "insights"
                    ? "border-kleff-gold text-neutral-50"
                    : "border-transparent text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                }`}
              >
                <Brain className="h-4 w-4" aria-hidden="true" />
                Insights
              </button>
            </nav>
          </div>

          {/* WCAG 2.0 AA: Tab Content with proper ARIA roles */}
          {activeTab === "users" && (
            <div 
              className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm"
              role="tabpanel"
              id="users-panel"
              aria-labelledby="users-tab"
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-neutral-50">Users</h2>
                <p className="text-sm text-neutral-400">
                  View and manage all platform users, assign roles, and handle suspensions.
                </p>
              </div>
              <UsersTable
                users={users}
                total={usersTotal}
                isLoading={usersLoading}
                state={usersState}
                onStateChange={handleUsersStateChange}
                onSelectUser={handleSelectUser}
              />
            </div>
          )}

          {activeTab === "audit" && (
            <div 
              className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm"
              role="tabpanel"
              id="audit-panel"
              aria-labelledby="audit-tab"
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-neutral-50">Admin Audit Logs</h2>
                <p className="text-sm text-neutral-400">
                  Track all administrative actions performed on the platform.
                </p>
              </div>
              <AuditLogTable
                logs={auditLogs}
                total={auditTotal}
                isLoading={auditLoading}
                state={auditState}
                onStateChange={handleAuditStateChange}
              />
            </div>
          )}

          {activeTab === "insights" && (
            <div 
              className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm"
              role="tabpanel"
              id="insights-panel"
              aria-labelledby="insights-tab"
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-neutral-50">Cluster Insights</h2>
                <p className="text-sm text-neutral-400">
                  AI-enhanced recommendations and anomaly alerts generated from 7-day Prometheus analysis.
                </p>
              </div>
              <InsightsPanel />
            </div>
          )}
        </div>
      </main>

      {/* User Detail Modal */}
      {showDetailModal && (
        <UserDetailModal
          user={selectedUser}
          isLoading={selectedUserLoading}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {/* Footer */}
      <footer className="relative z-20 border-t border-neutral-800/50 bg-neutral-900/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KleffDot variant="full" size={20} />
              <span className="text-sm text-neutral-400">
                © {new Date().getFullYear()} Kleff. Admin Panel
              </span>
            </div>
            <div className="flex gap-6 text-sm text-neutral-400">
              <Link to="/privacy" className="font-medium transition hover:text-neutral-50">
                Privacy
              </Link>
              <Link to="/terms" className="font-medium transition hover:text-neutral-50">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
