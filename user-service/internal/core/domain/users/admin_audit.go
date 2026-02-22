package users

import "time"

// AdminAuditLog represents an audit log entry for admin actions
type AdminAuditLog struct {
	ID          string                 `json:"id"`
	AdminUserID string                 `json:"adminUserId"`
	Action      string                 `json:"action"`
	TargetType  string                 `json:"targetType,omitempty"`
	TargetID    string                 `json:"targetId,omitempty"`
	Details     map[string]interface{} `json:"details,omitempty"`
	IPAddress   string                 `json:"ipAddress,omitempty"`
	UserAgent   string                 `json:"userAgent,omitempty"`
	CreatedAt   time.Time              `json:"createdAt"`
}

// Admin action constants
const (
	ActionUserListed       = "user_listed"
	ActionUserViewed       = "user_viewed"
	ActionRoleGranted      = "role_granted"
	ActionRoleRevoked      = "role_revoked"
	ActionUserSuspended    = "user_suspended"
	ActionUserUnsuspended  = "user_unsuspended"
	ActionAuditLogViewed   = "audit_log_viewed"
)

// Target type constants
const (
	TargetTypeUser = "user"
	TargetTypeRole = "role"
)

// AdminUserListResult represents a paginated list of users for admin
type AdminUserListResult struct {
	Users      []AdminUserListItem `json:"users"`
	Total      int64               `json:"total"`
	Page       int                 `json:"page"`
	PageSize   int                 `json:"pageSize"`
	TotalPages int                 `json:"totalPages"`
}

// AdminUserListItem represents a user in the admin list view
type AdminUserListItem struct {
	ID            ID          `json:"id"`
	Email         string      `json:"email"`
	Username      string      `json:"username"`
	DisplayName   string      `json:"displayName"`
	AvatarURL     *string     `json:"avatarUrl,omitempty"`
	EmailVerified bool        `json:"emailVerified"`
	PlatformRoles []PlatformRole `json:"platformRoles,omitempty"`
	IsDeactivated bool        `json:"isDeactivated"`
	DeactivatedAt *time.Time  `json:"deactivatedAt,omitempty"`
	CreatedAt     time.Time   `json:"createdAt"`
	UpdatedAt     time.Time   `json:"updatedAt"`
}

// AdminUserDetail represents detailed user information for admin view
type AdminUserDetail struct {
	ID            ID          `json:"id"`
	AuthentikID   string      `json:"authentikId,omitempty"`
	Email         string      `json:"email"`
	EmailVerified bool        `json:"emailVerified"`
	LoginUsername string      `json:"loginUsername,omitempty"`
	Username      string      `json:"username"`
	DisplayName   string      `json:"displayName"`
	AvatarURL     *string     `json:"avatarUrl,omitempty"`
	Bio           *string     `json:"bio,omitempty"`
	PlatformRoles []PlatformRoleAssignment `json:"platformRoles"`
	IsDeactivated bool        `json:"isDeactivated"`
	DeactivatedAt *time.Time  `json:"deactivatedAt,omitempty"`
	CreatedAt     time.Time   `json:"createdAt"`
	UpdatedAt     time.Time   `json:"updatedAt"`
}

// RoleUpdateRequest represents a request to update user roles
type RoleUpdateRequest struct {
	GrantRoles []PlatformRole `json:"grantRoles,omitempty"`
	RevokeRoles []PlatformRole `json:"revokeRoles,omitempty"`
}

// RoleUpdateResult represents the result of a role update operation
type RoleUpdateResult struct {
	Success         bool             `json:"success"`
	GrantedRoles    []PlatformRole   `json:"grantedRoles,omitempty"`
	RevokedRoles    []PlatformRole   `json:"revokedRoles,omitempty"`
	FailedGrants    []RoleOperationError `json:"failedGrants,omitempty"`
	FailedRevokes   []RoleOperationError `json:"failedRevokes,omitempty"`
	HasPartialFailure bool           `json:"hasPartialFailure"`
}

// RoleOperationError represents an error for a single role operation
type RoleOperationError struct {
	Role  PlatformRole `json:"role"`
	Error string       `json:"error"`
}

// SuspendRequest represents a request to suspend/unsuspend a user
type SuspendRequest struct {
	Suspended bool   `json:"suspended"`
	Reason    string `json:"reason,omitempty"`
}

// AdminAuditLogFilter represents filters for audit log queries
type AdminAuditLogFilter struct {
	AdminUserID string     `json:"adminUserId,omitempty"`
	Action      string     `json:"action,omitempty"`
	TargetType  string     `json:"targetType,omitempty"`
	TargetID    string     `json:"targetId,omitempty"`
	StartDate   *time.Time `json:"startDate,omitempty"`
	EndDate     *time.Time `json:"endDate,omitempty"`
}

// AdminAuditLogResult represents a paginated list of audit logs
type AdminAuditLogResult struct {
	Items      []AdminAuditLog `json:"items"`
	Total      int64           `json:"total"`
	Page       int             `json:"page"`
	PageSize   int             `json:"pageSize"`
	TotalPages int             `json:"totalPages"`
}