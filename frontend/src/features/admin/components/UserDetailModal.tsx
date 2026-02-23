import { useState } from "react";
import {
  X,
  Shield,
  UserX,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  User as UserIcon
} from "lucide-react";
import { useAuth } from "react-oidc-context";
import type {
  AdminUserDetail,
  PlatformRole,
  RoleUpdateRequest,
  RoleUpdateResult
} from "../types/admin";
import { PLATFORM_ROLE_LABELS } from "../types/admin";
import { RoleBadge } from "./RoleBadge";
import { updateUserRoles } from "../api/updateUserRoles";
import { suspendUser } from "../api/suspendUser";
import { Skeleton } from "@shared/ui/Skeleton";
import { Button } from "@shared/ui/Button";

interface UserDetailModalProps {
  user: AdminUserDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

const ALL_ROLES: PlatformRole[] = ["platform_admin", "platform_support", "platform_user"];

export function UserDetailModal({ user, isLoading, onClose, onUserUpdated }: UserDetailModalProps) {
  const auth = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  if (!user && !isLoading) {
    return null;
  }

  const activeRoles = user?.platformRoles?.filter((r) => !r.revokedAt).map((r) => r.role) || [];

  const handleRoleToggle = async (role: PlatformRole) => {
    if (!user || !auth.user?.access_token) return;

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const request: RoleUpdateRequest = activeRoles.includes(role)
        ? { revokeRoles: [role] }
        : { grantRoles: [role] };

      const result: RoleUpdateResult = await updateUserRoles(
        auth.user.access_token,
        user.id,
        request
      );

      if (result.hasPartialFailure) {
        // Handle partial success - some operations failed
        const failedItems = [...result.failedGrants, ...result.failedRevokes];
        const errorMessages = failedItems.map((f) => `${f.role}: ${f.error}`).join(", ");
        setError(`Partial failure: ${errorMessages}`);
      } else if (!result.success) {
        // Complete failure
        const failedItems = [...result.failedGrants, ...result.failedRevokes];
        setError(failedItems.length > 0 ? failedItems[0].error : "Failed to update role");
      } else {
        // Complete success
        setSuccess(`Role ${activeRoles.includes(role) ? "revoked" : "granted"} successfully`);
      }
      onUserUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuspend = async () => {
    if (!user || !auth.user?.access_token) return;

    setIsUpdating(true);
    setError(null);

    try {
      await suspendUser(auth.user.access_token, user.id, {
        suspended: !user.isDeactivated,
        reason: suspendReason || undefined
      });
      setSuccess(`User ${user.isDeactivated ? "unsuspended" : "suspended"} successfully`);
      setShowSuspendConfirm(false);
      setSuspendReason("");
      onUserUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update suspension status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/95 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800/50 p-6">
            <h2 className="text-lg font-semibold text-neutral-50">User Details</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="mx-auto h-16 w-16 rounded-full bg-neutral-800" />
                <Skeleton className="mx-auto h-6 w-48 bg-neutral-800" />
                <Skeleton className="mx-auto h-4 w-64 bg-neutral-800" />
              </div>
            ) : (
              <>
                {/* Notifications */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    {success}
                  </div>
                )}

                {/* User Info */}
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 text-xl font-medium text-neutral-300">
                    {user?.displayName?.[0]?.toUpperCase() ||
                      user?.username?.[0]?.toUpperCase() || <UserIcon className="h-8 w-8" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-neutral-50">{user?.displayName}</h3>
                      {user?.isDeactivated && (
                        <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
                          Suspended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <span className="text-sm">@{user?.username}</span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-neutral-800/50 bg-neutral-800/30 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm text-neutral-400">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <div className="text-neutral-50">{user?.email}</div>
                    {user?.emailVerified && (
                      <span className="text-xs text-green-400">Verified</span>
                    )}
                  </div>
                  <div className="rounded-lg border border-neutral-800/50 bg-neutral-800/30 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm text-neutral-400">
                      <Clock className="h-4 w-4" />
                      Created
                    </div>
                    <div className="text-neutral-50">
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric"
                          })
                        : "N/A"}
                    </div>
                  </div>
                </div>

                {/* Role Management */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                    <Shield className="h-4 w-4" />
                    Platform Roles
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map((role) => {
                      const isActive = activeRoles.includes(role);
                      return (
                        <button
                          key={role}
                          onClick={() => handleRoleToggle(role)}
                          disabled={isUpdating}
                          className={`rounded-lg border px-3 py-2 text-sm transition ${
                            isActive
                              ? "bg-gradient-kleff border-kleff-gold text-neutral-950"
                              : "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300"
                          } disabled:opacity-50`}
                        >
                          {PLATFORM_ROLE_LABELS[role]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Click a role to toggle it. Changes are logged for audit.
                  </p>
                </div>

                {/* Suspension Management */}
                <div className="space-y-3 border-t border-neutral-800/50 pt-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                    <UserX className="h-4 w-4" />
                    Account Status
                  </h4>

                  {showSuspendConfirm ? (
                    <div className="space-y-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                      <p className="text-sm text-yellow-300">
                        Are you sure you want to {user?.isDeactivated ? "unsuspend" : "suspend"}{" "}
                        this user?
                      </p>
                      {!user?.isDeactivated && (
                        <input
                          type="text"
                          placeholder="Reason for suspension (optional)"
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-50 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
                        />
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setShowSuspendConfirm(false)}
                          variant="secondary"
                          className="px-3 py-1.5"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSuspend}
                          disabled={isUpdating}
                          className="bg-yellow-600 px-3 py-1.5 text-white hover:bg-yellow-700"
                        >
                          {isUpdating ? "Processing..." : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowSuspendConfirm(true)}
                      disabled={isUpdating}
                      variant="outline"
                      className={
                        user?.isDeactivated
                          ? "border-green-500/50 text-green-400 hover:border-green-400 hover:bg-green-500/10"
                          : "border-red-500/50 text-red-400 hover:border-red-400 hover:bg-red-500/10"
                      }
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      {user?.isDeactivated ? "Unsuspend User" : "Suspend User"}
                    </Button>
                  )}
                </div>

                {/* Role History */}
                {user?.platformRoles && user.platformRoles.length > 0 && (
                  <div className="space-y-3 border-t border-neutral-800/50 pt-4">
                    <h4 className="text-sm font-medium text-neutral-300">Role History</h4>
                    <div className="space-y-2">
                      {user.platformRoles.map((role) => (
                        <div
                          key={role.id}
                          className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                            role.revokedAt
                              ? "border-neutral-800/50 bg-neutral-800/20 text-neutral-500"
                              : "border-neutral-800/50 bg-neutral-800/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <RoleBadge role={role.role} />
                            {role.revokedAt && (
                              <span className="text-xs text-neutral-500">(Revoked)</span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500">
                            Granted {new Date(role.grantedAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
