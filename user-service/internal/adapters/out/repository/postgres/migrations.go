package postgres

import (
	"context"
	"embed"
	"fmt"
	"log"
	"sort"
	"strconv"
	"strings"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func (r *PostgresUserRepository) RunMigrations(ctx context.Context) error {
	// Create migrations table if it doesn't exist
	if err := r.createMigrationsTable(ctx); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Get list of migration files
	files, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("failed to read migration files: %w", err)
	}

	// Sort migration files by number
	sort.Slice(files, func(i, j int) bool {
		numI := extractMigrationNumber(files[i].Name())
		numJ := extractMigrationNumber(files[j].Name())
		return numI < numJ
	})

	// Run each migration
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".sql") {
			if err := r.runMigration(ctx, file.Name()); err != nil {
				return fmt.Errorf("failed to run migration %s: %w", file.Name(), err)
			}
		}
	}

	return nil
}

func (r *PostgresUserRepository) createMigrationsTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`
	_, err := r.db.ExecContext(ctx, query)
	return err
}

func (r *PostgresUserRepository) runMigration(ctx context.Context, filename string) error {
	version := extractMigrationVersion(filename)

	// Check if migration already applied
	var count int
	err := r.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM schema_migrations WHERE version = $1",
		version).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check migration status: %w", err)
	}

	if count > 0 {
		log.Printf("Migration %s already applied, skipping", version)
		return nil
	}

	// Read migration file
	content, err := migrationFiles.ReadFile("migrations/" + filename)
	if err != nil {
		return fmt.Errorf("failed to read migration file: %w", err)
	}

	// Start transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer func() {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			// Log rollback error but don't override the main error
			fmt.Printf("Warning: failed to rollback transaction: %v\n", rollbackErr)
		}
	}()

	// Execute migration
	if _, err := tx.ExecContext(ctx, string(content)); err != nil {
		return fmt.Errorf("failed to execute migration: %w", err)
	}

	// Record migration as applied
	if _, err := tx.ExecContext(ctx,
		"INSERT INTO schema_migrations (version) VALUES ($1)",
		version); err != nil {
		return fmt.Errorf("failed to record migration: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migration: %w", err)
	}

	log.Printf("Applied migration %s", version)
	return nil
}

func extractMigrationNumber(filename string) int {
	parts := strings.SplitN(filename, "_", 2)
	if len(parts) < 1 {
		return 0
	}
	num, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0
	}
	return num
}

func extractMigrationVersion(filename string) string {
	return strings.TrimSuffix(filename, ".sql")
}
