package users

import (
	"context"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
)

// AdminAuditRepository handles persistence of admin audit logs
type AdminAuditRepository interface {
	// Record creates a new admin audit log entry
	Record(ctx context.Context, log *domain.AdminAuditLog) error

	// List retrieves paginated admin audit logs with optional filtering
	List(ctx context.Context, filter *domain.AdminAuditLogFilter, limit, offset int) ([]domain.AdminAuditLog, int64, error)

	// GetByAdminUserID retrieves audit logs for a specific admin
	GetByAdminUserID(ctx context.Context, adminUserID string, limit, offset int) ([]domain.AdminAuditLog, int64, error)

	// GetByTarget retrieves audit logs for a specific target
	GetByTarget(ctx context.Context, targetType, targetID string, limit, offset int) ([]domain.AdminAuditLog, int64, error)
}

// AdminUserRepository extends UserRepository with admin-specific operations
type AdminUserRepository interface {
	// ListAll retrieves paginated users with optional search
	ListAll(ctx context.Context, limit, offset int, search string) ([]domain.AdminUserListItem, int64, error)

	// GetAdminUserDetail retrieves detailed user information including roles
	GetAdminUserDetail(ctx context.Context, userID domain.ID) (*domain.AdminUserDetail, error)

	// SetDeactivated sets the deactivation status of a user (admin operation)
	SetDeactivated(ctx context.Context, userID domain.ID, deactivated bool) error

	// Count counts total users (with optional search filter)
	Count(ctx context.Context, search string) (int64, error)
}