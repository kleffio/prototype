package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	coresvc "github.com/kleffio/www/user-service/internal/core/service/users"
)

// Mock UserService
type mockUserService struct {
	getMeFunc          func(ctx context.Context, token string) (*domain.User, error)
	updateProfileFunc  func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error)
	getByHandleFunc    func(ctx context.Context, handle string) (*domain.User, error)
	getFunc            func(ctx context.Context, id domain.ID) (*domain.User, error)
	resolveManyFunc    func(ctx context.Context, ids []domain.ID) (map[domain.ID]*domain.User, error)
	getAuditLogsFunc   func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error)
	getMyAuditLogsFunc func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, int64, error)
	deactivateFunc     func(ctx context.Context, userID domain.ID) error
}

func (m *mockUserService) GetMe(ctx context.Context, token string) (*domain.User, error) {
	if m.getMeFunc != nil {
		return m.getMeFunc(ctx, token)
	}
	return nil, nil
}

func (m *mockUserService) UpdateProfile(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error) {
	if m.updateProfileFunc != nil {
		return m.updateProfileFunc(ctx, id, update)
	}
	return nil, nil
}

func (m *mockUserService) GetByHandle(ctx context.Context, handle string) (*domain.User, error) {
	if m.getByHandleFunc != nil {
		return m.getByHandleFunc(ctx, handle)
	}
	return nil, nil
}

func (m *mockUserService) Get(ctx context.Context, id domain.ID) (*domain.User, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, id)
	}
	return nil, nil
}

func (m *mockUserService) ResolveMany(ctx context.Context, ids []domain.ID) (map[domain.ID]*domain.User, error) {
	if m.resolveManyFunc != nil {
		return m.resolveManyFunc(ctx, ids)
	}
	return nil, nil
}

func (m *mockUserService) GetAuditLogs(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
	if m.getAuditLogsFunc != nil {
		return m.getAuditLogsFunc(ctx, userID, limit, offset)
	}
	return nil, nil
}

func (m *mockUserService) GetMyAuditLogs(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, int64, error) {
	if m.getMyAuditLogsFunc != nil {
		return m.getMyAuditLogsFunc(ctx, userID, limit, offset)
	}
	return nil, 0, nil
}

func (m *mockUserService) DeactivateAccount(ctx context.Context, userID domain.ID) error {
	if m.deactivateFunc != nil {
		return m.deactivateFunc(ctx, userID)
	}
	return nil
}

func TestHealth(t *testing.T) {
	h := NewHandler(&mockUserService{})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	if w.Body.String() != "ok" {
		t.Errorf("expected body 'ok', got %s", w.Body.String())
	}
}

func TestGetMe(t *testing.T) {
	tests := []struct {
		name           string
		authHeader     string
		mockFunc       func(ctx context.Context, token string) (*domain.User, error)
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing authorization header",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "missing or invalid authorization header",
		},
		{
			name:           "invalid token format",
			authHeader:     "InvalidToken",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "missing or invalid authorization header",
		},
		{
			name:       "invalid token",
			authHeader: "Bearer invalid_token",
			mockFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return nil, coresvc.ErrInvalidToken
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "invalid or expired token",
		},
		{
			name:       "user not found",
			authHeader: "Bearer valid_token",
			mockFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return nil, coresvc.ErrUserNotFound
			},
			expectedStatus: http.StatusNotFound,
			expectedError:  "user not found",
		},
		{
			name:       "internal error",
			authHeader: "Bearer valid_token",
			mockFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return nil, errors.New("database error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "internal server error",
		},
		{
			name:       "success",
			authHeader: "Bearer valid_token",
			mockFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{
					ID:       "user123",
					Username: "testuser",
					Email:    "test@example.com",
				}, nil
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(&mockUserService{getMeFunc: tt.mockFunc})
			req := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			w := httptest.NewRecorder()

			h.GetMe(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				var errResp errorResponse
				if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("expected error %s, got %s", tt.expectedError, errResp.Error)
				}
			}
		})
	}
}

func TestPatchMeProfile(t *testing.T) {
	username := "newusername"
	displayName := "New Name"

	tests := []struct {
		name           string
		authHeader     string
		body           interface{}
		getMeFunc      func(ctx context.Context, token string) (*domain.User, error)
		updateFunc     func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error)
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing authorization",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "missing or invalid authorization header",
		},
		{
			name:       "invalid token",
			authHeader: "Bearer invalid",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return nil, coresvc.ErrInvalidToken
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "invalid or expired token",
		},
		{
			name:       "token validation error",
			authHeader: "Bearer invalid",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return nil, errors.New("validation error")
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "invalid token",
		},
		{
			name:           "invalid request body",
			authHeader:     "Bearer valid",
			body:           "invalid json",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid request body",
		},
		{
			name:       "invalid username format",
			authHeader: "Bearer valid",
			body: domain.ProfileUpdate{
				Username: &username,
			},
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123"}, nil
			},
			updateFunc: func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error) {
				return nil, coresvc.ErrInvalidUsername
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid username format (use lowercase letters, numbers, hyphens, underscores only)",
		},
		{
			name:       "username taken",
			authHeader: "Bearer valid",
			body: domain.ProfileUpdate{
				Username: &username,
			},
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123"}, nil
			},
			updateFunc: func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error) {
				return nil, coresvc.ErrUsernameTaken
			},
			expectedStatus: http.StatusConflict,
			expectedError:  "username already taken",
		},
		{
			name:       "invalid update",
			authHeader: "Bearer valid",
			body: domain.ProfileUpdate{
				DisplayName: &displayName,
			},
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123"}, nil
			},
			updateFunc: func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error) {
				return nil, coresvc.ErrInvalidUpdate
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid profile data",
		},
		{
			name:       "authentik sync error",
			authHeader: "Bearer valid",
			body: domain.ProfileUpdate{
				Username: &username,
			},
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123"}, nil
			},
			updateFunc: func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error) {
				return nil, errors.New("failed to sync username to Authentik: connection refused")
			},
			expectedStatus: http.StatusServiceUnavailable,
			expectedError:  "failed to sync username with authentication provider - please try again later",
		},
		{
			name:       "authentik not configured",
			authHeader: "Bearer valid",
			body: domain.ProfileUpdate{
				Username: &username,
			},
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123"}, nil
			},
			updateFunc: func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error) {
				return nil, errors.New("authentik manager not configured")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "username updates are temporarily unavailable",
		},
		{
			name:       "internal error",
			authHeader: "Bearer valid",
			body: domain.ProfileUpdate{
				Username: &username,
			},
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123"}, nil
			},
			updateFunc: func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error) {
				return nil, errors.New("database error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "internal server error",
		},
		{
			name:       "success",
			authHeader: "Bearer valid",
			body: domain.ProfileUpdate{
				Username: &username,
			},
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123"}, nil
			},
			updateFunc: func(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) (*domain.User, error) {
				return &domain.User{
					ID:       id,
					Username: username,
				}, nil
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(&mockUserService{
				getMeFunc:         tt.getMeFunc,
				updateProfileFunc: tt.updateFunc,
			})

			var body []byte
			if tt.body != nil {
				if str, ok := tt.body.(string); ok {
					body = []byte(str)
				} else {
					body, _ = json.Marshal(tt.body)
				}
			}

			req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/me/profile", bytes.NewReader(body))
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			w := httptest.NewRecorder()

			h.PatchMeProfile(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				var errResp errorResponse
				if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("expected error %s, got %s", tt.expectedError, errResp.Error)
				}
			}
		})
	}
}

func TestGetPublicProfile(t *testing.T) {
	tests := []struct {
		name           string
		handle         string
		mockFunc       func(ctx context.Context, handle string) (*domain.User, error)
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing handle",
			handle:         "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "missing handle",
		},
		{
			name:   "profile not found",
			handle: "nonexistent",
			mockFunc: func(ctx context.Context, handle string) (*domain.User, error) {
				return nil, coresvc.ErrUserNotFound
			},
			expectedStatus: http.StatusNotFound,
			expectedError:  "profile not found",
		},
		{
			name:   "internal error",
			handle: "testuser",
			mockFunc: func(ctx context.Context, handle string) (*domain.User, error) {
				return nil, errors.New("database error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "internal server error",
		},
		{
			name:   "success",
			handle: "testuser",
			mockFunc: func(ctx context.Context, handle string) (*domain.User, error) {
				return &domain.User{
					ID:       "user123",
					Username: handle,
				}, nil
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "success with @ prefix",
			handle: "@testuser",
			mockFunc: func(ctx context.Context, handle string) (*domain.User, error) {
				if handle == "testuser" {
					return &domain.User{
						ID:       "user123",
						Username: handle,
					}, nil
				}
				return nil, coresvc.ErrUserNotFound
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(&mockUserService{getByHandleFunc: tt.mockFunc})

			req := httptest.NewRequest(http.MethodGet, "/api/v1/users/profile/"+tt.handle, nil)
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("handle", tt.handle)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			w := httptest.NewRecorder()
			h.GetPublicProfile(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				var errResp errorResponse
				if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("expected error %s, got %s", tt.expectedError, errResp.Error)
				}
			}
		})
	}
}

func TestGetUser(t *testing.T) {
	tests := []struct {
		name           string
		userID         string
		mockFunc       func(ctx context.Context, id domain.ID) (*domain.User, error)
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing user id",
			userID:         "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "missing user id",
		},
		{
			name:   "user not found",
			userID: "user123",
			mockFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
				return nil, coresvc.ErrUserNotFound
			},
			expectedStatus: http.StatusNotFound,
			expectedError:  "user not found",
		},
		{
			name:   "internal error",
			userID: "user123",
			mockFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
				return nil, errors.New("database error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "internal server error",
		},
		{
			name:   "success",
			userID: "user123",
			mockFunc: func(ctx context.Context, id domain.ID) (*domain.User, error) {
				return &domain.User{
					ID:       id,
					Username: "testuser",
				}, nil
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(&mockUserService{getFunc: tt.mockFunc})

			req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+tt.userID, nil)
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", tt.userID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			w := httptest.NewRecorder()
			h.GetUser(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				var errResp errorResponse
				if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("expected error %s, got %s", tt.expectedError, errResp.Error)
				}
			}
		})
	}
}

func TestResolveMany(t *testing.T) {
	tests := []struct {
		name           string
		body           interface{}
		mockFunc       func(ctx context.Context, ids []domain.ID) (map[domain.ID]*domain.User, error)
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "invalid request body",
			body:           "invalid json",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid request body",
		},
		{
			name: "empty ids",
			body: resolveRequest{
				IDs: []string{},
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "too many ids",
			body: resolveRequest{
				IDs: make([]string, 101),
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "too many ids (max 100)",
		},
		{
			name: "internal error",
			body: resolveRequest{
				IDs: []string{"user1", "user2"},
			},
			mockFunc: func(ctx context.Context, ids []domain.ID) (map[domain.ID]*domain.User, error) {
				return nil, errors.New("database error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "internal server error",
		},
		{
			name: "success",
			body: resolveRequest{
				IDs: []string{"user1", "user2"},
			},
			mockFunc: func(ctx context.Context, ids []domain.ID) (map[domain.ID]*domain.User, error) {
				result := make(map[domain.ID]*domain.User)
				for _, id := range ids {
					result[id] = &domain.User{ID: id, Username: string(id)}
				}
				return result, nil
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(&mockUserService{resolveManyFunc: tt.mockFunc})

			var body []byte
			if tt.body != nil {
				if str, ok := tt.body.(string); ok {
					body = []byte(str)
				} else {
					body, _ = json.Marshal(tt.body)
				}
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v1/users/resolve", bytes.NewReader(body))
			w := httptest.NewRecorder()

			h.ResolveMany(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				var errResp errorResponse
				if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("expected error %s, got %s", tt.expectedError, errResp.Error)
				}
			}
		})
	}
}

func TestGetAuditLogs(t *testing.T) {
	tests := []struct {
		name           string
		userID         string
		query          string
		mockFunc       func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error)
		expectedStatus int
		expectedError  string
		expectedLimit  int
	}{
		{
			name:           "missing user id",
			userID:         "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "missing user id",
		},
		{
			name:   "internal error",
			userID: "user123",
			mockFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
				return nil, errors.New("database error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "internal server error",
		},
		{
			name:   "success with default limit",
			userID: "user123",
			mockFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
				return []*domain.AuditLog{}, nil
			},
			expectedStatus: http.StatusOK,
			expectedLimit:  20,
		},
		{
			name:   "success with custom limit",
			userID: "user123",
			query:  "?limit=50&offset=10",
			mockFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
				if limit != 50 || offset != 10 {
					return nil, errors.New("unexpected limit or offset")
				}
				return []*domain.AuditLog{}, nil
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "limit too high defaults to 20",
			userID: "user123",
			query:  "?limit=200",
			mockFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
				if limit != 20 {
					return nil, errors.New("limit should default to 20")
				}
				return []*domain.AuditLog{}, nil
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(&mockUserService{getAuditLogsFunc: tt.mockFunc})

			req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+tt.userID+"/audit"+tt.query, nil)
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", tt.userID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			w := httptest.NewRecorder()
			h.GetAuditLogs(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				var errResp errorResponse
				if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("expected error %s, got %s", tt.expectedError, errResp.Error)
				}
			}
		})
	}
}

func TestGetMyAuditLogs(t *testing.T) {
	tests := []struct {
		name           string
		authHeader     string
		query          string
		getMeFunc      func(ctx context.Context, token string) (*domain.User, error)
		mockFunc       func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, int64, error)
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing authorization",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "missing or invalid authorization header",
		},
		{
			name:       "invalid token",
			authHeader: "Bearer invalid",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return nil, coresvc.ErrInvalidToken
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "invalid or expired token",
		},
		{
			name:       "token validation error",
			authHeader: "Bearer invalid",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return nil, errors.New("validation error")
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "invalid token",
		},
		{
			name:       "internal error",
			authHeader: "Bearer valid",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123"}, nil
			},
			mockFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, int64, error) {
				return nil, 0, errors.New("database error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "internal server error",
		},
		{
			name:       "success",
			authHeader: "Bearer valid",
			query:      "?limit=30&offset=5",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123"}, nil
			},
			mockFunc: func(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, int64, error) {
				return []*domain.AuditLog{}, 100, nil
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(&mockUserService{
				getMeFunc:          tt.getMeFunc,
				getMyAuditLogsFunc: tt.mockFunc,
			})

			req := httptest.NewRequest(http.MethodGet, "/api/v1/users/me/audit"+tt.query, nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			w := httptest.NewRecorder()

			h.GetMyAuditLogs(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				var errResp errorResponse
				if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("expected error %s, got %s", tt.expectedError, errResp.Error)
				}
			}
		})
	}
}

func TestExtractBearerToken(t *testing.T) {
	tests := []struct {
		name     string
		header   string
		expected string
	}{
		{
			name:     "empty header",
			header:   "",
			expected: "",
		},
		{
			name:     "invalid format",
			header:   "InvalidToken",
			expected: "",
		},
		{
			name:     "not bearer",
			header:   "Basic token123",
			expected: "",
		},
		{
			name:     "valid bearer token",
			header:   "Bearer token123",
			expected: "token123",
		},
		{
			name:     "bearer lowercase",
			header:   "bearer token123",
			expected: "token123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if tt.header != "" {
				req.Header.Set("Authorization", tt.header)
			}

			result := extractBearerToken(req)
			if result != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestDeactivateAccount(t *testing.T) {
	tests := []struct {
		name           string
		authHeader     string
		getMeFunc      func(ctx context.Context, token string) (*domain.User, error)
		deactivateFunc func(ctx context.Context, userID domain.ID) error
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing auth header",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "missing or invalid authorization header",
		},
		{
			name:       "invalid token",
			authHeader: "Bearer invalid-token",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return nil, coresvc.ErrInvalidToken
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "invalid or expired token",
		},
		{
			name:       "user not found during deactivation",
			authHeader: "Bearer valid-token",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123", Username: "testuser"}, nil
			},
			deactivateFunc: func(ctx context.Context, userID domain.ID) error {
				return coresvc.ErrUserNotFound
			},
			expectedStatus: http.StatusNotFound,
			expectedError:  "user not found",
		},
		{
			name:       "user already deactivated",
			authHeader: "Bearer valid-token",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123", Username: "testuser"}, nil
			},
			deactivateFunc: func(ctx context.Context, userID domain.ID) error {
				return coresvc.ErrAccountDeactivated
			},
			expectedStatus: http.StatusConflict,
			expectedError:  "account is already deactivated",
		},
		{
			name:       "internal server error",
			authHeader: "Bearer valid-token",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123", Username: "testuser"}, nil
			},
			deactivateFunc: func(ctx context.Context, userID domain.ID) error {
				return errors.New("database error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "internal server error",
		},
		{
			name:       "successful deactivation",
			authHeader: "Bearer valid-token",
			getMeFunc: func(ctx context.Context, token string) (*domain.User, error) {
				return &domain.User{ID: "user123", Username: "testuser"}, nil
			},
			deactivateFunc: func(ctx context.Context, userID domain.ID) error {
				return nil
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(&mockUserService{
				getMeFunc:      tt.getMeFunc,
				deactivateFunc: tt.deactivateFunc,
			})

			req := httptest.NewRequest(http.MethodDelete, "/api/v1/users/me/deactivate", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}

			w := httptest.NewRecorder()
			h.DeactivateAccount(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				var response errorResponse
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("failed to unmarshal error response: %v", err)
				}
				if response.Error != tt.expectedError {
					t.Errorf("expected error %s, got %s", tt.expectedError, response.Error)
				}
			} else {
				// Check for success response
				var response map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("failed to unmarshal success response: %v", err)
				}
				if message, ok := response["message"]; !ok || message != "Account successfully deactivated" {
					t.Errorf("expected success message, got %v", response)
				}
			}
		})
	}
}
