package http

import (
	"context"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
)

type UserService interface {
	Get(ctx context.Context, id domain.ID) (*domain.User, error)
	GetMe(ctx context.Context, bearerToken string) (*domain.User, error)
	GetByHandle(ctx context.Context, handle string) (*domain.User, error)
	UpdateProfile(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error)
	ResolveMany(ctx context.Context, ids []domain.ID) (map[domain.ID]*domain.User, error)
	GetAuditLogs(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error)
	GetMyAuditLogs(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, int64, error)
	DeactivateAccount(ctx context.Context, userID domain.ID) error
}
