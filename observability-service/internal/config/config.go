package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	ServerPort                       string
	PrometheusURL                    string
	LokiURL                          string
	Environment                      string
	UserServiceURL                   string
	ProjectServiceURL                string
	CPUAlertThreshold                float64
	MemoryAlertThreshold             float64
	ProjectNamespaceFilteringEnabled bool
	SystemNamespaceBlocklist         []string
	ProjectEnrichmentMaxConcurrency  int
	InsightsCacheTTL                 time.Duration
	InsightsAnalysisWindow           string
	InsightsAnomalyStdDev            float64
	SLOErrorRateTargetPercent        float64
	CPUCostPerCoreMonthUSD           float64
	MemoryCostPerGBMonthUSD          float64
	OpenAIAPIKey                     string
	OpenAIModel                      string
	OpenAIBaseURL                    string
}

func Load() *Config {
	return &Config{
		ServerPort:                       getEnv("SERVER_PORT", "8080"),
		PrometheusURL:                    getEnv("PROMETHEUS_URL", "http://localhost:9090"),
		LokiURL:                          getEnv("LOKI_URL", "http://localhost:3100"),
		Environment:                      getEnv("ENVIRONMENT", "development"),
		UserServiceURL:                   getEnv("USER_SERVICE_URL", "http://user-service:8080"),
		ProjectServiceURL:                getEnv("PROJECT_MANAGEMENT_SERVICE_URL", "http://project-management-service:8080"),
		CPUAlertThreshold:                getEnvFloat("CPU_ALERT_THRESHOLD", 80),
		MemoryAlertThreshold:             getEnvFloat("MEMORY_ALERT_THRESHOLD", 80),
		ProjectNamespaceFilteringEnabled: getEnvBool("PROJECT_NAMESPACE_FILTERING_ENABLED", true),
		SystemNamespaceBlocklist: getEnvList(
			"SYSTEM_NAMESPACE_BLOCKLIST",
			[]string{"default", "kube-system", "kube-public", "kube-node-lease", "monitoring", "ingress-nginx", "loki", "prometheus", "cert-manager"},
		),
		ProjectEnrichmentMaxConcurrency: getEnvInt("PROJECT_ENRICHMENT_MAX_CONCURRENCY", 8),
		InsightsCacheTTL:                getEnvDuration("INSIGHTS_CACHE_TTL", 5*time.Minute),
		InsightsAnalysisWindow:          getEnv("INSIGHTS_ANALYSIS_WINDOW", "7d"),
		InsightsAnomalyStdDev:           getEnvFloat("INSIGHTS_ANOMALY_STDDEV", 2.0),
		SLOErrorRateTargetPercent:       getEnvFloat("SLO_ERROR_RATE_TARGET_PERCENT", 1.0),
		CPUCostPerCoreMonthUSD:          getEnvFloat("CPU_COST_PER_CORE_MONTH_USD", 8.0),
		MemoryCostPerGBMonthUSD:         getEnvFloat("MEMORY_COST_PER_GB_MONTH_USD", 1.5),
		OpenAIAPIKey:                    getEnv("OPENAI_API_KEY", ""),
		OpenAIModel:                     getEnv("OPENAI_MODEL", "gpt-4o-mini"),
		OpenAIBaseURL:                   getEnv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
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

func getEnvBool(key string, defaultValue bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return defaultValue
	}

	switch value {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return defaultValue
	}
}

func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func getEnvList(key string, defaultValue []string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		out := make([]string, len(defaultValue))
		copy(out, defaultValue)
		return out
	}

	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	if len(out) == 0 {
		out = make([]string, len(defaultValue))
		copy(out, defaultValue)
	}
	return out
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}

	parsed, err := time.ParseDuration(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}
