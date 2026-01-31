//go:build !test
// +build !test

package bootstrap

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/kleffio/www/user-service/internal/adapters/out/repository"
	"github.com/kleffio/www/user-service/internal/adapters/out/repository/postgres"

	"github.com/kleffio/www/user-service/internal/config"
)

func buildUserRepository(cfg *config.Config) (
	repository.UserRepository,
	interface{ Close() error },
	error,
) {
	if cfg.PostgresUserDSN == "" {
		return nil, noopCloser{}, fmt.Errorf("PostgresUserDSN is required for user repository")
	}

	log.Printf("user repository backend: postgresql")
	repo, err := postgres.NewPostgresUserRepository(cfg.PostgresUserDSN)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create postgres user repo: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := repo.CreateTable(ctx); err != nil {
		_ = repo.Close()
		return nil, nil, fmt.Errorf("failed to create users table: %w", err)
	}

	log.Printf("users table initialized")

	return repo, repo, nil
}

func buildAuditRepository(cfg *config.Config) (
	repository.AuditRepository,
	interface{ Close() error },
	error,
) {
	if cfg.PostgresAuditDSN == "" {
		return nil, noopCloser{}, fmt.Errorf("PostgresAuditDSN is required for audit logging")
	}

	log.Printf("audit backend: postgresql")
	repo, err := postgres.NewPostgresAuditRepository(cfg.PostgresAuditDSN)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create postgres audit repo: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := repo.CreateTable(ctx); err != nil {
		_ = repo.Close()
		return nil, nil, fmt.Errorf("failed to create audit table: %w", err)
	}

	log.Printf("audit_logs table initialized")

	return repo, repo, nil
}

func buildPlatformRoleRepository(cfg *config.Config) (
	repository.PlatformRoleRepository,
	interface{ Close() error },
	error,
) {
	if cfg.PostgresUserDSN == "" {
		log.Printf("PostgresUserDSN not configured, platform roles will be disabled")
		return nil, noopCloser{}, nil
	}

	log.Printf("platform role repository backend: postgresql")
	repo, err := postgres.NewPostgresPlatformRoleRepository(cfg.PostgresUserDSN)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create postgres platform role repo: %w", err)
	}

	log.Printf("platform_roles repository initialized")

	return repo, repo, nil
}

type noopCloser struct{}

func (noopCloser) Close() error { return nil }
