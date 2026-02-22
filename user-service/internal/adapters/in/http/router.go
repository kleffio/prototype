package http

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// RouterConfig holds dependencies for creating the router
type RouterConfig struct {
	Handler           *Handler
	AdminHandler      *AdminHandler
	AdminMiddleware   *AdminMiddleware
}

func NewRouter(h *Handler) http.Handler {
	return NewRouterWithAdmin(&RouterConfig{Handler: h})
}

// NewRouterWithAdmin creates a router with admin support
func NewRouterWithAdmin(cfg *RouterConfig) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://kleff.io", "https://api.kleff.io", "http://localhost:5173", "http://localhost:8080", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "Cache-Control", "Pragma", "Expires"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	h := cfg.Handler
	r.Get("/healthz", h.Health)
	r.Get("/health", h.Health)

	r.Route("/api/v1/users", func(r chi.Router) {
		r.Get("/me", h.GetMe)
		r.Patch("/me/profile", h.PatchMeProfile)
		r.Delete("/me/deactivate", h.DeactivateAccount)
		r.Get("/me/audit", h.GetMyAuditLogs)
		r.Get("/status/{userId}", h.GetUserStatus)
		r.Get("/me/platform-roles", h.GetMyPlatformRoles)

		r.Get("/profile/@{handle}", h.GetPublicProfile)

		r.Get("/{id}", h.GetUser)
		r.Post("/resolve", h.ResolveMany)
	})

	// Admin routes with authentication and authorization middleware
	if cfg.AdminHandler != nil && cfg.AdminMiddleware != nil {
		r.Route("/api/v1/admin", func(r chi.Router) {
			r.Use(cfg.AdminMiddleware.RequireAdmin)

			// User management
			r.Get("/users", cfg.AdminHandler.ListUsers)
			r.Get("/users/{id}", cfg.AdminHandler.GetUserDetails)
			r.Patch("/users/{id}/roles", cfg.AdminHandler.UpdateUserRoles)
			r.Patch("/users/{id}/suspend", cfg.AdminHandler.SuspendUser)
			r.Get("/users/{id}/activity", cfg.AdminHandler.GetUserActivity)

			// Audit logs
			r.Get("/audit-logs", cfg.AdminHandler.GetAuditLogs)
		})
	}

	return r
}
