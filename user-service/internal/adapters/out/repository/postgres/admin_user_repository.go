//go:build !test
// +build !test

package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
	_ "github.com/lib/pq"
)

type PostgresAdminUserRepository struct {
	db *sql.DB
}

var _ port.AdminUserRepository = (*PostgresAdminUserRepository)(nil)

func NewPostgresAdminUserRepository(connectionString string) (*PostgresAdminUserRepository, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	return &PostgresAdminUserRepository{db: db}, nil
}

// ListAll retrieves paginated users with optional search
func (r *PostgresAdminUserRepository) ListAll(ctx context.Context, limit, offset int, search string) ([]domain.AdminUserListItem, int64, error) {
	// Build search condition
	searchCondition := ""
	args := []interface{}{}
	argNum := 1

	if search != "" {
		search = strings.ToLower(strings.TrimSpace(search))
		searchCondition = fmt.Sprintf(`
			WHERE (
				LOWER(email) LIKE $%d
				OR LOWER(username) LIKE $%d
				OR LOWER(display_name) LIKE $%d
			)
		`, argNum, argNum, argNum)
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern)
		argNum++
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", searchCondition)
	var total int64
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Get paginated users with their roles
	query := fmt.Sprintf(`
		SELECT 
			u.id, u.email, u.username, u.display_name, u.avatar_url, u.email_verified,
			u.is_deactivated, u.deactivated_at, u.created_at, u.updated_at,
			COALESCE(
				ARRAY_AGG(pr.role) FILTER (WHERE pr.role IS NOT NULL AND pr.revoked_at IS NULL),
				'{}'
			) AS roles
		FROM users u
		LEFT JOIN platform_roles pr ON u.id = pr.user_id
		%s
		GROUP BY u.id
		ORDER BY u.created_at DESC
		LIMIT $%d OFFSET $%d
	`, searchCondition, argNum, argNum+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query users: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var users []domain.AdminUserListItem
	for rows.Next() {
		var u domain.AdminUserListItem
		var avatarURL sql.NullString
		var deactivatedAt sql.NullTime
		var roles pqStringArray

		err := rows.Scan(
			&u.ID,
			&u.Email,
			&u.Username,
			&u.DisplayName,
			&avatarURL,
			&u.EmailVerified,
			&u.IsDeactivated,
			&deactivatedAt,
			&u.CreatedAt,
			&u.UpdatedAt,
			&roles,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}

		if avatarURL.Valid {
			u.AvatarURL = &avatarURL.String
		}
		if deactivatedAt.Valid {
			u.DeactivatedAt = &deactivatedAt.Time
		}

		// Convert roles array
		for _, r := range roles {
			u.PlatformRoles = append(u.PlatformRoles, domain.PlatformRole(r))
		}

		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows iteration failed: %w", err)
	}

	if users == nil {
		users = []domain.AdminUserListItem{}
	}

	return users, total, nil
}

// GetAdminUserDetail retrieves detailed user information including roles
func (r *PostgresAdminUserRepository) GetAdminUserDetail(ctx context.Context, userID domain.ID) (*domain.AdminUserDetail, error) {
	// Get user details
	userQuery := `
		SELECT 
			id, authentik_id, email, email_verified, login_username,
			username, display_name, avatar_url, bio,
			is_deactivated, deactivated_at, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var u domain.AdminUserDetail
	var avatarURL, bio sql.NullString
	var authentikID, loginUsername sql.NullString
	var deactivatedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, userQuery, userID).Scan(
		&u.ID,
		&authentikID,
		&u.Email,
		&u.EmailVerified,
		&loginUsername,
		&u.Username,
		&u.DisplayName,
		&avatarURL,
		&bio,
		&u.IsDeactivated,
		&deactivatedAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query user: %w", err)
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

	// Get platform roles
	rolesQuery := `
		SELECT id, user_id, role, granted_by, granted_at, revoked_at, created_at
		FROM platform_roles
		WHERE user_id = $1
		ORDER BY granted_at DESC
	`

	rows, err := r.db.QueryContext(ctx, rolesQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user roles: %w", err)
	}
	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var role domain.PlatformRoleAssignment
		var grantedBy sql.NullString
		var revokedAt sql.NullTime

		err := rows.Scan(
			&role.ID,
			&role.UserID,
			&role.Role,
			&grantedBy,
			&role.GrantedAt,
			&revokedAt,
			&role.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan role: %w", err)
		}

		if grantedBy.Valid {
			role.GrantedBy = &grantedBy.String
		}
		if revokedAt.Valid {
			role.RevokedAt = &revokedAt.Time
		}

		u.PlatformRoles = append(u.PlatformRoles, role)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("roles rows iteration failed: %w", err)
	}

	if u.PlatformRoles == nil {
		u.PlatformRoles = []domain.PlatformRoleAssignment{}
	}

	return &u, nil
}

// SetDeactivated sets the deactivation status of a user (admin operation)
func (r *PostgresAdminUserRepository) SetDeactivated(ctx context.Context, userID domain.ID, deactivated bool) error {
	var query string
	var result sql.Result
	var err error

	if deactivated {
		query = `
			UPDATE users
			SET is_deactivated = true, deactivated_at = NOW(), updated_at = NOW()
			WHERE id = $1 AND is_deactivated = false
		`
		result, err = r.db.ExecContext(ctx, query, userID)
	} else {
		query = `
			UPDATE users
			SET is_deactivated = false, deactivated_at = NULL, updated_at = NOW()
			WHERE id = $1 AND is_deactivated = true
		`
		result, err = r.db.ExecContext(ctx, query, userID)
	}

	if err != nil {
		return fmt.Errorf("failed to set deactivation status: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("user not found or already in requested state")
	}

	return nil
}

// Count counts total users (with optional search filter)
func (r *PostgresAdminUserRepository) Count(ctx context.Context, search string) (int64, error) {
	query := "SELECT COUNT(*) FROM users"
	args := []interface{}{}

	if search != "" {
		search = strings.ToLower(strings.TrimSpace(search))
		query += " WHERE (LOWER(email) LIKE $1 OR LOWER(username) LIKE $1 OR LOWER(display_name) LIKE $1)"
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern)
	}

	var count int64
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count users: %w", err)
	}

	return count, nil
}

// CreateAdminUser creates a new user (admin operation, for testing/setup)
func (r *PostgresAdminUserRepository) CreateAdminUser(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, authentik_id, email, email_verified, login_username,
		                   username, display_name, avatar_url, bio, is_deactivated, deactivated_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	if user.ID == "" {
		user.ID = domain.ID(uuid.New().String())
	}

	var deactivatedAtParam interface{}
	if user.DeactivatedAt != nil {
		deactivatedAtParam = *user.DeactivatedAt
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
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (r *PostgresAdminUserRepository) Close() error {
	return r.db.Close()
}

// pqStringArray is a helper type for scanning PostgreSQL text[] arrays
type pqStringArray []string

func (a *pqStringArray) Scan(src interface{}) error {
	if src == nil {
		*a = []string{}
		return nil
	}

	switch v := src.(type) {
	case []byte:
		// Parse PostgreSQL array format: {val1,val2,val3}
		s := string(v)
		if s == "{}" || s == "" {
			*a = []string{}
			return nil
		}
		// Remove surrounding braces
		s = strings.Trim(s, "{}")
		if s == "" {
			*a = []string{}
			return nil
		}
		// Split by comma (simple split, doesn't handle quoted strings with commas)
		*a = strings.Split(s, ",")
		return nil
	case string:
		s := v
		if s == "{}" || s == "" {
			*a = []string{}
			return nil
		}
		s = strings.Trim(s, "{}")
		if s == "" {
			*a = []string{}
			return nil
		}
		*a = strings.Split(s, ",")
		return nil
	default:
		return fmt.Errorf("cannot scan %T into pqStringArray", src)
	}
}