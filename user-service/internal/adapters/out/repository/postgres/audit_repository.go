//go:build !test
// +build !test

package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	domain "github.com/kleffio/www/user-service/internal/core/domain/users"
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
	_ "github.com/lib/pq"
)

type PostgresAuditRepository struct {
	db *sql.DB
}

var _ port.AuditRepository = (*PostgresAuditRepository)(nil)

func NewPostgresAuditRepository(connectionString string) (*PostgresAuditRepository, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	return &PostgresAuditRepository{db: db}, nil
}

func (r *PostgresAuditRepository) CreateTable(ctx context.Context) error {
	query := `
	CREATE TABLE IF NOT EXISTS audit_logs (
		id VARCHAR(36) PRIMARY KEY,
		user_id VARCHAR(255) NOT NULL,
		action VARCHAR(100) NOT NULL,
		changes JSONB NOT NULL,
		ip_address VARCHAR(45),
		user_agent TEXT,
		timestamp TIMESTAMP NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
	CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
	CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
	`

	_, err := r.db.ExecContext(ctx, query)
	return err
}

func (r *PostgresAuditRepository) Record(ctx context.Context, log *domain.AuditLog) error {
	changesJSON, err := json.Marshal(log.Changes)
	if err != nil {
		return fmt.Errorf("failed to marshal changes: %w", err)
	}

	query := `
		INSERT INTO audit_logs (id, user_id, action, changes, ip_address, user_agent, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err = r.db.ExecContext(ctx, query,
		log.ID,
		log.UserID,
		log.Action,
		changesJSON,
		log.IPAddress,
		log.UserAgent,
		log.Timestamp,
	)

	return err
}

func (r *PostgresAuditRepository) GetUserAuditLogs(ctx context.Context, userID domain.ID, limit, offset int) ([]*domain.AuditLog, error) {
	query := `
		SELECT id, user_id, action, changes, ip_address, user_agent, timestamp
		FROM audit_logs
		WHERE user_id = $1
		ORDER BY timestamp DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

	logs := make([]*domain.AuditLog, 0)
	for rows.Next() {
		var log domain.AuditLog
		var changesJSON []byte
		var ipAddress, userAgent sql.NullString

		err := rows.Scan(
			&log.ID,
			&log.UserID,
			&log.Action,
			&changesJSON,
			&ipAddress,
			&userAgent,
			&log.Timestamp,
		)
		if err != nil {
			continue
		}

		if err := json.Unmarshal(changesJSON, &log.Changes); err != nil {
			continue
		}

		if ipAddress.Valid {
			log.IPAddress = ipAddress.String
		}
		if userAgent.Valid {
			log.UserAgent = userAgent.String
		}

		logs = append(logs, &log)
	}

	return logs, rows.Err()
}

func (r *PostgresAuditRepository) CountByUser(ctx context.Context, userID string) (int64, error) {
	const query = `SELECT COUNT(*) FROM audit_logs WHERE user_id = $1`
	var total int64
	if err := r.db.QueryRowContext(ctx, query, userID).Scan(&total); err != nil {
		return 0, fmt.Errorf("count audit logs failed: %w", err)
	}
	return total, nil
}

func (r *PostgresAuditRepository) Close() error {
	return r.db.Close()
}
