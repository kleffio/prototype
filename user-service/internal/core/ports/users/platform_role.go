package users

import (
	"context"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
)

type PlatformRoleRepository interface {
	// GetActiveRolesByUserID returns all active (non-revoked) platform roles for a user
	GetActiveRolesByUserID(ctx context.Context, userID string) ([]domain.PlatformRole, error)

	// HasRole checks if a user has a specific active platform role
	HasRole(ctx context.Context, userID string, role domain.PlatformRole) (bool, error)

	// GrantRole grants a platform role to a user
	GrantRole(ctx context.Context, userID string, role domain.PlatformRole, grantedBy *string) error

	// RevokeRole revokes a platform role from a user
	RevokeRole(ctx context.Context, userID string, role domain.PlatformRole) error
}
