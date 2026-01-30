//go:build !test
// +build !test

package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
	_ "github.com/lib/pq"
)

type PostgresUserRepository struct {
	db *sql.DB
}

var _ port.UserRepository = (*PostgresUserRepository)(nil)

func NewPostgresUserRepository(connectionString string) (*PostgresUserRepository, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	return &PostgresUserRepository{db: db}, nil
}

func (r *PostgresUserRepository) CreateTable(ctx context.Context) error {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(255) PRIMARY KEY,
		authentik_id VARCHAR(255),
		email VARCHAR(255) NOT NULL,
		email_verified BOOLEAN NOT NULL DEFAULT false,
		login_username VARCHAR(255),
		username VARCHAR(63) NOT NULL,
		display_name VARCHAR(255) NOT NULL,
		avatar_url TEXT,
		bio TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
		CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9_-]+$'),
		CONSTRAINT users_username_length CHECK (LENGTH(username) >= 2 AND LENGTH(username) <= 63)
	);

	CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
	CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
	CREATE UNIQUE INDEX IF NOT EXISTS idx_users_authentik_id ON users(authentik_id) WHERE authentik_id IS NOT NULL;
	CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

	CREATE OR REPLACE FUNCTION update_users_updated_at()
	RETURNS TRIGGER AS $$
	BEGIN
		NEW.updated_at = NOW();
		RETURN NEW;
	END;
	$$ LANGUAGE plpgsql;

	DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
	CREATE TRIGGER trigger_users_updated_at
		BEFORE UPDATE ON users
		FOR EACH ROW
		EXECUTE FUNCTION update_users_updated_at();
	`

	_, err := r.db.ExecContext(ctx, query)
	return err
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id domain.ID) (*domain.User, error) {
	query := `
		SELECT id, authentik_id, email, email_verified, login_username,
		       username, display_name, avatar_url, bio, is_deactivated, deactivated_at, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var u domain.User
	var avatarURL, bio sql.NullString
	var authentikID, loginUsername sql.NullString
	var deactivatedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &authentikID, &u.Email, &u.EmailVerified, &loginUsername,
		&u.Username, &u.DisplayName, &avatarURL, &bio, &u.IsDeactivated, &deactivatedAt, &u.CreatedAt, &u.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}

	if authentikID.Valid {
		u.AuthentikID = authentikID.String
	}
	if loginUsername.Valid {
		u.LoginUsername = loginUsername.String
	}
	if avatarURL.Valid {
		u.AvatarURL = &avatarURL.String
	}
	if bio.Valid {
		u.Bio = &bio.String
	}
	if deactivatedAt.Valid {
		u.DeactivatedAt = &deactivatedAt.Time
	}

	return &u, nil
}

func (r *PostgresUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `
		SELECT id, authentik_id, email, email_verified, login_username,
		       username, display_name, avatar_url, bio, is_deactivated, deactivated_at, created_at, updated_at
		FROM users
		WHERE username = $1
	`

	var u domain.User
	var avatarURL, bio sql.NullString
	var authentikID, loginUsername sql.NullString
	var deactivatedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&u.ID, &authentikID, &u.Email, &u.EmailVerified, &loginUsername,
		&u.Username, &u.DisplayName, &avatarURL, &bio, &u.IsDeactivated, &deactivatedAt, &u.CreatedAt, &u.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}

	if authentikID.Valid {
		u.AuthentikID = authentikID.String
	}
	if loginUsername.Valid {
		u.LoginUsername = loginUsername.String
	}
	if avatarURL.Valid {
		u.AvatarURL = &avatarURL.String
	}
	if bio.Valid {
		u.Bio = &bio.String
	}
	if deactivatedAt.Valid {
		u.DeactivatedAt = &deactivatedAt.Time
	}

	return &u, nil
}

func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, authentik_id, email, email_verified, login_username,
		       username, display_name, avatar_url, bio, is_deactivated, deactivated_at, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var u domain.User
	var avatarURL, bio sql.NullString
	var authentikID, loginUsername sql.NullString
	var deactivatedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&u.ID, &authentikID, &u.Email, &u.EmailVerified, &loginUsername,
		&u.Username, &u.DisplayName, &avatarURL, &bio, &u.IsDeactivated, &deactivatedAt, &u.CreatedAt, &u.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}

	if authentikID.Valid {
		u.AuthentikID = authentikID.String
	}
	if loginUsername.Valid {
		u.LoginUsername = loginUsername.String
	}
	if avatarURL.Valid {
		u.AvatarURL = &avatarURL.String
	}
	if bio.Valid {
		u.Bio = &bio.String
	}
	if deactivatedAt.Valid {
		u.DeactivatedAt = &deactivatedAt.Time
	}

	return &u, nil
}

func (r *PostgresUserRepository) UsernameExists(ctx context.Context, username string, excludeID domain.ID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE username = $1 AND id != $2)`
	var exists bool
	err := r.db.QueryRowContext(ctx, query, username, excludeID).Scan(&exists)
	return exists, err
}

func (r *PostgresUserRepository) Save(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, authentik_id, email, email_verified, login_username,
		                   username, display_name, avatar_url, bio, is_deactivated, deactivated_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (id) DO UPDATE SET
			authentik_id   = EXCLUDED.authentik_id,
			email          = EXCLUDED.email,
			email_verified = EXCLUDED.email_verified,
			login_username = EXCLUDED.login_username,
			username       = EXCLUDED.username,
			display_name   = EXCLUDED.display_name,
			avatar_url     = EXCLUDED.avatar_url,
			bio            = EXCLUDED.bio,
			is_deactivated = EXCLUDED.is_deactivated,
			deactivated_at = EXCLUDED.deactivated_at,
			updated_at     = EXCLUDED.updated_at
	`

	var deactivatedAtParam interface{}
	if user.DeactivatedAt != nil {
		deactivatedAtParam = *user.DeactivatedAt
	} else {
		deactivatedAtParam = nil
	}

	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		nullString(user.AuthentikID),
		user.Email,
		user.EmailVerified,
		nullString(user.LoginUsername),
		user.Username,
		user.DisplayName,
		nullStringPtr(user.AvatarURL),
		nullStringPtr(user.Bio),
		user.IsDeactivated,
		deactivatedAtParam,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("save failed: %w", err)
	}

	log.Printf("[postgres] saved user %s", user.ID)
	return nil
}

func (r *PostgresUserRepository) UpdateProfile(ctx context.Context, id domain.ID, update *domain.ProfileUpdate) error {
	setClauses := []string{"updated_at = NOW()"}
	args := []interface{}{id}
	argNum := 2

	if update.Username != nil {
		setClauses = append(setClauses, fmt.Sprintf("username = $%d", argNum))
		args = append(args, *update.Username)
		argNum++
	}

	if update.DisplayName != nil {
		setClauses = append(setClauses, fmt.Sprintf("display_name = $%d", argNum))
		args = append(args, *update.DisplayName)
		argNum++
	}

	if update.AvatarURL != nil {
		setClauses = append(setClauses, fmt.Sprintf("avatar_url = $%d", argNum))
		args = append(args, *update.AvatarURL)
		argNum++
	}

	if update.Bio != nil {
		setClauses = append(setClauses, fmt.Sprintf("bio = $%d", argNum))
		args = append(args, *update.Bio)
	}

	if len(setClauses) == 1 {
		return nil
	}

	setClause := strings.Join(setClauses, ", ")

	query := fmt.Sprintf(`
        UPDATE users
        SET %s
        WHERE id = $1
    `, setClause)

	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update failed: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (r *PostgresUserRepository) DeactivateAccount(ctx context.Context, id domain.ID) error {
	query := `
        UPDATE users
        SET is_deactivated = true, 
            deactivated_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND is_deactivated = false
    `

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("deactivation failed: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("user not found or already deactivated")
	}

	log.Printf("[postgres] deactivated user %s", id)
	return nil
}

func (r *PostgresUserRepository) UpdateUserID(ctx context.Context, oldID, newID domain.ID) error {
	query := `
        UPDATE users
        SET id = $2, updated_at = NOW()
        WHERE id = $1
    `

	result, err := r.db.ExecContext(ctx, query, oldID, newID)
	if err != nil {
		return fmt.Errorf("failed to update user ID: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("user with ID %s not found", oldID)
	}

	log.Printf("[postgres] updated user ID from %s to %s", oldID, newID)
	return nil
}

func (r *PostgresUserRepository) Close() error {
	return r.db.Close()
}

func (r *PostgresUserRepository) Delete(ctx context.Context, id domain.ID) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found: %s", id)
	}

	return nil
}

// Helper functions

func nullString(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
}

func nullStringPtr(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *s, Valid: true}
}
