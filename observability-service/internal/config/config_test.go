package config

import (
	"os"
	"testing"
)

func TestLoad_WithEnvironmentVariables(t *testing.T) {
	// Set environment variables
	_ = os.Setenv("SERVER_PORT", "8090")
	_ = os.Setenv("PROMETHEUS_URL", "http://prometheus:9090")
	_ = os.Setenv("LOKI_URL", "http://loki:3100")
	_ = os.Setenv("ENVIRONMENT", "production")
	_ = os.Setenv("PROJECT_NAMESPACE_FILTERING_ENABLED", "false")
	_ = os.Setenv("SYSTEM_NAMESPACE_BLOCKLIST", "kube-system,monitoring")
	_ = os.Setenv("PROJECT_ENRICHMENT_MAX_CONCURRENCY", "4")

	defer func() {
		// Clean up environment variables
		_ = os.Unsetenv("SERVER_PORT")
		_ = os.Unsetenv("PROMETHEUS_URL")
		_ = os.Unsetenv("LOKI_URL")
		_ = os.Unsetenv("ENVIRONMENT")
		_ = os.Unsetenv("PROJECT_NAMESPACE_FILTERING_ENABLED")
		_ = os.Unsetenv("SYSTEM_NAMESPACE_BLOCKLIST")
		_ = os.Unsetenv("PROJECT_ENRICHMENT_MAX_CONCURRENCY")
	}()

	config := Load()

	if config.ServerPort != "8090" {
		t.Errorf("Expected ServerPort to be '8090', got '%s'", config.ServerPort)
	}

	if config.PrometheusURL != "http://prometheus:9090" {
		t.Errorf("Expected PrometheusURL to be 'http://prometheus:9090', got '%s'", config.PrometheusURL)
	}

	if config.LokiURL != "http://loki:3100" {
		t.Errorf("Expected LokiURL to be 'http://loki:3100', got '%s'", config.LokiURL)
	}

	if config.Environment != "production" {
		t.Errorf("Expected Environment to be 'production', got '%s'", config.Environment)
	}

	if config.ProjectNamespaceFilteringEnabled {
		t.Errorf("Expected ProjectNamespaceFilteringEnabled to be false")
	}

	if config.ProjectEnrichmentMaxConcurrency != 4 {
		t.Errorf("Expected ProjectEnrichmentMaxConcurrency to be 4, got '%d'", config.ProjectEnrichmentMaxConcurrency)
	}

	if len(config.SystemNamespaceBlocklist) != 2 {
		t.Errorf("Expected SystemNamespaceBlocklist length to be 2, got '%d'", len(config.SystemNamespaceBlocklist))
	}
}

func TestLoad_WithoutEnvironmentVariables(t *testing.T) {
	// Ensure environment variables are not set
	_ = os.Unsetenv("SERVER_PORT")
	_ = os.Unsetenv("PROMETHEUS_URL")
	_ = os.Unsetenv("LOKI_URL")
	_ = os.Unsetenv("ENVIRONMENT")

	config := Load()

	if config.ServerPort != "8080" {
		t.Errorf("Expected ServerPort to be '8080', got '%s'", config.ServerPort)
	}

	if config.PrometheusURL != "http://localhost:9090" {
		t.Errorf("Expected PrometheusURL to be 'http://localhost:9090', got '%s'", config.PrometheusURL)
	}

	if config.LokiURL != "http://localhost:3100" {
		t.Errorf("Expected LokiURL to be 'http://localhost:3100', got '%s'", config.LokiURL)
	}

	if config.Environment != "development" {
		t.Errorf("Expected Environment to be 'development', got '%s'", config.Environment)
	}
}

func TestGetEnv_WithValue(t *testing.T) {
	_ = os.Setenv("TEST_KEY", "test_value")
	defer func() {
		_ = os.Unsetenv("TEST_KEY")
	}()

	result := getEnv("TEST_KEY", "default_value")
	if result != "test_value" {
		t.Errorf("Expected 'test_value', got '%s'", result)
	}
}

func TestGetEnv_WithoutValue(t *testing.T) {
	_ = os.Unsetenv("NONEXISTENT_KEY")

	result := getEnv("NONEXISTENT_KEY", "default_value")
	if result != "default_value" {
		t.Errorf("Expected 'default_value', got '%s'", result)
	}
}

func TestGetEnv_WithEmptyValue(t *testing.T) {
	_ = os.Setenv("EMPTY_KEY", "")
	defer func() {
		_ = os.Unsetenv("EMPTY_KEY")
	}()

	result := getEnv("EMPTY_KEY", "default_value")
	if result != "default_value" {
		t.Errorf("Expected 'default_value', got '%s'", result)
	}
}
