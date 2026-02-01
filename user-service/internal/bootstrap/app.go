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
	Config           *config.Config
	Router           http.Handler
	UserRepo         interface{ Close() error }
	AuditRepo        interface{ Close() error }
	PlatformRoleRepo interface{ Close() error }
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

	tokenValidator := authentik.NewTokenValidator(cfg.AuthentikBaseURL)
	authentikManager := authentik.NewAuthentikManager(cfg.AuthentikBaseURL)

	svc := usersvc.NewService(userRepo, auditRepo, platformRoleRepo, tokenValidator, authentikManager, cfg.DefaultAdminEmail)

	handler := httphandler.NewHandler(svc)
	root := chi.NewRouter()
	root.Mount("/", httphandler.NewRouter(handler))

	return &App{
		Config:           cfg,
		Router:           root,
		UserRepo:         userRepoCloser,
		AuditRepo:        auditCloser,
		PlatformRoleRepo: platformRoleCloser,
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

	return firstErr
}
