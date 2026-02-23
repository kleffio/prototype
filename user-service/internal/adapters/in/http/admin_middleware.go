package http

import (
	"context"
	"net/http"
	"strings"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	coresvc "github.com/kleffio/www/user-service/internal/core/service/users"
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
)

// AdminContextKey is the context key for admin context
type AdminContextKey string

const (
	AdminUserIDKey AdminContextKey = "admin_user_id"
	IPAddressKey   AdminContextKey = "ip_address"
	UserAgentKey   AdminContextKey = "user_agent"
)

// AdminMiddleware verifies that the request is from a platform admin
type AdminMiddleware struct {
	tokenValidator   TokenValidator
	platformRoleRepo PlatformRoleRepository
}

// TokenValidator interface for validating tokens
type TokenValidator interface {
	ValidateToken(ctx context.Context, bearerToken string) (*port.TokenClaims, error)
}

// PlatformRoleRepository interface for checking roles
type PlatformRoleRepository interface {
	HasRole(ctx context.Context, userID string, role domain.PlatformRole) (bool, error)
}

// NewAdminMiddleware creates a new admin middleware
func NewAdminMiddleware(tokenValidator TokenValidator, roleRepo PlatformRoleRepository) *AdminMiddleware {
	return &AdminMiddleware{
		tokenValidator:   tokenValidator,
		platformRoleRepo: roleRepo,
	}
}

// RequireAdmin is a middleware that checks if the user is a platform admin
func (m *AdminMiddleware) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractBearerToken(r)
		if token == "" {
			jsonError(w, http.StatusUnauthorized, "missing or invalid authorization header")
			return
		}

		// Validate token
		claims, err := m.tokenValidator.ValidateToken(r.Context(), token)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		// Check if user is platform admin
		isAdmin, err := m.platformRoleRepo.HasRole(r.Context(), claims.Sub, domain.PlatformAdmin)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "failed to verify admin status")
			return
		}

		if !isAdmin {
			jsonError(w, http.StatusForbidden, "admin access required")
			return
		}

		// Add admin info to context
		ctx := r.Context()
		ctx = context.WithValue(ctx, AdminUserIDKey, claims.Sub)
		ctx = context.WithValue(ctx, IPAddressKey, getIPAddress(r))
		ctx = context.WithValue(ctx, UserAgentKey, r.UserAgent())

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetAdminContext extracts admin context from the request context
func GetAdminContext(ctx context.Context) coresvc.AdminContext {
	adminUserID, _ := ctx.Value(AdminUserIDKey).(string)
	ipAddress, _ := ctx.Value(IPAddressKey).(string)
	userAgent, _ := ctx.Value(UserAgentKey).(string)

	return coresvc.AdminContext{
		AdminUserID: adminUserID,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
	}
}

// getIPAddress extracts the real IP address from the request
func getIPAddress(r *http.Request) string {
	// Check X-Forwarded-For header first (for requests through proxies)
	xForwardedFor := r.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		// X-Forwarded-For may contain multiple IPs, take the first one
		ips := strings.Split(xForwardedFor, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	xRealIP := r.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return xRealIP
	}

	// Fall back to RemoteAddr
	return strings.Split(r.RemoteAddr, ":")[0]
}