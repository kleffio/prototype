package http

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter(h *Handler) http.Handler {
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

	r.Get("/healthz", h.Health)
	r.Get("/health", h.Health)

	r.Route("/api/v1/users", func(r chi.Router) {
		r.Get("/me", h.GetMe)
		r.Patch("/me/profile", h.PatchMeProfile)
		r.Delete("/me/deactivate", h.DeactivateAccount)
		r.Get("/me/audit", h.GetMyAuditLogs)
		r.Get("/status/{userId}", h.GetUserStatus)

		r.Get("/profile/@{handle}", h.GetPublicProfile)

		r.Get("/{id}", h.GetUser)
		r.Post("/resolve", h.ResolveMany)
	})

	return r
}
