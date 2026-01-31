package http

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	coresvc "github.com/kleffio/www/user-service/internal/core/service/users"
)

type Handler struct {
	svc UserService
}

func NewHandler(svc UserService) *Handler {
	return &Handler{svc: svc}
}

type errorResponse struct {
	Error string `json:"error"`
}

type auditLogsResponse struct {
	Items []*domain.AuditLog `json:"items"`
	Total int64              `json:"total"`
}

// ------- Handlers ------- \\

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

// GetMe returns the authenticated user's full profile
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	token := extractBearerToken(r)
	if token == "" {
		jsonError(w, http.StatusUnauthorized, "missing or invalid authorization header")
		return
	}

	user, err := h.svc.GetMe(r.Context(), token)
	if err != nil {
		if errors.Is(err, coresvc.ErrInvalidToken) {
			jsonError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		if errors.Is(err, coresvc.ErrUserNotFound) {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}
		log.Printf("error getting current user: %v", err)
		jsonError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Return full profile (includes email, but not backend fields)
	jsonResponse(w, http.StatusOK, user)
}

// PatchMeProfile updates the authenticated user's profile
func (h *Handler) PatchMeProfile(w http.ResponseWriter, r *http.Request) {
	token := extractBearerToken(r)
	if token == "" {
		jsonError(w, http.StatusUnauthorized, "missing or invalid authorization header")
		return
	}

	// Get user ID from token
	user, err := h.svc.GetMe(r.Context(), token)
	if err != nil {
		if errors.Is(err, coresvc.ErrInvalidToken) {
			jsonError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		log.Printf("error validating token: %v", err)
		jsonError(w, http.StatusUnauthorized, "invalid token")
		return
	}

	// Parse update request
	var update domain.ProfileUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Update profile
	updated, err := h.svc.UpdateProfile(r.Context(), user.ID, &update)
	if err != nil {
		if errors.Is(err, coresvc.ErrInvalidUsername) {
			jsonError(w, http.StatusBadRequest,
				"invalid username format (use lowercase letters, numbers, hyphens, underscores only)")
			return
		}
		if errors.Is(err, coresvc.ErrUsernameTaken) {
			jsonError(w, http.StatusConflict, "username already taken")
			return
		}
		if errors.Is(err, coresvc.ErrInvalidUpdate) {
			jsonError(w, http.StatusBadRequest, "invalid profile data")
			return
		}

		if strings.Contains(err.Error(), "failed to sync username to Authentik") {
			log.Printf("Authentik sync error for user %s: %v", user.ID, err)
			jsonError(w, http.StatusServiceUnavailable,
				"failed to sync username with authentication provider - please try again later")
			return
		}

		if strings.Contains(err.Error(), "authentik manager not configured") {
			log.Printf("CRITICAL: Authentik manager not configured for user %s", user.ID)
			jsonError(w, http.StatusInternalServerError,
				"username updates are temporarily unavailable")
			return
		}

		log.Printf("error updating profile: %v", err)
		jsonError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	jsonResponse(w, http.StatusOK, updated)
}

// GetPublicProfile returns a public profile by handle
func (h *Handler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	handle := chi.URLParam(r, "handle")
	if handle == "" {
		jsonError(w, http.StatusBadRequest, "missing handle")
		return
	}

	// Strip @ prefix if present
	handle = strings.TrimPrefix(handle, "@")

	user, err := h.svc.GetByHandle(r.Context(), handle)
	if err != nil {
		if errors.Is(err, coresvc.ErrUserNotFound) {
			jsonError(w, http.StatusNotFound, "profile not found")
			return
		}
		log.Printf("error getting profile by handle %s: %v", handle, err)
		jsonError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Return only public fields
	jsonResponse(w, http.StatusOK, user.PublicProfile())
}

// GetUser fetches a user by ID (kept for backward compatibility)
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		jsonError(w, http.StatusBadRequest, "missing user id")
		return
	}

	user, err := h.svc.Get(r.Context(), domain.ID(id))
	if err != nil {
		if errors.Is(err, coresvc.ErrUserNotFound) {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}
		log.Printf("error getting user %s: %v", id, err)
		jsonError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Return only public-facing information
	jsonResponse(w, http.StatusOK, user.PublicProfile())
}

type resolveRequest struct {
	IDs []string `json:"ids"`
}

func (h *Handler) ResolveMany(w http.ResponseWriter, r *http.Request) {
	var req resolveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.IDs) == 0 {
		jsonResponse(w, http.StatusOK, map[string]any{})
		return
	}

	if len(req.IDs) > 100 {
		jsonError(w, http.StatusBadRequest, "too many ids (max 100)")
		return
	}

	ids := make([]domain.ID, len(req.IDs))
	for i, id := range req.IDs {
		ids[i] = domain.ID(id)
	}

	users, err := h.svc.ResolveMany(r.Context(), ids)
	if err != nil {
		log.Printf("error resolving users: %v", err)
		jsonError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	out := make(map[string]any, len(users))
	for id, u := range users {
		out[string(id)] = u.PublicProfile()
	}

	jsonResponse(w, http.StatusOK, out)
}

func (h *Handler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		jsonError(w, http.StatusBadRequest, "missing user id")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	logs, err := h.svc.GetAuditLogs(r.Context(), domain.ID(id), limit, offset)
	if err != nil {
		log.Printf("error getting audit logs for user %s: %v", id, err)
		jsonError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	if logs == nil {
		logs = []*domain.AuditLog{}
	}

	jsonResponse(w, http.StatusOK, logs)
}

func (h *Handler) GetMyAuditLogs(w http.ResponseWriter, r *http.Request) {
	token := extractBearerToken(r)
	if token == "" {
		jsonError(w, http.StatusUnauthorized, "missing or invalid authorization header")
		return
	}

	// Get current user from token
	user, err := h.svc.GetMe(r.Context(), token)
	if err != nil {
		if errors.Is(err, coresvc.ErrInvalidToken) {
			jsonError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		log.Printf("error validating token: %v", err)
		jsonError(w, http.StatusUnauthorized, "invalid token")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	logs, total, err := h.svc.GetMyAuditLogs(r.Context(), user.ID, limit, offset)
	if err != nil {
		log.Printf("error getting audit logs for user %s: %v", user.ID, err)
		jsonError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	if logs == nil {
		logs = []*domain.AuditLog{}
	}

	resp := auditLogsResponse{
		Items: logs,
		Total: total,
	}

	jsonResponse(w, http.StatusOK, resp)
}

// GetMyPlatformRoles returns the authenticated user's platform roles
func (h *Handler) GetMyPlatformRoles(w http.ResponseWriter, r *http.Request) {
	token := extractBearerToken(r)
	if token == "" {
		jsonError(w, http.StatusUnauthorized, "missing or invalid authorization header")
		return
	}

	// Get current user from token
	user, err := h.svc.GetMe(r.Context(), token)
	if err != nil {
		if errors.Is(err, coresvc.ErrInvalidToken) {
			jsonError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		log.Printf("error validating token: %v", err)
		jsonError(w, http.StatusUnauthorized, "invalid token")
		return
	}

	roles, err := h.svc.GetMyPlatformRoles(r.Context(), user.ID)
	if err != nil {
		log.Printf("error getting platform roles for user %s: %v", user.ID, err)
		jsonError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	if roles == nil {
		roles = []domain.PlatformRole{}
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"roles": roles,
	})
}

// ------- Helpers ------- \\

func extractBearerToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}

	return parts[1]
}

func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func jsonError(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, errorResponse{Error: message})
}
