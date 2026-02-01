//go:build !test
// +build !test

package config

import (
	"fmt"
	"os"
)

type Config struct {
	HTTPAddr         string
	AuthentikBaseURL string

	PostgresUserDSN  string
	PostgresAuditDSN string

	DefaultAdminEmail string
}

func FromEnv() (*Config, error) {
	cfg := &Config{
		HTTPAddr:          getEnv("HTTP_ADDR", ":8080"),
		AuthentikBaseURL:  getEnv("AUTHENTIK_BASE_URL"),
		PostgresUserDSN:   os.Getenv("POSTGRES_USER_DSN"),
		PostgresAuditDSN:  os.Getenv("POSTGRES_AUDIT_DSN"),
		DefaultAdminEmail: os.Getenv("DEFAULT_ADMIN_EMAIL"),
	}

	if cfg.PostgresUserDSN == "" {
		return nil, fmt.Errorf("POSTGRES_USER_DSN environment variable is required")
	}

	return cfg, nil
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
