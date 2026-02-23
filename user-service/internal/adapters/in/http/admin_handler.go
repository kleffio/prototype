package http

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	coresvc "github.com/kleffio/www/user-service/internal/core/service/users"
)

// AdminHandler handles admin HTTP requests
type AdminHandler struct {
	adminSvc *coresvc.AdminService
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler(adminSvc *coresvc.AdminService) *AdminHandler {
	return &AdminHandler{
		adminSvc: adminSvc,
	}
}

// ListUsers handles GET /api/v1/admin/users
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	adminCtx := GetAdminContext(r.Context())

	// Parse query parameters
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	search := r.URL.Query().Get("search")

	result, err := h.adminSvc.ListUsers(r.Context(), adminCtx, page, pageSize, search)
	if err != nil {
		log.Printf("error listing users: %v", err)
		jsonError(w, http.StatusInternalServerError, "failed to list users")
		return
	}

	jsonResponse(w, http.StatusOK, result)
}

// GetUserDetails handles GET /api/v1/admin/users/:id
func (h *AdminHandler) GetUserDetails(w http.ResponseWriter, r *http.Request) {
	adminCtx := GetAdminContext(r.Context())
	userID := chi.URLParam(r, "id")

	if userID == "" {
		jsonError(w, http.StatusBadRequest, "missing user id")
		return
	}

	user, err := h.adminSvc.GetUserDetails(r.Context(), adminCtx, domain.ID(userID))
	if err != nil {
		if errors.Is(err, coresvc.ErrUserNotFound) {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}
		log.Printf("error getting user details: %v", err)
		jsonError(w, http.StatusInternalServerError, "failed to get user details")
		return
	}

	jsonResponse(w, http.StatusOK, user)
}

// UpdateUserRoles handles PATCH /api/v1/admin/users/:id/roles
func (h *AdminHandler) UpdateUserRoles(w http.ResponseWriter, r *http.Request) {
	adminCtx := GetAdminContext(r.Context())
	userID := chi.URLParam(r, "id")

	if userID == "" {
		jsonError(w, http.StatusBadRequest, "missing user id")
		return
	}

	var req domain.RoleUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.adminSvc.UpdateUserRoles(r.Context(), adminCtx, domain.ID(userID), &req)
	if err != nil {
		if errors.Is(err, coresvc.ErrUserNotFound) {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}
		if errors.Is(err, coresvc.ErrInvalidRole) {
			jsonError(w, http.StatusBadRequest, "invalid role specified")
			return
		}
		if errors.Is(err, coresvc.ErrCannotModifySelf) {
			jsonError(w, http.StatusBadRequest, "cannot modify your own account via admin API")
			return
		}
		log.Printf("error updating user roles: %v", err)
		jsonError(w, http.StatusInternalServerError, "failed to update user roles")
		return
	}

	// Get updated user details to include in response
	user, err := h.adminSvc.GetUserDetails(r.Context(), adminCtx, domain.ID(userID))
	if err != nil {
		// Still return the result even if we can't get user details
		jsonResponse(w, http.StatusOK, result)
		return
	}

	// Return both the result and updated user
	response := map[string]interface{}{
		"success":          result.Success,
		"grantedRoles":     result.GrantedRoles,
		"revokedRoles":     result.RevokedRoles,
		"failedGrants":     result.FailedGrants,
		"failedRevokes":    result.FailedRevokes,
		"hasPartialFailure": result.HasPartialFailure,
		"user":             user,
	}

	// Use appropriate status code based on result
	statusCode := http.StatusOK
	if !result.Success {
		statusCode = http.StatusBadRequest
	} else if result.HasPartialFailure {
		statusCode = http.StatusPartialContent // 206 for partial success
	}

	jsonResponse(w, statusCode, response)
}

// SuspendUser handles PATCH /api/v1/admin/users/:id/suspend
func (h *AdminHandler) SuspendUser(w http.ResponseWriter, r *http.Request) {
	adminCtx := GetAdminContext(r.Context())
	userID := chi.URLParam(r, "id")

	if userID == "" {
		jsonError(w, http.StatusBadRequest, "missing user id")
		return
	}

	var req domain.SuspendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	err := h.adminSvc.SuspendUser(r.Context(), adminCtx, domain.ID(userID), req.Suspended, req.Reason)
	if err != nil {
		if errors.Is(err, coresvc.ErrUserNotFound) {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}
		if errors.Is(err, coresvc.ErrCannotModifySelf) {
			jsonError(w, http.StatusBadRequest, "cannot modify your own account via admin API")
			return
		}
		log.Printf("error suspending user: %v", err)
		jsonError(w, http.StatusInternalServerError, "failed to update user suspension status")
		return
	}

	// Return updated user details
	user, err := h.adminSvc.GetUserDetails(r.Context(), adminCtx, domain.ID(userID))
	if err != nil {
		jsonResponse(w, http.StatusOK, map[string]string{"message": "user suspension status updated"})
		return
	}

	jsonResponse(w, http.StatusOK, user)
}

// GetUserActivity handles GET /api/v1/admin/users/:id/activity
func (h *AdminHandler) GetUserActivity(w http.ResponseWriter, r *http.Request) {
	adminCtx := GetAdminContext(r.Context())
	userID := chi.URLParam(r, "id")

	if userID == "" {
		jsonError(w, http.StatusBadRequest, "missing user id")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}

	logs, total, err := h.adminSvc.GetUserActivity(r.Context(), adminCtx, domain.ID(userID), limit, offset)
	if err != nil {
		log.Printf("error getting user activity: %v", err)
		jsonError(w, http.StatusInternalServerError, "failed to get user activity")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"items": logs,
		"total": total,
	})
}

// GetAuditLogs handles GET /api/v1/admin/audit-logs
func (h *AdminHandler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	adminCtx := GetAdminContext(r.Context())

	// Parse pagination
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	// Parse filters
	filter := &domain.AdminAuditLogFilter{
		AdminUserID: r.URL.Query().Get("adminUserId"),
		Action:      r.URL.Query().Get("action"),
		TargetType:  r.URL.Query().Get("targetType"),
		TargetID:    r.URL.Query().Get("targetId"),
	}

	// Parse date filters
	if startDateStr := r.URL.Query().Get("startDate"); startDateStr != "" {
		startDate, err := parseDate(startDateStr)
		if err == nil {
			filter.StartDate = &startDate
		}
	}
	if endDateStr := r.URL.Query().Get("endDate"); endDateStr != "" {
		endDate, err := parseDate(endDateStr)
		if err == nil {
			filter.EndDate = &endDate
		}
	}

	result, err := h.adminSvc.GetAuditLogs(r.Context(), adminCtx, filter, pageSize, offset)
	if err != nil {
		log.Printf("error getting audit logs: %v", err)
		jsonError(w, http.StatusInternalServerError, "failed to get audit logs")
		return
	}

	jsonResponse(w, http.StatusOK, result)
}

// parseDate parses a date string in RFC3339 format
func parseDate(s string) (time.Time, error) {
	return time.Parse(time.RFC3339, s)
}
