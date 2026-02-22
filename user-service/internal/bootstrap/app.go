//go:build !test
// +build !test

package bootstrap

import (
	"context"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"

	httphandler "github.com/kleffio/www/user-service/internal/adapters/in/http"
	"github.com/kleffio/www/user-service/internal/adapters/out/authentik"
	"github.com/kleffio/www/user-service/internal/config"
	usersvc "github.com/kleffio/www/user-service/internal/core/service/users"
)

type App struct {
	Config            *config.Config
	Router            http.Handler
	UserRepo          interface{ Close() error }
	AuditRepo         interface{ Close() error }
	PlatformRoleRepo  interface{ Close() error }
	AdminUserRepo     interface{ Close() error }
	AdminAuditRepo    interface{ Close() error }
}

func NewApp() (*App, error) {
	cfg, err := config.FromEnv()
	if err != nil {
		return nil, err
	}

	userRepo, userRepoCloser, err := buildUserRepository(cfg)
	if err != nil {
		return nil, err
	}

	auditRepo, auditCloser, err := buildAuditRepository(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to build audit repository: %w", err)
	}

	platformRoleRepo, platformRoleCloser, err := buildPlatformRoleRepository(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to build platform role repository: %w", err)
	}

	// Build admin repositories
	adminUserRepo, adminUserCloser, err := buildAdminUserRepository(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to build admin user repository: %w", err)
	}

	adminAuditRepo, adminAuditCloser, err := buildAdminAuditRepository(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to build admin audit repository: %w", err)
	}

	tokenValidator := authentik.NewTokenValidator(cfg.AuthentikBaseURL)
	authentikManager := authentik.NewAuthentikManager(cfg.AuthentikBaseURL)

	svc := usersvc.NewService(userRepo, auditRepo, platformRoleRepo, tokenValidator, authentikManager, cfg.DefaultAdminEmail)

	// Create admin service
	adminSvc := usersvc.NewAdminService(adminUserRepo, adminAuditRepo, platformRoleRepo)

	handler := httphandler.NewHandler(svc)
	root := chi.NewRouter()

	// Create admin middleware and handler
	adminMiddleware := httphandler.NewAdminMiddleware(tokenValidator, platformRoleRepo)
	adminHandler := httphandler.NewAdminHandler(adminSvc)

	// Mount router with admin support
	root.Mount("/", httphandler.NewRouterWithAdmin(&httphandler.RouterConfig{
		Handler:         handler,
		AdminHandler:    adminHandler,
		AdminMiddleware: adminMiddleware,
	}))

	return &App{
		Config:           cfg,
		Router:           root,
		UserRepo:         userRepoCloser,
		AuditRepo:        auditCloser,
		PlatformRoleRepo: platformRoleCloser,
		AdminUserRepo:    adminUserCloser,
		AdminAuditRepo:   adminAuditCloser,
	}, nil
}

func (a *App) Shutdown(ctx context.Context) error {
	var firstErr error

	if a.UserRepo != nil {
		if err := a.UserRepo.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}

	if a.AuditRepo != nil {
		if err := a.AuditRepo.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}

	if a.PlatformRoleRepo != nil {
		if err := a.PlatformRoleRepo.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}

	if a.AdminUserRepo != nil {
		if err := a.AdminUserRepo.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}

	if a.AdminAuditRepo != nil {
		if err := a.AdminAuditRepo.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}

	return firstErr
}
