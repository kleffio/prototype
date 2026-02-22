package config

import (
	"os"
	"strconv"
)

type Config struct {
	ServerPort           string
	PrometheusURL        string
	LokiURL              string
	Environment          string
	UserServiceURL       string
	ProjectServiceURL    string
	CPUAlertThreshold    float64
	MemoryAlertThreshold float64
}

func Load() *Config {
	return &Config{
		ServerPort:           getEnv("SERVER_PORT", "8080"),
		PrometheusURL:        getEnv("PROMETHEUS_URL", "http://localhost:9090"),
		LokiURL:              getEnv("LOKI_URL", "http://localhost:3100"),
		Environment:          getEnv("ENVIRONMENT", "development"),
		UserServiceURL:       getEnv("USER_SERVICE_URL", "http://user-service:8080"),
		ProjectServiceURL:    getEnv("PROJECT_MANAGEMENT_SERVICE_URL", "http://project-management-service:8080"),
		CPUAlertThreshold:    getEnvFloat("CPU_ALERT_THRESHOLD", 80),
		MemoryAlertThreshold: getEnvFloat("MEMORY_ALERT_THRESHOLD", 80),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return defaultValue
	}
	return parsed
}
