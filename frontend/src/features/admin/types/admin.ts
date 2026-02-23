// Platform Role type
export type PlatformRole = "platform_admin" | "platform_support" | "platform_user";

// Admin API types
export interface AdminUserListItem {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  platformRoles: PlatformRole[];
  isDeactivated: boolean;
  deactivatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail {
  id: string;
  authentikId?: string;
  email: string;
  emailVerified: boolean;
  loginUsername?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  platformRoles: PlatformRoleAssignment[];
  isDeactivated: boolean;
  deactivatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformRoleAssignment {
  id: string;
  userId: string;
  role: PlatformRole;
  grantedBy?: string;
  grantedAt: string;
  revokedAt?: string;
  createdAt: string;
}

export interface AdminUserListResult {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RoleUpdateRequest {
  grantRoles?: PlatformRole[];
  revokeRoles?: PlatformRole[];
}

export interface RoleOperationError {
  role: PlatformRole;
  error: string;
}

export interface RoleUpdateResult {
  success: boolean;
  grantedRoles: PlatformRole[];
  revokedRoles: PlatformRole[];
  failedGrants: RoleOperationError[];
  failedRevokes: RoleOperationError[];
  hasPartialFailure: boolean;
  user?: AdminUserDetail;
}

export interface SuspendRequest {
  suspended: boolean;
  reason?: string;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AdminAuditLogFilter {
  adminUserId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AdminAuditLogResult {
  items: AdminAuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// UI State types
export interface UsersTableState {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "createdAt" | "username" | "email";
  sortOrder: "asc" | "desc";
}

export interface AuditLogsTableState {
  page: number;
  pageSize: number;
  filter: AdminAuditLogFilter;
}

// Action types
export type AdminAction =
  | "user_listed"
  | "user_viewed"
  | "role_granted"
  | "role_revoked"
  | "user_suspended"
  | "user_unsuspended"
  | "audit_log_viewed";

export const ADMIN_ACTION_LABELS: Record<AdminAction, string> = {
  user_listed: "Users Listed",
  user_viewed: "User Viewed",
  role_granted: "Role Granted",
  role_revoked: "Role Revoked",
  user_suspended: "User Suspended",
  user_unsuspended: "User Unsuspended",
  audit_log_viewed: "Audit Log Viewed"
};

// Platform role labels
export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  platform_admin: "Platform Admin",
  platform_support: "Platform Support",
  platform_user: "Platform User"
};

export const PLATFORM_ROLE_COLORS: Record<PlatformRole, string> = {
  platform_admin: "bg-red-500/20 text-red-300 border-red-500/30",
  platform_support: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  platform_user: "bg-blue-500/20 text-blue-300 border-blue-500/30"
};
