//go:build !test
// +build !test

package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
	_ "github.com/lib/pq"
)

type PostgresPlatformRoleRepository struct {
	db *sql.DB
}

var _ port.PlatformRoleRepository = (*PostgresPlatformRoleRepository)(nil)

func NewPostgresPlatformRoleRepository(connectionString string) (*PostgresPlatformRoleRepository, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	return &PostgresPlatformRoleRepository{db: db}, nil
}

func (r *PostgresPlatformRoleRepository) CreateTable(ctx context.Context) error {
	log.Println("[DEBUG] CreateTable: Starting platform_roles table creation...")

	query := `
		CREATE EXTENSION IF NOT EXISTS "pgcrypto";

		CREATE TABLE IF NOT EXISTS platform_roles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id VARCHAR(255) NOT NULL,
			role VARCHAR(50) NOT NULL,
			granted_by VARCHAR(255),
			granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
			revoked_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),

			CONSTRAINT platform_roles_role_check
				CHECK (role IN ('platform_admin', 'platform_support', 'platform_user')),
			CONSTRAINT platform_roles_user_role_unique
				UNIQUE(user_id, role),
			CONSTRAINT platform_roles_revoked_check
				CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
		);

		CREATE INDEX IF NOT EXISTS idx_platform_roles_user
			ON platform_roles(user_id)
			WHERE revoked_at IS NULL;

		CREATE INDEX IF NOT EXISTS idx_platform_roles_active
			ON platform_roles(role)
			WHERE revoked_at IS NULL;
	`

	_, err := r.db.ExecContext(ctx, query)
	if err != nil {
		log.Printf("[DEBUG] CreateTable: FAILED with error: %v", err)
		return err
	}

	log.Println("[DEBUG] CreateTable: Successfully created (or verified) platform_roles table")
	return nil
}

// GetActiveRolesByUserID returns all active (non-revoked) platform roles for a user
func (r *PostgresPlatformRoleRepository) GetActiveRolesByUserID(ctx context.Context, userID string) ([]domain.PlatformRole, error) {
	query := `
		SELECT role
		FROM platform_roles
		WHERE user_id = $1 AND revoked_at IS NULL
		ORDER BY granted_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	var roles []domain.PlatformRole
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, fmt.Errorf("scan failed: %w", err)
		}
		roles = append(roles, domain.PlatformRole(role))
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration failed: %w", err)
	}

	return roles, nil
}

// HasRole checks if a user has a specific active platform role
func (r *PostgresPlatformRoleRepository) HasRole(ctx context.Context, userID string, role domain.PlatformRole) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1
			FROM platform_roles
			WHERE user_id = $1
			  AND role = $2
			  AND revoked_at IS NULL
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, userID, string(role)).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("query failed: %w", err)
	}

	return exists, nil
}

// GrantRole grants a platform role to a user
func (r *PostgresPlatformRoleRepository) GrantRole(ctx context.Context, userID string, role domain.PlatformRole, grantedBy *string) error {
	if !role.IsValid() {
		return fmt.Errorf("invalid role: %s", role)
	}

	query := `
		INSERT INTO platform_roles (user_id, role, granted_by, granted_at, created_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (user_id, role) DO NOTHING
	`

	_, err := r.db.ExecContext(ctx, query, userID, string(role), nullStringPtr(grantedBy))
	if err != nil {
		return fmt.Errorf("grant role failed: %w", err)
	}

	return nil
}

// RevokeRole revokes a platform role from a user
func (r *PostgresPlatformRoleRepository) RevokeRole(ctx context.Context, userID string, role domain.PlatformRole) error {
	query := `
		UPDATE platform_roles
		SET revoked_at = NOW()
		WHERE user_id = $1
		  AND role = $2
		  AND revoked_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, userID, string(role))
	if err != nil {
		return fmt.Errorf("revoke role failed: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("role assignment not found or already revoked")
	}

	return nil
}

func (r *PostgresPlatformRoleRepository) Close() error {
	return r.db.Close()
}
