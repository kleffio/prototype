package users

import (
	"context"
	"errors"
	"log"
	"time"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
)

var (
	ErrUnauthorized     = errors.New("unauthorized: admin access required")
	ErrInvalidRole      = errors.New("invalid platform role")
	ErrCannotModifySelf = errors.New("cannot modify own account via admin API")
)

// AdminService provides admin operations
type AdminService struct {
	adminUserRepo   port.AdminUserRepository
	adminAuditRepo  port.AdminAuditRepository
	platformRoleRepo port.PlatformRoleRepository
}

// NewAdminService creates a new admin service
func NewAdminService(
	adminUserRepo port.AdminUserRepository,
	adminAuditRepo port.AdminAuditRepository,
	platformRoleRepo port.PlatformRoleRepository,
) *AdminService {
	return &AdminService{
		adminUserRepo:   adminUserRepo,
		adminAuditRepo:  adminAuditRepo,
		platformRoleRepo: platformRoleRepo,
	}
}

// AdminContext contains information about the admin performing the action
type AdminContext struct {
	AdminUserID string
	IPAddress   string
	UserAgent   string
}

// ListUsers retrieves a paginated list of users
func (s *AdminService) ListUsers(ctx context.Context, adminCtx AdminContext, page, pageSize int, search string) (*domain.AdminUserListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	users, total, err := s.adminUserRepo.ListAll(ctx, pageSize, offset, search)
	if err != nil {
		log.Printf("error listing users: %v", err)
		return nil, err
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	// Log admin action
	s.logAdminAction(ctx, adminCtx, domain.ActionUserListed, "", "", map[string]interface{}{
		"page":     page,
		"pageSize": pageSize,
		"search":   search,
		"total":    total,
	})

	return &domain.AdminUserListResult{
		Users:      users,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// GetUserDetails retrieves detailed information about a user
func (s *AdminService) GetUserDetails(ctx context.Context, adminCtx AdminContext, userID domain.ID) (*domain.AdminUserDetail, error) {
	user, err := s.adminUserRepo.GetAdminUserDetail(ctx, userID)
	if err != nil {
		log.Printf("error getting user details for %s: %v", userID, err)
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	// Log admin action
	s.logAdminAction(ctx, adminCtx, domain.ActionUserViewed, domain.TargetTypeUser, string(userID), map[string]interface{}{
		"email":    user.Email,
		"username": user.Username,
	})

	return user, nil
}

// UpdateUserRoles grants or revokes platform roles for a user
func (s *AdminService) UpdateUserRoles(ctx context.Context, adminCtx AdminContext, userID domain.ID, req *domain.RoleUpdateRequest) (*domain.RoleUpdateResult, error) {
	// Prevent self-modification
	if adminCtx.AdminUserID == string(userID) {
		return nil, ErrCannotModifySelf
	}

	// Verify user exists
	user, err := s.adminUserRepo.GetAdminUserDetail(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	// Validate roles
	for _, role := range req.GrantRoles {
		if !role.IsValid() {
			return nil, ErrInvalidRole
		}
	}
	for _, role := range req.RevokeRoles {
		if !role.IsValid() {
			return nil, ErrInvalidRole
		}
	}

	result := &domain.RoleUpdateResult{
		Success:       true,
		GrantedRoles:  []domain.PlatformRole{},
		RevokedRoles:  []domain.PlatformRole{},
		FailedGrants:  []domain.RoleOperationError{},
		FailedRevokes: []domain.RoleOperationError{},
	}

	// Grant roles
	for _, role := range req.GrantRoles {
		err := s.platformRoleRepo.GrantRole(ctx, string(userID), role, &adminCtx.AdminUserID)
		if err != nil {
			log.Printf("error granting role %s to user %s: %v", role, userID, err)
			result.FailedGrants = append(result.FailedGrants, domain.RoleOperationError{
				Role:  role,
				Error: err.Error(),
			})
			continue
		}

		result.GrantedRoles = append(result.GrantedRoles, role)

		// Log each role grant
		s.logAdminAction(ctx, adminCtx, domain.ActionRoleGranted, domain.TargetTypeUser, string(userID), map[string]interface{}{
			"role":     string(role),
			"email":    user.Email,
			"username": user.Username,
		})
	}

	// Revoke roles
	for _, role := range req.RevokeRoles {
		err := s.platformRoleRepo.RevokeRole(ctx, string(userID), role)
		if err != nil {
			log.Printf("error revoking role %s from user %s: %v", role, userID, err)
			result.FailedRevokes = append(result.FailedRevokes, domain.RoleOperationError{
				Role:  role,
				Error: err.Error(),
			})
			continue
		}

		result.RevokedRoles = append(result.RevokedRoles, role)

		// Log each role revocation
		s.logAdminAction(ctx, adminCtx, domain.ActionRoleRevoked, domain.TargetTypeUser, string(userID), map[string]interface{}{
			"role":     string(role),
			"email":    user.Email,
			"username": user.Username,
		})
	}

	// Determine if there were partial failures
	result.HasPartialFailure = len(result.FailedGrants) > 0 || len(result.FailedRevokes) > 0
	if result.HasPartialFailure && len(result.GrantedRoles) == 0 && len(result.RevokedRoles) == 0 {
		result.Success = false
	}

	return result, nil
}

// SuspendUser suspends or unsuspends a user account
func (s *AdminService) SuspendUser(ctx context.Context, adminCtx AdminContext, userID domain.ID, suspended bool, reason string) error {
	// Prevent self-modification
	if adminCtx.AdminUserID == string(userID) {
		return ErrCannotModifySelf
	}

	// Verify user exists
	user, err := s.adminUserRepo.GetAdminUserDetail(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}

	// Update deactivation status
	err = s.adminUserRepo.SetDeactivated(ctx, userID, suspended)
	if err != nil {
		log.Printf("error setting deactivation status for user %s: %v", userID, err)
		return err
	}

	// Log admin action
	action := domain.ActionUserSuspended
	if !suspended {
		action = domain.ActionUserUnsuspended
	}

	s.logAdminAction(ctx, adminCtx, action, domain.TargetTypeUser, string(userID), map[string]interface{}{
		"suspended": suspended,
		"reason":    reason,
		"email":     user.Email,
		"username":  user.Username,
	})

	return nil
}

// GetUserActivity retrieves audit log history for a specific user
func (s *AdminService) GetUserActivity(ctx context.Context, adminCtx AdminContext, userID domain.ID, limit, offset int) ([]domain.AdminAuditLog, int64, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}

	logs, total, err := s.adminAuditRepo.GetByTarget(ctx, domain.TargetTypeUser, string(userID), limit, offset)
	if err != nil {
		log.Printf("error getting user activity for %s: %v", userID, err)
		return nil, 0, err
	}

	return logs, total, nil
}

// GetAuditLogs retrieves paginated admin audit logs with filtering
func (s *AdminService) GetAuditLogs(ctx context.Context, adminCtx AdminContext, filter *domain.AdminAuditLogFilter, limit, offset int) (*domain.AdminAuditLogResult, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}

	logs, total, err := s.adminAuditRepo.List(ctx, filter, limit, offset)
	if err != nil {
		log.Printf("error getting audit logs: %v", err)
		return nil, err
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	// Log admin action
	s.logAdminAction(ctx, adminCtx, domain.ActionAuditLogViewed, "", "", map[string]interface{}{
		"filter": filter,
		"limit":  limit,
		"offset": offset,
	})

	return &domain.AdminAuditLogResult{
		Items:      logs,
		Total:      total,
		Page:       offset/limit + 1,
		PageSize:   limit,
		TotalPages: totalPages,
	}, nil
}

// logAdminAction records an admin action to the audit log
func (s *AdminService) logAdminAction(ctx context.Context, adminCtx AdminContext, action, targetType, targetID string, details map[string]interface{}) {
	if s.adminAuditRepo == nil {
		return
	}

	logEntry := &domain.AdminAuditLog{
		AdminUserID: adminCtx.AdminUserID,
		Action:      action,
		TargetType:  targetType,
		TargetID:    targetID,
		Details:     details,
		IPAddress:   adminCtx.IPAddress,
		UserAgent:   adminCtx.UserAgent,
		CreatedAt:   time.Now().UTC(),
	}

	if err := s.adminAuditRepo.Record(ctx, logEntry); err != nil {
		log.Printf("failed to record admin audit log: %v", err)
	}
}