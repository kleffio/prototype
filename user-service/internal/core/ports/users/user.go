package users

import (
	"context"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
)

type UserRepository interface {
	GetByID(ctx context.Context, id domain.ID) (*domain.User, error)
	GetByUsername(ctx context.Context, username string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Save(ctx context.Context, user *domain.User) error
	UpdateProfile(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) error
	UpdateUserID(ctx context.Context, oldID, newID domain.ID) error
	UsernameExists(ctx context.Context, username string, excludeID domain.ID) (bool, error)
	DeactivateAccount(ctx context.Context, id domain.ID) error
	Delete(ctx context.Context, id domain.ID) error
	IsUserDeleted(ctx context.Context, id domain.ID, email string) (bool, error)
}

type TokenClaims struct {
	Sub               string `json:"sub"`
	Email             string `json:"email"`
	EmailVerified     bool   `json:"email_verified"`
	PreferredUsername string `json:"preferred_username,omitempty"`
}

type TokenValidator interface {
	ValidateToken(ctx context.Context, bearerToken string) (*TokenClaims, error)
}

type AuthentikUserManager interface {
	UpdateUsername(ctx context.Context, userID string, username string) error
	ResolveUserID(ctx context.Context, uuid string) (string, error)
}
