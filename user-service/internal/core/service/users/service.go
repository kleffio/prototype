package users

import (
	"context"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
)

var (
	ErrUserNotFound    = errors.New("user not found")
	ErrInvalidToken    = errors.New("invalid or expired token")
	ErrInvalidUsername = errors.New("invalid username format")
	ErrUsernameTaken   = errors.New("username already taken")
	ErrInvalidUpdate   = errors.New("invalid profile update")
)

var usernameRegex = regexp.MustCompile(`^[a-z0-9_-]{2,63}$`)

type Service struct {
	repo             port.UserRepository
	auditRepo        port.AuditRepository
	platformRoleRepo port.PlatformRoleRepository
	tokenValidator   port.TokenValidator
	authentikManager port.AuthentikUserManager
	defaultAdminEmail string
}

func NewService(
	repo port.UserRepository,
	auditRepo port.AuditRepository,
	platformRoleRepo port.PlatformRoleRepository,
	tokenValidator port.TokenValidator,
	authentikManager port.AuthentikUserManager,
	defaultAdminEmail string,
) *Service {
	return &Service{
		repo:             repo,
		auditRepo:        auditRepo,
		platformRoleRepo: platformRoleRepo,
		tokenValidator:   tokenValidator,
		authentikManager: authentikManager,
		defaultAdminEmail: defaultAdminEmail,
	}
}

// GetMe fetches the current user from their bearer token
func (s *Service) GetMe(ctx context.Context, bearerToken string) (*domain.User, error) {
	if bearerToken == "" {
		return nil, ErrInvalidToken
	}

	claims, err := s.tokenValidator.ValidateToken(ctx, bearerToken)
	if err != nil {
		log.Printf("token validation failed: %v", err)
		return nil, ErrInvalidToken
	}

	// Ensure user exists from token claims
	user, err := s.EnsureUserFromToken(ctx, claims)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// EnsureUserFromToken creates or updates a user from OIDC token claims
func (s *Service) EnsureUserFromToken(ctx context.Context, claims *port.TokenClaims) (*domain.User, error) {
	user, err := s.repo.GetByID(ctx, domain.ID(claims.Sub))
	if err != nil {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	now := time.Now().UTC()

	if user == nil {
		username := s.generateUniqueUsername(ctx, claims)
		displayName := s.generateDisplayName(claims)

		var authentikID string
		if s.authentikManager != nil && claims.Email != "" {
			if uuid, err := s.authentikManager.ResolveUserID(ctx, claims.Email); err != nil {
				log.Printf("failed to resolve authentik uuid for %s: %v", claims.Email, err)
			} else {
				authentikID = uuid
			}
		}

		log.Print(authentikID)

		user = &domain.User{
			ID:            domain.ID(claims.Sub),
			AuthentikID:   authentikID,
			Email:         claims.Email,
			EmailVerified: claims.EmailVerified,
			LoginUsername: claims.PreferredUsername,
			Username:      username,
			DisplayName:   displayName,
			CreatedAt:     now,
			UpdatedAt:     now,
		}

		if err := s.repo.Save(ctx, user); err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}

		log.Printf("created new user: id=%s username=%s", user.ID, user.Username)
		return user, nil
	}

	if user.AuthentikID == "" && s.authentikManager != nil && claims.Email != "" {
		if uuid, err := s.authentikManager.ResolveUserID(ctx, claims.Email); err != nil {
			log.Printf("failed to backfill authentik uuid for %s: %v", claims.Email, err)
		} else {
			user.AuthentikID = uuid
			user.UpdatedAt = now
			if err := s.repo.Save(ctx, user); err != nil {
				log.Printf("failed to save authentik uuid for user %s: %v", user.ID, err)
			}
		}
	}

	// Existing user - update identity fields if changed
	updated := false
	oldUser := *user

	if user.Email != claims.Email {
		user.Email = claims.Email
		updated = true
	}
	if user.EmailVerified != claims.EmailVerified {
		user.EmailVerified = claims.EmailVerified
		updated = true
	}
	if claims.PreferredUsername != "" && user.LoginUsername != claims.PreferredUsername {
		user.LoginUsername = claims.PreferredUsername
		updated = true
	}

	if updated {
		user.UpdatedAt = now
		if err := s.repo.Save(ctx, user); err != nil {
			return nil, fmt.Errorf("failed to update user: %w", err)
		}

		s.detectAndLogChanges(ctx, &oldUser, user)
		log.Printf("updated user identity: id=%s", user.ID)
	}

	// Auto-grant platform admin role if email matches DEFAULT_ADMIN_EMAIL
	if s.defaultAdminEmail != "" && s.platformRoleRepo != nil {
		if strings.EqualFold(user.Email, s.defaultAdminEmail) {
			hasRole, err := s.platformRoleRepo.HasRole(ctx, string(user.ID), domain.PlatformAdmin)
			if err != nil {
				log.Printf("failed to check platform admin role for %s: %v", user.Email, err)
			} else if !hasRole {
				if err := s.platformRoleRepo.GrantRole(ctx, string(user.ID), domain.PlatformAdmin, nil); err != nil {
					log.Printf("failed to auto-grant platform admin to %s: %v", user.Email, err)
				} else {
					log.Printf("auto-granted platform_admin role to %s (DEFAULT_ADMIN_EMAIL)", user.Email)
				}
			}
		}
	}

	return user, nil
}

// Get fetches a user by ID
func (s *Service) Get(ctx context.Context, id domain.ID) (*domain.User, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

// GetByHandle fetches a user by their public username (handle)
func (s *Service) GetByHandle(ctx context.Context, handle string) (*domain.User, error) {
	user, err := s.repo.GetByUsername(ctx, handle)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	log.Printf(user.AuthentikID)
	return user, nil
}

// UpdateProfile updates user profile fields
func (s *Service) UpdateProfile(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error) {
	// Get existing user
	oldUser, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	if oldUser == nil {
		return nil, ErrUserNotFound
	}

	usernameChanged := false
	newUsername := ""

	if update.Username != nil {
		normalized := strings.ToLower(strings.TrimSpace(*update.Username))
		if !usernameRegex.MatchString(normalized) {
			return nil, ErrInvalidUsername
		}

		if normalized != oldUser.Username {
			exists, err := s.repo.UsernameExists(ctx, normalized, id)
			if err != nil {
				return nil, fmt.Errorf("failed to check username: %w", err)
			}
			if exists {
				return nil, ErrUsernameTaken
			}

			usernameChanged = true
			newUsername = normalized
		}

		update.Username = &normalized
	}

	if update.DisplayName != nil {
		trimmed := strings.TrimSpace(*update.DisplayName)
		if trimmed == "" || len(trimmed) > 255 {
			return nil, ErrInvalidUpdate
		}
		update.DisplayName = &trimmed
	}

	if usernameChanged {
		if s.authentikManager == nil {
			return nil, fmt.Errorf("authentik manager not configured, cannot update username")
		}

		if oldUser.AuthentikID == "" {
			return nil, fmt.Errorf("missing authentik id for user %s", id)
		}

		if err := s.authentikManager.UpdateUsername(ctx, oldUser.AuthentikID, newUsername); err != nil {
			return nil, fmt.Errorf("failed to sync username to Authentik: %w", err)
		}

		log.Printf("successfully synced username to Authentik: user=%s authentik_id=%s username=%s",
			id, oldUser.AuthentikID, newUsername)
	}

	if err := s.repo.UpdateProfile(ctx, id, update); err != nil {
		log.Printf("CRITICAL: Authentik updated but local DB failed for user %s: %v", id, err)
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	newUser, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch updated user: %w", err)
	}

	s.detectAndLogChanges(ctx, oldUser, newUser)

	return newUser, nil
}

// ResolveMany fetches multiple users by ID (kept for compatibility)
func (s *Service) ResolveMany(ctx context.Context, ids []domain.ID) (map[domain.ID]*domain.User, error) {
	result := make(map[domain.ID]*domain.User)
	for _, id := range ids {
		user, err := s.repo.GetByID(ctx, id)
		if err != nil {
			log.Printf("failed to resolve user %s: %v", id, err)
			continue
		}
		if user != nil {
			result[id] = user
		}
	}
	return result, nil
}

// GetAuditLogs retrieves audit logs for a user
func (s *Service) GetAuditLogs(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
	if s.auditRepo == nil {
		return nil, nil
	}
	return s.auditRepo.GetUserAuditLogs(ctx, userID, limit, offset)
}

func (s *Service) GetMyAuditLogs(
	ctx context.Context,
	userID domain.ID,
	limit, offset int,
) ([]*domain.AuditLog, int64, error) {
	logs, err := s.auditRepo.GetUserAuditLogs(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.auditRepo.CountByUser(ctx, string(userID))
	if err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// GetMyPlatformRoles retrieves the platform roles for a user
func (s *Service) GetMyPlatformRoles(ctx context.Context, userID domain.ID) ([]domain.PlatformRole, error) {
	if s.platformRoleRepo == nil {
		return []domain.PlatformRole{}, nil
	}

	roles, err := s.platformRoleRepo.GetActiveRolesByUserID(ctx, string(userID))
	if err != nil {
		return nil, fmt.Errorf("failed to get platform roles: %w", err)
	}

	return roles, nil
}

// --- Helpers ---

func (s *Service) generateUniqueUsername(ctx context.Context, claims *port.TokenClaims) string {
	// Try preferred_username first
	if claims.PreferredUsername != "" {
		candidate := normalizeUsername(claims.PreferredUsername)
		if candidate != "" && !s.usernameExists(ctx, candidate) {
			return candidate
		}
	}

	// Try email local part
	if claims.Email != "" {
		parts := strings.Split(claims.Email, "@")
		if len(parts) > 0 {
			candidate := normalizeUsername(parts[0])
			if candidate != "" && !s.usernameExists(ctx, candidate) {
				return candidate
			}
		}
	}

	// Generate random username
	for i := 0; i < 10; i++ {
		candidate := fmt.Sprintf("user_%s", uuid.New().String()[:8])
		if !s.usernameExists(ctx, candidate) {
			return candidate
		}
	}
	return fmt.Sprintf("user_%s", uuid.New().String()[:12])
}

func (s *Service) generateDisplayName(claims *port.TokenClaims) string {
	if claims.PreferredUsername != "" {
		return claims.PreferredUsername
	}
	if claims.Email != "" {
		parts := strings.Split(claims.Email, "@")
		if len(parts) > 0 && parts[0] != "" {
			return parts[0]
		}
	}
	return "User"
}

func normalizeUsername(input string) string {
	lower := strings.ToLower(input)
	normalized := regexp.MustCompile(`[^a-z0-9_-]`).ReplaceAllString(lower, "")
	if len(normalized) < 2 || len(normalized) > 63 {
		return ""
	}
	return normalized
}

func (s *Service) usernameExists(ctx context.Context, username string) bool {
	exists, err := s.repo.UsernameExists(ctx, username, "")
	if err != nil {
		log.Printf("failed to check username existence: %v", err)
		return true
	}
	return exists
}

func (s *Service) detectAndLogChanges(ctx context.Context, oldUser, newUser *domain.User) {
	if s.auditRepo == nil {
		return
	}

	changes := make(map[string]domain.ChangeDetail)

	if oldUser.Username != newUser.Username {
		changes["username"] = domain.ChangeDetail{
			Old: oldUser.Username,
			New: newUser.Username,
		}
	}

	if oldUser.DisplayName != newUser.DisplayName {
		changes["displayName"] = domain.ChangeDetail{
			Old: oldUser.DisplayName,
			New: newUser.DisplayName,
		}
	}
	if oldUser.Email != newUser.Email {
		changes["email"] = domain.ChangeDetail{
			Old: oldUser.Email,
			New: newUser.Email,
		}
	}
	if ptrStr(oldUser.AvatarURL) != ptrStr(newUser.AvatarURL) {
		changes["avatarUrl"] = domain.ChangeDetail{
			Old: ptrStr(oldUser.AvatarURL),
			New: ptrStr(newUser.AvatarURL),
		}
	}
	if ptrStr(oldUser.Bio) != ptrStr(newUser.Bio) {
		changes["bio"] = domain.ChangeDetail{
			Old: ptrStr(oldUser.Bio),
			New: ptrStr(newUser.Bio),
		}
	}

	if len(changes) == 0 {
		return
	}

	auditLog := &domain.AuditLog{
		ID:        uuid.New().String(),
		UserID:    newUser.ID,
		Action:    "profile_updated",
		Changes:   changes,
		Timestamp: time.Now().UTC(),
	}

	if err := s.auditRepo.Record(ctx, auditLog); err != nil {
		log.Printf("failed to record audit log: %v", err)
	}
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func (s *Service) logAction(ctx context.Context, userID domain.ID, action string, changes map[string]domain.ChangeDetail) {
	if s.auditRepo == nil {
		return
	}

	auditLog := &domain.AuditLog{
		ID:        uuid.New().String(),
		UserID:    userID,
		Action:    action,
		Changes:   changes,
		Timestamp: time.Now().UTC(),
	}

	if err := s.auditRepo.Record(ctx, auditLog); err != nil {
		log.Printf("failed to record audit log: %v", err)
	}
}
