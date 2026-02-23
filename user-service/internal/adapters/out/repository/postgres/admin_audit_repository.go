//go:build !test
// +build !test

package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"
	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
	_ "github.com/lib/pq"
)

type PostgresAdminAuditRepository struct {
	db *sql.DB
}

var _ port.AdminAuditRepository = (*PostgresAdminAuditRepository)(nil)

func NewPostgresAdminAuditRepository(connectionString string) (*PostgresAdminAuditRepository, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(2)

	return &PostgresAdminAuditRepository{db: db}, nil
}

func (r *PostgresAdminAuditRepository) CreateTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS admin_audit_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			admin_user_id VARCHAR(255) NOT NULL,
			action VARCHAR(100) NOT NULL,
			target_type VARCHAR(50),
			target_id VARCHAR(255),
			details JSONB,
			ip_address VARCHAR(45),
			user_agent TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_logs(admin_user_id);
		CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_logs(target_type, target_id);
		CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action);
	`

	_, err := r.db.ExecContext(ctx, query)
	if err != nil {
		log.Printf("[DEBUG] CreateTable admin_audit_logs: FAILED with error: %v", err)
		return err
	}

	log.Println("[DEBUG] CreateTable admin_audit_logs: Successfully created table")
	return nil
}

// Record creates a new admin audit log entry
func (r *PostgresAdminAuditRepository) Record(ctx context.Context, logEntry *domain.AdminAuditLog) error {
	if logEntry.ID == "" {
		logEntry.ID = uuid.New().String()
	}

	var detailsJSON []byte
	var err error
	if logEntry.Details != nil {
		detailsJSON, err = json.Marshal(logEntry.Details)
		if err != nil {
			return fmt.Errorf("failed to marshal details: %w", err)
		}
	}

	query := `
		INSERT INTO admin_audit_logs (id, admin_user_id, action, target_type, target_id, details, ip_address, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err = r.db.ExecContext(ctx, query,
		logEntry.ID,
		logEntry.AdminUserID,
		logEntry.Action,
		nullString(logEntry.TargetType),
		nullString(logEntry.TargetID),
		detailsJSON,
		nullString(logEntry.IPAddress),
		nullString(logEntry.UserAgent),
		logEntry.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to record admin audit log: %w", err)
	}

	return nil
}

// List retrieves paginated admin audit logs with optional filtering
func (r *PostgresAdminAuditRepository) List(ctx context.Context, filter *domain.AdminAuditLogFilter, limit, offset int) ([]domain.AdminAuditLog, int64, error) {
	// Build the WHERE clause based on filters
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argNum := 1

	if filter != nil {
		if filter.AdminUserID != "" {
			whereClause += fmt.Sprintf(" AND admin_user_id = $%d", argNum)
			args = append(args, filter.AdminUserID)
			argNum++
		}
		if filter.Action != "" {
			whereClause += fmt.Sprintf(" AND action = $%d", argNum)
			args = append(args, filter.Action)
			argNum++
		}
		if filter.TargetType != "" {
			whereClause += fmt.Sprintf(" AND target_type = $%d", argNum)
			args = append(args, filter.TargetType)
			argNum++
		}
		if filter.TargetID != "" {
			whereClause += fmt.Sprintf(" AND target_id = $%d", argNum)
			args = append(args, filter.TargetID)
			argNum++
		}
		if filter.StartDate != nil {
			whereClause += fmt.Sprintf(" AND created_at >= $%d", argNum)
			args = append(args, *filter.StartDate)
			argNum++
		}
		if filter.EndDate != nil {
			whereClause += fmt.Sprintf(" AND created_at <= $%d", argNum)
			args = append(args, *filter.EndDate)
			argNum++
		}
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM admin_audit_logs %s", whereClause)
	var total int64
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count admin audit logs: %w", err)
	}

	// Get paginated results
	query := fmt.Sprintf(`
		SELECT id, admin_user_id, action, target_type, target_id, details, ip_address, user_agent, created_at
		FROM admin_audit_logs
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argNum, argNum+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query admin audit logs: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var logs []domain.AdminAuditLog
	for rows.Next() {
		var auditLog domain.AdminAuditLog
		var targetType, targetID, ipAddress, userAgent sql.NullString
		var detailsJSON []byte

		err := rows.Scan(
			&auditLog.ID,
			&auditLog.AdminUserID,
			&auditLog.Action,
			&targetType,
			&targetID,
			&detailsJSON,
			&ipAddress,
			&userAgent,
			&auditLog.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan admin audit log: %w", err)
		}

		if targetType.Valid {
			auditLog.TargetType = targetType.String
		}
		if targetID.Valid {
			auditLog.TargetID = targetID.String
		}
		if ipAddress.Valid {
			auditLog.IPAddress = ipAddress.String
		}
		if userAgent.Valid {
			auditLog.UserAgent = userAgent.String
		}
		if detailsJSON != nil {
			if err := json.Unmarshal(detailsJSON, &auditLog.Details); err != nil {
				log.Printf("[WARN] failed to unmarshal admin audit details: %v", err)
			}
		}

		logs = append(logs, auditLog)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows iteration failed: %w", err)
	}

	if logs == nil {
		logs = []domain.AdminAuditLog{}
	}

	return logs, total, nil
}

// GetByAdminUserID retrieves audit logs for a specific admin
func (r *PostgresAdminAuditRepository) GetByAdminUserID(ctx context.Context, adminUserID string, limit, offset int) ([]domain.AdminAuditLog, int64, error) {
	filter := &domain.AdminAuditLogFilter{AdminUserID: adminUserID}
	return r.List(ctx, filter, limit, offset)
}

// GetByTarget retrieves audit logs for a specific target
func (r *PostgresAdminAuditRepository) GetByTarget(ctx context.Context, targetType, targetID string, limit, offset int) ([]domain.AdminAuditLog, int64, error) {
	filter := &domain.AdminAuditLogFilter{TargetType: targetType, TargetID: targetID}
	return r.List(ctx, filter, limit, offset)
}

func (r *PostgresAdminAuditRepository) Close() error {
	return r.db.Close()
}