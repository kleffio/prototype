package users

import (
	"context"
	"errors"
	"testing"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
)

// Mock repositories and services
type mockUserRepository struct {
	getByIDFunc        func(ctx context.Context, id domain.ID) (*domain.User, error)
	getByUsernameFunc  func(ctx context.Context, username string) (*domain.User, error)
	saveFunc           func(ctx context.Context, user *domain.User) error
	updateProfileFunc  func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) error
	usernameExistsFunc func(ctx context.Context, username string, excludeID domain.ID) (bool, error)
}

func (m *mockUserRepository) GetByID(ctx context.Context, id domain.ID) (*domain.User, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, nil
}

func (m *mockUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	if m.getByUsernameFunc != nil {
		return m.getByUsernameFunc(ctx, username)
	}
	return nil, nil
}

func (m *mockUserRepository) Save(ctx context.Context, user *domain.User) error {
	if m.saveFunc != nil {
		return m.saveFunc(ctx, user)
	}
	return nil
}

func (m *mockUserRepository) UpdateProfile(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) error {
	if m.updateProfileFunc != nil {
		return m.updateProfileFunc(ctx, id, update)
	}
	return nil
}

func (m *mockUserRepository) UsernameExists(ctx context.Context, username string, excludeID domain.ID) (bool, error) {
	if m.usernameExistsFunc != nil {
		return m.usernameExistsFunc(ctx, username, excludeID)
	}
	return false, nil
}

type mockAuditRepository struct {
	recordFunc           func(ctx context.Context, log *domain.AuditLog) error
	getUserAuditLogsFunc func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error)
	countByUserFunc      func(ctx context.Context, userID string) (int64, error)
}

func (m *mockAuditRepository) Record(ctx context.Context, log *domain.AuditLog) error {
	if m.recordFunc != nil {
		return m.recordFunc(ctx, log)
	}
	return nil
}

func (m *mockAuditRepository) GetUserAuditLogs(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
	if m.getUserAuditLogsFunc != nil {
		return m.getUserAuditLogsFunc(ctx, userID, limit, offset)
	}
	return nil, nil
}

func (m *mockAuditRepository) CountByUser(ctx context.Context, userID string) (int64, error) {
	if m.countByUserFunc != nil {
		return m.countByUserFunc(ctx, userID)
	}
	return 0, nil
}

type mockTokenValidator struct {
	validateFunc func(ctx context.Context, token string) (*port.TokenClaims, error)
}

func (m *mockTokenValidator) ValidateToken(ctx context.Context, token string) (*port.TokenClaims, error) {
	if m.validateFunc != nil {
		return m.validateFunc(ctx, token)
	}
	return nil, nil
}

type mockAuthentikManager struct {
	updateUsernameFunc func(ctx context.Context, userID string, username string) error
	resolveUserIDFunc  func(ctx context.Context, email string) (string, error)
}

func (m *mockAuthentikManager) UpdateUsername(ctx context.Context, userID string, username string) error {
	if m.updateUsernameFunc != nil {
		return m.updateUsernameFunc(ctx, userID, username)
	}
	return nil
}

func (m *mockAuthentikManager) ResolveUserID(ctx context.Context, email string) (string, error) {
	if m.resolveUserIDFunc != nil {
		return m.resolveUserIDFunc(ctx, email)
	}
	return "", nil
}

type mockPlatformRoleRepository struct {
	getActiveRolesByUserIDFunc func(ctx context.Context, userID string) ([]domain.PlatformRole, error)
	hasRoleFunc                func(ctx context.Context, userID string, role domain.PlatformRole) (bool, error)
	grantRoleFunc              func(ctx context.Context, userID string, role domain.PlatformRole, grantedBy *string) error
	revokeRoleFunc             func(ctx context.Context, userID string, role domain.PlatformRole) error
}

func (m *mockPlatformRoleRepository) GetActiveRolesByUserID(ctx context.Context, userID string) ([]domain.PlatformRole, error) {
	if m.getActiveRolesByUserIDFunc != nil {
		return m.getActiveRolesByUserIDFunc(ctx, userID)
	}
	return nil, nil
}

func (m *mockPlatformRoleRepository) HasRole(ctx context.Context, userID string, role domain.PlatformRole) (bool, error) {
	if m.hasRoleFunc != nil {
		return m.hasRoleFunc(ctx, userID, role)
	}
	return false, nil
}

func (m *mockPlatformRoleRepository) GrantRole(ctx context.Context, userID string, role domain.PlatformRole, grantedBy *string) error {
	if m.grantRoleFunc != nil {
		return m.grantRoleFunc(ctx, userID, role, grantedBy)
	}
	return nil
}

func (m *mockPlatformRoleRepository) RevokeRole(ctx context.Context, userID string, role domain.PlatformRole) error {
	if m.revokeRoleFunc != nil {
		return m.revokeRoleFunc(ctx, userID, role)
	}
	return nil
}

func TestGetMe(t *testing.T) {
	tests := []struct {
		name          string
		token         string
		validatorFunc func(ctx context.Context, token string) (*port.TokenClaims, error)
		repoFunc      func(ctx context.Context, id domain.ID) (*domain.User, error)
		expectError   bool
		errorIs       error
	}{
		{
			name:        "empty token",
			token:       "",
			expectError: true,
			errorIs:     ErrInvalidToken,
		},
		{
			name:  "validation fails",
			token: "invalid",
			validatorFunc: func(ctx context.Context, token string) (*port.TokenClaims, error) {
				return nil, errors.New("invalid token")
			},
			expectError: true,
			errorIs:     ErrInvalidToken,
		},
		{
			name:  "success",
			token: "valid",
			validatorFunc: func(ctx context.Context, token string) (*port.TokenClaims, error) {
				return &port.TokenClaims{
					Sub:   "user123",
					Email: "test@example.com",
				}, nil
			},
			repoFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
				return &domain.User{
					ID:       id,
					Username: "testuser",
				}, nil
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService(
				&mockUserRepository{getByIDFunc: tt.repoFunc},
				&mockAuditRepository{},
				&mockPlatformRoleRepository{},
				&mockTokenValidator{validateFunc: tt.validatorFunc},
				&mockAuthentikManager{},
				"",
			)

			user, err := svc.GetMe(context.Background(), tt.token)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
				if tt.errorIs != nil && !errors.Is(err, tt.errorIs) {
					t.Errorf("expected error %v, got %v", tt.errorIs, err)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if user == nil {
					t.Error("expected user, got nil")
				}
			}
		})
	}
}

func TestEnsureUserFromToken(t *testing.T) {
	tests := []struct {
		name            string
		claims          *port.TokenClaims
		existingUser    *domain.User
		repoError       error
		authentikResult string
		authentikError  error
		saveError       error
		expectError     bool
	}{
		{
			name: "create new user with authentik",
			claims: &port.TokenClaims{
				Sub:   "user123",
				Email: "test@example.com",
			},
			existingUser:    nil,
			authentikResult: "auth123",
			expectError:     false,
		},
		{
			name: "create new user authentik fails",
			claims: &port.TokenClaims{
				Sub:   "user123",
				Email: "test@example.com",
			},
			existingUser:   nil,
			authentikError: errors.New("authentik error"),
			expectError:    false,
		},
		{
			name: "create new user save fails",
			claims: &port.TokenClaims{
				Sub:   "user123",
				Email: "test@example.com",
			},
			existingUser: nil,
			saveError:    errors.New("save failed"),
			expectError:  true,
		},
		{
			name: "update existing user email",
			claims: &port.TokenClaims{
				Sub:   "user123",
				Email: "newemail@example.com",
			},
			existingUser: &domain.User{
				ID:       "user123",
				Email:    "oldemail@example.com",
				Username: "testuser",
			},
			expectError: false,
		},
		{
			name: "update existing user login username",
			claims: &port.TokenClaims{
				Sub:               "user123",
				Email:             "test@example.com",
				PreferredUsername: "newlogin",
			},
			existingUser: &domain.User{
				ID:            "user123",
				Email:         "test@example.com",
				Username:      "testuser",
				LoginUsername: "oldlogin",
			},
			expectError: false,
		},
		{
			name: "backfill authentik id",
			claims: &port.TokenClaims{
				Sub:   "user123",
				Email: "test@example.com",
			},
			existingUser: &domain.User{
				ID:          "user123",
				Email:       "test@example.com",
				Username:    "testuser",
				AuthentikID: "",
			},
			authentikResult: "auth123",
			expectError:     false,
		},
		{
			name: "repository error",
			claims: &port.TokenClaims{
				Sub: "user123",
			},
			repoError:   errors.New("db error"),
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockUserRepository{
				getByIDFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
					if tt.repoError != nil {
						return nil, tt.repoError
					}
					return tt.existingUser, nil
				},
				saveFunc: func(ctx context.Context, user *domain.User) error {
					return tt.saveError
				},
			}

			authentikMgr := &mockAuthentikManager{
				resolveUserIDFunc: func(ctx context.Context, email string) (string, error) {
					return tt.authentikResult, tt.authentikError
				},
			}

			svc := NewService(repo, &mockAuditRepository{}, &mockPlatformRoleRepository{}, &mockTokenValidator{}, authentikMgr, "")

			user, err := svc.EnsureUserFromToken(context.Background(), tt.claims)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if user == nil {
					t.Error("expected user, got nil")
				}
			}
		})
	}
}

func TestGet(t *testing.T) {
	tests := []struct {
		name        string
		userID      domain.ID
		repoFunc    func(ctx context.Context, id domain.ID) (*domain.User, error)
		expectError bool
		errorIs     error
	}{
		{
			name:   "user not found",
			userID: "user123",
			repoFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
				return nil, nil
			},
			expectError: true,
			errorIs:     ErrUserNotFound,
		},
		{
			name:   "repository error",
			userID: "user123",
			repoFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
				return nil, errors.New("db error")
			},
			expectError: true,
		},
		{
			name:   "success",
			userID: "user123",
			repoFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
				return &domain.User{ID: id, Username: "testuser"}, nil
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService(
				&mockUserRepository{getByIDFunc: tt.repoFunc},
				&mockAuditRepository{},
				&mockPlatformRoleRepository{},
				&mockTokenValidator{},
				&mockAuthentikManager{},
				"",
			)

			user, err := svc.Get(context.Background(), tt.userID)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
				if tt.errorIs != nil && !errors.Is(err, tt.errorIs) {
					t.Errorf("expected error %v, got %v", tt.errorIs, err)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if user == nil {
					t.Error("expected user, got nil")
				}
			}
		})
	}
}

func TestGetByHandle(t *testing.T) {
	tests := []struct {
		name        string
		handle      string
		repoFunc    func(ctx context.Context, username string) (*domain.User, error)
		expectError bool
		errorIs     error
	}{
		{
			name:   "user not found",
			handle: "testuser",
			repoFunc: func(ctx context.Context, username string) (*domain.User, error) {
				return nil, nil
			},
			expectError: true,
			errorIs:     ErrUserNotFound,
		},
		{
			name:   "repository error",
			handle: "testuser",
			repoFunc: func(ctx context.Context, username string) (*domain.User, error) {
				return nil, errors.New("db error")
			},
			expectError: true,
		},
		{
			name:   "success",
			handle: "testuser",
			repoFunc: func(ctx context.Context, username string) (*domain.User, error) {
				return &domain.User{Username: username, AuthentikID: "auth123"}, nil
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService(
				&mockUserRepository{getByUsernameFunc: tt.repoFunc},
				&mockAuditRepository{},
				&mockPlatformRoleRepository{},
				&mockTokenValidator{},
				&mockAuthentikManager{},
				"",
			)

			user, err := svc.GetByHandle(context.Background(), tt.handle)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
				if tt.errorIs != nil && !errors.Is(err, tt.errorIs) {
					t.Errorf("expected error %v, got %v", tt.errorIs, err)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if user == nil {
					t.Error("expected user, got nil")
				}
			}
		})
	}
}

func TestUpdateProfile(t *testing.T) {
	username := "newusername"
	displayName := "New Name"
	invalidUsername := "INVALID!"
	longName := string(make([]byte, 300))

	tests := []struct {
		name           string
		userID         domain.ID
		update         *domain.ProfileUpdate
		existingUser   *domain.User
		usernameExists bool
		authentikError error
		updateError    error
		expectError    bool
		errorIs        error
	}{
		{
			name:         "user not found",
			userID:       "user123",
			update:       &domain.ProfileUpdate{},
			existingUser: nil,
			expectError:  true,
			errorIs:      ErrUserNotFound,
		},
		{
			name:   "invalid username format",
			userID: "user123",
			update: &domain.ProfileUpdate{
				Username: &invalidUsername,
			},
			existingUser: &domain.User{ID: "user123", Username: "olduser"},
			expectError:  true,
			errorIs:      ErrInvalidUsername,
		},
		{
			name:   "username taken",
			userID: "user123",
			update: &domain.ProfileUpdate{
				Username: &username,
			},
			existingUser:   &domain.User{ID: "user123", Username: "olduser"},
			usernameExists: true,
			expectError:    true,
			errorIs:        ErrUsernameTaken,
		},
		{
			name:   "display name too long",
			userID: "user123",
			update: &domain.ProfileUpdate{
				DisplayName: &longName,
			},
			existingUser: &domain.User{ID: "user123", Username: "user"},
			expectError:  true,
			errorIs:      ErrInvalidUpdate,
		},
		{
			name:   "display name empty",
			userID: "user123",
			update: &domain.ProfileUpdate{
				DisplayName: func() *string { s := ""; return &s }(),
			},
			existingUser: &domain.User{ID: "user123", Username: "user"},
			expectError:  true,
			errorIs:      ErrInvalidUpdate,
		},
		{
			name:   "username change without authentik manager",
			userID: "user123",
			update: &domain.ProfileUpdate{
				Username: &username,
			},
			existingUser: &domain.User{ID: "user123", Username: "olduser", AuthentikID: "auth123"},
			expectError:  true,
		},
		{
			name:   "username change missing authentik id",
			userID: "user123",
			update: &domain.ProfileUpdate{
				Username: &username,
			},
			existingUser: &domain.User{ID: "user123", Username: "olduser", AuthentikID: ""},
			expectError:  true,
		},
		{
			name:   "authentik sync fails",
			userID: "user123",
			update: &domain.ProfileUpdate{
				Username: &username,
			},
			existingUser:   &domain.User{ID: "user123", Username: "olduser", AuthentikID: "auth123"},
			authentikError: errors.New("sync failed"),
			expectError:    true,
		},
		{
			name:   "database update fails after authentik",
			userID: "user123",
			update: &domain.ProfileUpdate{
				Username: &username,
			},
			existingUser: &domain.User{ID: "user123", Username: "olduser", AuthentikID: "auth123"},
			updateError:  errors.New("db failed"),
			expectError:  true,
		},
		{
			name:   "success username change",
			userID: "user123",
			update: &domain.ProfileUpdate{
				Username: &username,
			},
			existingUser: &domain.User{ID: "user123", Username: "olduser", AuthentikID: "auth123"},
			expectError:  false,
		},
		{
			name:   "success display name change",
			userID: "user123",
			update: &domain.ProfileUpdate{
				DisplayName: &displayName,
			},
			existingUser: &domain.User{ID: "user123", Username: "user", DisplayName: "Old Name"},
			expectError:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockUserRepository{
				getByIDFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
					if tt.existingUser == nil {
						return nil, nil
					}
					return tt.existingUser, nil
				},
				usernameExistsFunc: func(ctx context.Context, username string, excludeID domain.ID) (bool, error) {
					return tt.usernameExists, nil
				},
				updateProfileFunc: func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) error {
					return tt.updateError
				},
			}

			var authentikMgr port.AuthentikUserManager
			if tt.name != "username change without authentik manager" {
				authentikMgr = &mockAuthentikManager{
					updateUsernameFunc: func(ctx context.Context, userID string, username string) error {
						return tt.authentikError
					},
				}
			}

			svc := NewService(repo, &mockAuditRepository{}, &mockPlatformRoleRepository{}, &mockTokenValidator{}, authentikMgr, "")

			_, err := svc.UpdateProfile(context.Background(), tt.userID, tt.update)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
				if tt.errorIs != nil && !errors.Is(err, tt.errorIs) {
					t.Errorf("expected error %v, got %v", tt.errorIs, err)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestResolveMany(t *testing.T) {
	repo := &mockUserRepository{
		getByIDFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
			if id == "user1" {
				return &domain.User{ID: id, Username: "user1"}, nil
			}
			if id == "user2" {
				return &domain.User{ID: id, Username: "user2"}, nil
			}
			return nil, errors.New("not found")
		},
	}

	svc := NewService(repo, &mockAuditRepository{}, &mockPlatformRoleRepository{}, &mockTokenValidator{}, &mockAuthentikManager{}, "")

	result, err := svc.ResolveMany(context.Background(), []domain.ID{"user1", "user2", "user3"})

	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if len(result) != 2 {
		t.Errorf("expected 2 users, got %d", len(result))
	}

	if result["user1"] == nil || result["user2"] == nil {
		t.Error("expected both user1 and user2 to be in results")
	}

	if result["user3"] != nil {
		t.Error("expected user3 to not be in results")
	}
}

func TestGetAuditLogs(t *testing.T) {
	tests := []struct {
		name        string
		hasAudit    bool
		repoFunc    func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error)
		expectError bool
	}{
		{
			name:        "no audit repository",
			hasAudit:    false,
			expectError: false,
		},
		{
			name:     "success",
			hasAudit: true,
			repoFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
				return []*domain.AuditLog{}, nil
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var auditRepo port.AuditRepository
			if tt.hasAudit {
				auditRepo = &mockAuditRepository{getUserAuditLogsFunc: tt.repoFunc}
			}

			svc := NewService(&mockUserRepository{}, auditRepo, &mockPlatformRoleRepository{}, &mockTokenValidator{}, &mockAuthentikManager{}, "")

			logs, err := svc.GetAuditLogs(context.Background(), "user123", 10, 0)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if !tt.hasAudit && logs != nil {
					t.Error("expected nil logs when no audit repo")
				}
			}
		})
	}
}

func TestGetMyAuditLogs(t *testing.T) {
	tests := []struct {
		name        string
		logsFunc    func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error)
		countFunc   func(ctx context.Context, userID string) (int64, error)
		expectError bool
	}{
		{
			name: "logs error",
			logsFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
				return nil, errors.New("db error")
			},
			expectError: true,
		},
		{
			name: "count error",
			logsFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
				return []*domain.AuditLog{}, nil
			},
			countFunc: func(ctx context.Context, userID string) (int64, error) {
				return 0, errors.New("count error")
			},
			expectError: true,
		},
		{
			name: "success",
			logsFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
				return []*domain.AuditLog{}, nil
			},
			countFunc: func(ctx context.Context, userID string) (int64, error) {
				return 100, nil
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			auditRepo := &mockAuditRepository{
				getUserAuditLogsFunc: tt.logsFunc,
				countByUserFunc:      tt.countFunc,
			}

			svc := NewService(&mockUserRepository{}, auditRepo, &mockPlatformRoleRepository{}, &mockTokenValidator{}, &mockAuthentikManager{}, "")

			logs, total, err := svc.GetMyAuditLogs(context.Background(), "user123", 10, 0)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if logs == nil {
					t.Error("expected logs, got nil")
				}
				if total != 100 {
					t.Errorf("expected total 100, got %d", total)
				}
			}
		})
	}
}

func TestGenerateUniqueUsername(t *testing.T) {
	tests := []struct {
		name           string
		claims         *port.TokenClaims
		usernameExists bool
		expectedPrefix string
	}{
		{
			name: "from preferred username",
			claims: &port.TokenClaims{
				PreferredUsername: "validuser123",
			},
			usernameExists: false,
			expectedPrefix: "validuser123",
		},
		{
			name: "from email",
			claims: &port.TokenClaims{
				Email: "testuser@example.com",
			},
			usernameExists: false,
			expectedPrefix: "testuser",
		},
		{
			name: "generates random",
			claims: &port.TokenClaims{
				PreferredUsername: "taken",
				Email:             "taken@example.com",
			},
			usernameExists: true,
			expectedPrefix: "user_",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockUserRepository{
				usernameExistsFunc: func(ctx context.Context, username string, excludeID domain.ID) (bool, error) {
					if username == "validuser123" || username == "testuser" {
						return tt.usernameExists, nil
					}
					return false, nil
				},
			}

			svc := NewService(repo, &mockAuditRepository{}, &mockPlatformRoleRepository{}, &mockTokenValidator{}, &mockAuthentikManager{}, "")
			username := svc.generateUniqueUsername(context.Background(), tt.claims)

			if username == "" {
				t.Error("expected username, got empty string")
			}

			if tt.expectedPrefix != "" && len(username) > len(tt.expectedPrefix) {
				if username[:len(tt.expectedPrefix)] != tt.expectedPrefix {
					t.Errorf("expected username to start with %s, got %s", tt.expectedPrefix, username)
				}
			}
		})
	}
}

func TestGenerateDisplayName(t *testing.T) {
	tests := []struct {
		name     string
		claims   *port.TokenClaims
		expected string
	}{
		{
			name: "from preferred username",
			claims: &port.TokenClaims{
				PreferredUsername: "testuser",
			},
			expected: "testuser",
		},
		{
			name: "from email",
			claims: &port.TokenClaims{
				Email: "test@example.com",
			},
			expected: "test",
		},
		{
			name:     "default",
			claims:   &port.TokenClaims{},
			expected: "User",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService(&mockUserRepository{}, &mockAuditRepository{}, &mockPlatformRoleRepository{}, &mockTokenValidator{}, &mockAuthentikManager{}, "")
			result := svc.generateDisplayName(tt.claims)

			if result != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestNormalizeUsername(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			input:    "ValidUser",
			expected: "validuser",
		},
		{
			input:    "user-name_123",
			expected: "user-name_123",
		},
		{
			input:    "user@domain",
			expected: "userdomain",
		},
		{
			input:    "a",
			expected: "",
		},
		{
			input:    string(make([]byte, 100)),
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := normalizeUsername(tt.input)
			if result != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestGenerateDisplayNameFallback(t *testing.T) {
	svc := NewService(
		&mockUserRepository{},
		nil,
		nil,
		nil,
		nil,
		"",
	)

	name := svc.generateDisplayName(&port.TokenClaims{})
	if name != "User" {
		t.Fatalf("expected fallback User, got %s", name)
	}
}

func TestEnsureUserFromToken_BackfillAuthentik_SaveErrorIsNonFatal(t *testing.T) {
	repo := &mockUserRepository{
		getByIDFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
			return &domain.User{
				ID:          id,
				Email:       "test@example.com",
				Username:    "testuser",
				AuthentikID: "",
			}, nil
		},
		saveFunc: func(ctx context.Context, user *domain.User) error {
			return errors.New("save failed")
		},
	}

	authentikMgr := &mockAuthentikManager{
		resolveUserIDFunc: func(ctx context.Context, email string) (string, error) {
			return "auth123", nil
		},
	}

	svc := NewService(repo, &mockAuditRepository{}, &mockPlatformRoleRepository{}, &mockTokenValidator{}, authentikMgr, "")

	u, err := svc.EnsureUserFromToken(context.Background(), &port.TokenClaims{
		Sub:   "user123",
		Email: "test@example.com",
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if u == nil {
		t.Fatalf("expected user, got nil")
	}
}

func TestEnsureUserFromToken_UpdateExisting_SaveFails(t *testing.T) {
	repo := &mockUserRepository{
		getByIDFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
			return &domain.User{
				ID:            id,
				Email:         "old@example.com",
				EmailVerified: false,
				LoginUsername: "oldlogin",
				Username:      "testuser",
			}, nil
		},
		saveFunc: func(ctx context.Context, user *domain.User) error {
			return errors.New("save failed")
		},
	}

	svc := NewService(repo, &mockAuditRepository{}, &mockPlatformRoleRepository{}, &mockTokenValidator{}, &mockAuthentikManager{}, "")

	_, err := svc.EnsureUserFromToken(context.Background(), &port.TokenClaims{
		Sub:               "user123",
		Email:             "new@example.com",
		EmailVerified:     true,
		PreferredUsername: "newlogin",
	})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
}

func TestUsernameExists_WhenRepoErrors_TreatAsExists(t *testing.T) {
	repo := &mockUserRepository{
		usernameExistsFunc: func(ctx context.Context, username string, excludeID domain.ID) (bool, error) {
			return false, errors.New("db down")
		},
	}
	svc := NewService(repo, &mockAuditRepository{}, &mockPlatformRoleRepository{}, &mockTokenValidator{}, &mockAuthentikManager{}, "")

	if got := svc.usernameExists(context.Background(), "whatever"); got != true {
		t.Fatalf("expected true when repo errors, got %v", got)
	}
}

func TestDetectAndLogChanges_RecordsAndHandlesRecordError(t *testing.T) {
	var called int
	auditRepo := &mockAuditRepository{
		recordFunc: func(ctx context.Context, log *domain.AuditLog) error {
			called++
			return errors.New("write failed")
		},
	}

	oldAvatar := "old.png"
	newAvatar := "new.png"
	oldBio := "old bio"
	newBio := "new bio"

	oldUser := &domain.User{
		ID:          "user123",
		Username:    "oldname",
		DisplayName: "Old",
		Email:       "old@example.com",
		AvatarURL:   &oldAvatar,
		Bio:         &oldBio,
	}
	newUser := &domain.User{
		ID:          "user123",
		Username:    "newname",
		DisplayName: "New",
		Email:       "new@example.com",
		AvatarURL:   &newAvatar,
		Bio:         &newBio,
	}

	svc := NewService(&mockUserRepository{}, auditRepo, &mockPlatformRoleRepository{}, &mockTokenValidator{}, &mockAuthentikManager{}, "")
	svc.detectAndLogChanges(context.Background(), oldUser, newUser)

	if called != 1 {
		t.Fatalf("expected Record called once, got %d", called)
	}
}

func TestLogAction_NoAuditRepo_NoPanic(t *testing.T) {
	svc := NewService(&mockUserRepository{}, nil, &mockPlatformRoleRepository{}, &mockTokenValidator{}, &mockAuthentikManager{}, "")
	svc.logAction(context.Background(), "user123", "anything", map[string]domain.ChangeDetail{
		"x": {Old: "a", New: "b"},
	})
}

func TestGetMyPlatformRoles(t *testing.T) {
	tests := []struct {
		name            string
		hasPlatformRepo bool
		repoFunc        func(ctx context.Context, userID string) ([]domain.PlatformRole, error)
		expectedRoles   []domain.PlatformRole
		expectError     bool
	}{
		{
			name:            "no platform role repository",
			hasPlatformRepo: false,
			expectedRoles:   []domain.PlatformRole{},
			expectError:     false,
		},
		{
			name:            "user has admin role",
			hasPlatformRepo: true,
			repoFunc: func(ctx context.Context, userID string) ([]domain.PlatformRole, error) {
				return []domain.PlatformRole{domain.PlatformAdmin}, nil
			},
			expectedRoles: []domain.PlatformRole{domain.PlatformAdmin},
			expectError:   false,
		},
		{
			name:            "user has multiple roles",
			hasPlatformRepo: true,
			repoFunc: func(ctx context.Context, userID string) ([]domain.PlatformRole, error) {
				return []domain.PlatformRole{domain.PlatformAdmin, domain.PlatformSupport}, nil
			},
			expectedRoles: []domain.PlatformRole{domain.PlatformAdmin, domain.PlatformSupport},
			expectError:   false,
		},
		{
			name:            "user has no roles",
			hasPlatformRepo: true,
			repoFunc: func(ctx context.Context, userID string) ([]domain.PlatformRole, error) {
				return []domain.PlatformRole{}, nil
			},
			expectedRoles: []domain.PlatformRole{},
			expectError:   false,
		},
		{
			name:            "repository error",
			hasPlatformRepo: true,
			repoFunc: func(ctx context.Context, userID string) ([]domain.PlatformRole, error) {
				return nil, errors.New("database error")
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var platformRepo port.PlatformRoleRepository
			if tt.hasPlatformRepo {
				platformRepo = &mockPlatformRoleRepository{
					getActiveRolesByUserIDFunc: tt.repoFunc,
				}
			}

			svc := NewService(&mockUserRepository{}, &mockAuditRepository{}, platformRepo, &mockTokenValidator{}, &mockAuthentikManager{}, "")

			roles, err := svc.GetMyPlatformRoles(context.Background(), "user123")

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if len(roles) != len(tt.expectedRoles) {
					t.Errorf("expected %d roles, got %d", len(tt.expectedRoles), len(roles))
				}
				for i, role := range tt.expectedRoles {
					if i >= len(roles) || roles[i] != role {
						t.Errorf("expected role %s at index %d, got %s", role, i, roles[i])
					}
				}
			}
		})
	}
}

func TestEnsureUserFromToken_AutoGrantAdmin(t *testing.T) {
	defaultAdminEmail := "admin@example.com"

	tests := []struct {
		name              string
		claims            *port.TokenClaims
		existingUser      *domain.User
		hasRole           bool
		hasRoleError      error
		grantRoleError    error
		expectGrantCalled bool
	}{
		{
			name: "auto-grant admin to default admin email",
			claims: &port.TokenClaims{
				Sub:   "user123",
				Email: defaultAdminEmail,
			},
			existingUser: &domain.User{
				ID:       "user123",
				Email:    defaultAdminEmail,
				Username: "admin",
			},
			hasRole:           false,
			expectGrantCalled: true,
		},
		{
			name: "admin email already has admin role",
			claims: &port.TokenClaims{
				Sub:   "user123",
				Email: defaultAdminEmail,
			},
			existingUser: &domain.User{
				ID:       "user123",
				Email:    defaultAdminEmail,
				Username: "admin",
			},
			hasRole:           true,
			expectGrantCalled: false,
		},
		{
			name: "non-admin email not granted",
			claims: &port.TokenClaims{
				Sub:   "user456",
				Email: "user@example.com",
			},
			existingUser: &domain.User{
				ID:       "user456",
				Email:    "user@example.com",
				Username: "regular-user",
			},
			hasRole:           false,
			expectGrantCalled: false,
		},
		{
			name: "case insensitive email match",
			claims: &port.TokenClaims{
				Sub:   "user123",
				Email: "ADMIN@EXAMPLE.COM",
			},
			existingUser: &domain.User{
				ID:       "user123",
				Email:    "ADMIN@EXAMPLE.COM",
				Username: "admin",
			},
			hasRole:           false,
			expectGrantCalled: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			grantCalled := false

			repo := &mockUserRepository{
				getByIDFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
					return tt.existingUser, nil
				},
				saveFunc: func(ctx context.Context, user *domain.User) error {
					return nil
				},
			}

			platformRepo := &mockPlatformRoleRepository{
				hasRoleFunc: func(ctx context.Context, userID string, role domain.PlatformRole) (bool, error) {
					return tt.hasRole, tt.hasRoleError
				},
				grantRoleFunc: func(ctx context.Context, userID string, role domain.PlatformRole, grantedBy *string) error {
					grantCalled = true
					return tt.grantRoleError
				},
			}

			svc := NewService(repo, &mockAuditRepository{}, platformRepo, &mockTokenValidator{}, &mockAuthentikManager{}, defaultAdminEmail)

			user, err := svc.EnsureUserFromToken(context.Background(), tt.claims)

			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if user == nil {
				t.Fatal("expected user, got nil")
			}

			if grantCalled != tt.expectGrantCalled {
				t.Errorf("expected grantCalled=%v, got %v", tt.expectGrantCalled, grantCalled)
			}
		})
	}
}
