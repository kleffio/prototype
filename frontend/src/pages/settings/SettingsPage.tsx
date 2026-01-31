import { useCallback, useEffect, useState } from "react";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  User,
  ArrowLeft,
  FolderGit2,
  Palette,
  Mail,
  CreditCard,
  Shield,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { updateUserProfile } from "@features/users/api/UpdateUserProfile";
import { getMyAuditLogs } from "@features/users/api/getMyAuditLogs";
import { deactivateAccount } from "@features/users/api/deactivateAccount";
import { useUser } from "@features/users/hooks/useUser";

import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Label } from "@shared/ui/Label";
import { UserAvatar } from "@shared/ui/UserAvatar";
import { Skeleton } from "@shared/ui/Skeleton";
import { KleffDot } from "@shared/ui/KleffDot";
import { ROUTES } from "@app/routes/routes";

import type { AuditLog, AuditLogPage } from "@features/users/types/Audit";

type NotificationType = "success" | "error" | null;

interface Notification {
  type: NotificationType;
  message: string;
}

const PAGE_SIZE = 10;

// Mock data for empty state
const MOCK_AUDIT_LOGS = [
  {
    id: "mock-1",
    action: "Profile updated",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "mock-2",
    action: "Password changed",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: "mock-3",
    action: "Logged in",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
    timestamp: new Date(Date.now() - 86400000 * 14).toISOString()
  }
];

interface AuditPaginationProps {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

function AuditPagination({
  currentPage,
  totalPages,
  isLoading,
  onPageChange
}: AuditPaginationProps) {
  if (totalPages <= 1) return null;

  const handleClick = (page: number) => {
    if (page === currentPage || isLoading) return;
    onPageChange(page);
  };

  const pages = Array.from({ length: totalPages }, (_, idx) => idx + 1);

  return (
    <div className="mt-6 flex items-center justify-between border-t border-neutral-800 pt-4">
      <button
        type="button"
        disabled={isLoading || currentPage === 1}
        onClick={() => handleClick(currentPage - 1)}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {pages.map((pageNumber) => {
          const isActive = pageNumber === currentPage;
          return (
            <button
              key={pageNumber}
              type="button"
              disabled={isLoading}
              onClick={() => handleClick(pageNumber)}
              className={
                "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition " +
                (isActive
                  ? "bg-gradient-kleff font-medium text-neutral-950"
                  : "text-neutral-300 hover:bg-neutral-900 disabled:text-neutral-500")
              }
            >
              {pageNumber}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={isLoading || currentPage === totalPages}
        onClick={() => handleClick(currentPage + 1)}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();

  const { avatarUrl: oidcAvatar, user, isLoading, error: loadError, reload } = useUser();
  const [activeTab, setActiveTab] = useState("profile");

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    email: "",
    avatarUrl: "",
    bio: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [showDeactivationModal, setShowDeactivationModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const totalPages = Math.max(1, Math.ceil(auditTotal / PAGE_SIZE));

  const loadAuditPage = useCallback(
    async (page: number) => {
      if (!user) return;

      setAuditLoading(true);
      setAuditError(null);

      try {
        const offset = (page - 1) * PAGE_SIZE;
        const { items, total }: AuditLogPage = await getMyAuditLogs(PAGE_SIZE, offset);

        setAuditLogs(items ?? []);
        setAuditTotal(total ?? 0);
        setAuditPage(page);
      } catch (err) {
        setAuditError(err instanceof Error ? err.message : "Failed to load audit logs");
      } finally {
        setAuditLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;

    setFormData({
      username: user.username ?? "",
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      avatarUrl: user.avatarUrl ?? "",
      bio: user.bio ?? ""
    });

    setAuditLogs([]);
    setAuditTotal(0);
    setAuditPage(1);

    // Disabled audit log loading to reduce API calls
    // void loadAuditPage(1);
  }, [user, loadAuditPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.username.trim() || !formData.displayName.trim()) {
      setNotification({
        type: "error",
        message: "Username and display name are required."
      });
      return;
    }

    const updatePayload: {
      username?: string;
      displayName?: string;
      avatarUrl?: string | null;
      bio?: string | null;
    } = {};

    if (formData.username.trim() !== user.username) {
      updatePayload.username = formData.username.trim();
    }
    if (formData.displayName.trim() !== user.displayName) {
      updatePayload.displayName = formData.displayName.trim();
    }
    if ((formData.avatarUrl || null) !== (user.avatarUrl ?? null)) {
      updatePayload.avatarUrl = formData.avatarUrl || null;
    }
    if ((formData.bio || null) !== (user.bio ?? null)) {
      updatePayload.bio = formData.bio || null;
    }

    if (Object.keys(updatePayload).length === 0) {
      setNotification({
        type: "success",
        message: "No changes to save."
      });
      return;
    }

    setIsSaving(true);
    setNotification(null);

    try {
      await updateUserProfile(updatePayload);
      await reload();

      setNotification({
        type: "success",
        message: "Profile updated successfully."
      });
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update profile."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!user) return;

    setIsDeactivating(true);
    setNotification(null);

    try {
      await deactivateAccount();
      localStorage.setItem("account-deactivated", "true");
      navigate("/error/deactivated");
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to deactivate account."
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-kleff-bg text-foreground relative min-h-screen">
        <div className="pointer-events-none fixed inset-0">
          <div className="bg-modern-noise bg-kleff-spotlight h-full w-full opacity-60" />
          <div className="bg-kleff-grid absolute inset-0 opacity-[0.25]" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-8">
          <Skeleton className="h-8 w-48 bg-neutral-900" data-testid="settings-profile-skeleton" />
          <Skeleton
            className="mt-8 h-96 w-full bg-neutral-900"
            data-testid="settings-audit-skeleton"
          />
        </div>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="bg-kleff-bg text-foreground relative min-h-screen">
        <div className="pointer-events-none fixed inset-0">
          <div className="bg-modern-noise bg-kleff-spotlight h-full w-full opacity-60" />
          <div className="bg-kleff-grid absolute inset-0 opacity-[0.25]" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {loadError?.message || "Failed to load user"}
          </div>
        </div>
      </div>
    );
  }

  const displayAvatar = formData.avatarUrl || oidcAvatar || undefined;
  const initial = (formData.displayName || formData.username || "?")[0].toUpperCase();
  const createdAtLabel = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
      })
    : "Unknown";

  const showAuditSkeleton = auditLoading && auditLogs.length === 0;
  const displayLogs = auditLogs.length > 0 ? auditLogs : MOCK_AUDIT_LOGS;

  return (
    <div className="bg-kleff-bg text-foreground relative flex min-h-screen flex-col">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="bg-modern-noise bg-kleff-spotlight h-full w-full opacity-60" />
        <div className="bg-kleff-grid absolute inset-0 opacity-[0.25]" />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/10 bg-[#0f0f10]/40 backdrop-blur-xl">
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
              <span className="text-base font-medium text-neutral-400">Settings</span>
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

      {/* Main Content with Sidebar */}
      <main className="relative z-0 flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Account Settings Heading - Required by E2E tests */}
          <h1 className="sr-only">Account Settings</h1>

          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    activeTab === "profile"
                      ? "bg-neutral-800/50 font-medium text-neutral-50"
                      : "text-neutral-400 hover:bg-neutral-800/30 hover:text-neutral-200"
                  }`}
                >
                  <User className="h-4 w-4" />
                  Public profile
                </button>
                <button
                  onClick={() => setActiveTab("account")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    activeTab === "account"
                      ? "bg-neutral-800/50 font-medium text-neutral-50"
                      : "text-neutral-400 hover:bg-neutral-800/30 hover:text-neutral-200"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Account
                </button>
                <button
                  onClick={() => setActiveTab("projects")}
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500"
                >
                  <FolderGit2 className="h-4 w-4" />
                  Your projects
                </button>
                <button
                  onClick={() => setActiveTab("appearance")}
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500"
                >
                  <Palette className="h-4 w-4" />
                  Appearance
                </button>
                <button
                  onClick={() => setActiveTab("email")}
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </button>
                <button
                  onClick={() => setActiveTab("billing")}
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500"
                >
                  <CreditCard className="h-4 w-4" />
                  Billing
                </button>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="min-w-0 flex-1">
              {/* Notification */}
              {notification && (
                <div
                  className={`mb-8 flex items-center gap-3 rounded-lg border px-5 py-4 text-sm shadow-lg ${
                    notification.type === "success"
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {notification.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  )}
                  {notification.message}
                </div>
              )}

              <div className="space-y-8">
                {/* Profile Tab */}
                {activeTab === "profile" && (
                  <>
                    {/* Profile Section */}
                    <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-8 shadow-xl backdrop-blur-sm">
                      <div className="mb-6 border-b border-neutral-800/50 pb-6">
                        <h2 className="mb-2 text-xl font-bold text-neutral-50">Public profile</h2>
                        <p className="text-sm text-neutral-400">
                          This information will be displayed publicly so be careful what you share.
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Profile Picture */}
                        <div className="flex items-start gap-8 border-b border-neutral-800/50 pb-8">
                          <div className="flex-shrink-0">
                            <UserAvatar initial={initial} size="lg" src={displayAvatar} />
                            <p className="mt-3 text-center text-xs text-neutral-500">
                              Member since
                              <br />
                              <span className="font-medium text-neutral-400">{createdAtLabel}</span>
                            </p>
                          </div>
                          <div className="flex-1">
                            <Label
                              htmlFor="avatarUrl"
                              className="mb-2 block text-sm font-semibold text-neutral-200"
                            >
                              Avatar URL
                            </Label>
                            <Input
                              id="avatarUrl"
                              value={formData.avatarUrl}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, avatarUrl: e.target.value }))
                              }
                              placeholder="https://example.com/avatar.png"
                              className="border-neutral-800 bg-neutral-950/80 text-neutral-50"
                            />
                            <p className="mt-3 text-xs text-neutral-500">
                              Enter a URL to your profile picture. File uploads coming soon.
                            </p>
                          </div>
                        </div>

                        {/* Username */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                          <Label
                            htmlFor="username"
                            className="text-sm font-semibold text-neutral-200 md:pt-3 md:text-right"
                          >
                            Username
                          </Label>
                          <div className="md:col-span-2">
                            <Input
                              id="username"
                              value={formData.username}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, username: e.target.value }))
                              }
                              placeholder="your-username"
                              className="border-neutral-800 bg-neutral-950/80 text-neutral-50"
                            />
                            <p className="mt-3 text-xs text-neutral-500">
                              Used in URLs and mentions. Only lowercase letters, numbers, dashes and
                              underscores.
                            </p>
                          </div>
                        </div>

                        {/* Display Name */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                          <Label
                            htmlFor="displayName"
                            className="text-sm font-semibold text-neutral-200 md:pt-3 md:text-right"
                          >
                            Display Name
                          </Label>
                          <div className="md:col-span-2">
                            <Input
                              id="displayName"
                              value={formData.displayName}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                              }
                              placeholder="How you appear in the app"
                              className="border-neutral-800 bg-neutral-950/80 text-neutral-50"
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                          <Label
                            htmlFor="email"
                            className="text-sm font-semibold text-neutral-200 md:pt-3 md:text-right"
                          >
                            Email
                          </Label>
                          <div className="md:col-span-2">
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              disabled
                              className="cursor-not-allowed border-neutral-800 bg-neutral-900/80 text-neutral-500"
                            />
                            <p className="mt-3 text-xs text-neutral-500">
                              Email is managed by Authentik and cannot be changed here.
                            </p>
                          </div>
                        </div>

                        {/* Bio */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                          <Label
                            htmlFor="bio"
                            className="text-sm font-semibold text-neutral-200 md:pt-3 md:text-right"
                          >
                            Bio
                          </Label>
                          <div className="md:col-span-2">
                            <textarea
                              id="bio"
                              value={formData.bio}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, bio: e.target.value }))
                              }
                              maxLength={512}
                              rows={5}
                              className="focus:border-kleff-gold focus:ring-kleff-gold/20 w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-50 transition outline-none focus:ring-2"
                              placeholder="Tell people a bit about yourself."
                            />
                            <div className="mt-3 flex justify-between text-xs text-neutral-500">
                              <span>
                                You can @mention other users and organizations to link to them.
                              </span>
                              <span className="font-medium">{formData.bio.length}/512</span>
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end border-t border-neutral-800/50 pt-6">
                          <Button
                            type="submit"
                            disabled={isSaving}
                            className="bg-gradient-kleff shadow-kleff-gold/20 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-neutral-950 shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </form>
                    </div>

                    {/* Account Activity */}
                    <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-8 shadow-xl backdrop-blur-sm">
                      <div className="mb-6 border-b border-neutral-800/50 pb-6">
                        <h2 className="mb-2 text-xl font-bold text-neutral-50">Account activity</h2>
                        <p className="text-sm text-neutral-400">
                          Security-relevant events recorded by the user-service.
                        </p>
                      </div>

                      {showAuditSkeleton && (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Skeleton
                              key={idx}
                              className="h-20 w-full rounded-lg border border-neutral-800 bg-neutral-900/70"
                            />
                          ))}
                        </div>
                      )}

                      {!showAuditSkeleton && auditError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                          {auditError}
                        </div>
                      )}

                      {!showAuditSkeleton && !auditError && (
                        <>
                          <div
                            className="space-y-0 divide-y divide-neutral-800/50"
                            data-testid="settings-audit-list"
                          >
                            {displayLogs.map((log) => (
                              <div key={log.id} className="flex items-center justify-between py-4">
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 text-sm font-semibold text-neutral-50">
                                    {log.action}
                                  </div>
                                  <div className="truncate text-xs text-neutral-500">
                                    {log.ipAddress ?? "unknown"} ·{" "}
                                    {log.userAgent?.slice(0, 80) ?? "unknown"}
                                  </div>
                                </div>
                                <div className="ml-4 flex-shrink-0 text-xs text-neutral-500">
                                  {new Date(log.timestamp).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>

                          {auditLogs.length === 0 && (
                            <p className="mt-6 text-center text-xs text-neutral-500 italic">
                              Note: Showing example activity data. Real audit logs coming soon.
                            </p>
                          )}

                          {auditLogs.length > 0 && (
                            <AuditPagination
                              currentPage={auditPage}
                              totalPages={totalPages}
                              isLoading={auditLoading}
                              onPageChange={(page) => void loadAuditPage(page)}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Account Tab */}
                {activeTab === "account" && (
                  <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-8 shadow-xl backdrop-blur-sm">
                    <div className="mb-6 border-b border-neutral-800/50 pb-6">
                      <h2 className="mb-2 text-xl font-bold text-neutral-50">Account Management</h2>
                      <p className="text-sm text-neutral-400">
                        Manage your account settings and preferences.
                      </p>
                    </div>

                    <div className="space-y-8">
                      {/* Deactivate Account Section */}
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <AlertTriangle className="h-6 w-6 text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="mb-2 text-lg font-semibold text-red-300">
                              Deactivate Account
                            </h3>
                            <p className="mb-4 text-sm text-neutral-400">
                              Deactivating your account will permanently remove all your data and
                              cannot be undone. This action will immediately log you out and remove
                              access to all your projects and data.
                            </p>
                            <Button
                              onClick={() => setShowDeactivationModal(true)}
                              variant="outline"
                              className="border-yellow-500/50 text-yellow-400 hover:border-yellow-400 hover:bg-yellow-500/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deactivate Account
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Deactivation Confirmation Modal */}
      {showDeactivationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeactivating && setShowDeactivationModal(false)}
          />

          {/* Modal content */}
          <div className="relative z-10 mx-4 w-full max-w-md">
            <div className="rounded-xl border border-yellow-500/30 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-yellow-300">Deactivate Account</h3>
              </div>

              <div className="mb-6 space-y-3 text-sm text-neutral-300">
                <p>
                  <strong>This action cannot be undone.</strong> Deactivating your account will:
                </p>
                <ul className="ml-4 list-inside list-disc space-y-1 text-neutral-400">
                  <li>Permanently delete all your data</li>
                  <li>Remove access to all projects</li>
                  <li>Log you out immediately</li>
                  <li>Cannot be reversed</li>
                </ul>
                <p className="font-medium text-yellow-300">
                  Are you sure you want to deactivate your account?
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setShowDeactivationModal(false)}
                  disabled={isDeactivating}
                  variant="secondary"
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeactivateAccount}
                  disabled={isDeactivating}
                  className="bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
                >
                  {isDeactivating ? "Deactivating..." : "Yes, Deactivate"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-20 border-t border-neutral-800/50 bg-neutral-900/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <KleffDot variant="full" size={20} />
              <span className="text-sm text-neutral-400">
                © {new Date().getFullYear()} Kleff. All rights reserved.
              </span>
            </div>
            <div className="flex gap-8 text-sm text-neutral-400">
              <Link to="/privacy" className="font-medium transition hover:text-neutral-50">
                Privacy
              </Link>
              <Link to="/terms" className="font-medium transition hover:text-neutral-50">
                Terms
              </Link>
              <Link to="/faq" className="font-medium transition hover:text-neutral-50">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
