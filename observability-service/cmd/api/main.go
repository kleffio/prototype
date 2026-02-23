package main

import (
	"log"

	"prometheus-metrics-api/internal/adapters/in/http"
	"prometheus-metrics-api/internal/adapters/out/openai"
	"prometheus-metrics-api/internal/adapters/out/repository/loki"
	"prometheus-metrics-api/internal/adapters/out/repository/prometheus"
	"prometheus-metrics-api/internal/config"
	"prometheus-metrics-api/internal/core/ports"
	"prometheus-metrics-api/internal/core/services"
)

func main() {

	cfg := config.Load()

	log.Printf("Starting Prometheus Metrics API...")
	log.Printf("Environment: %s", cfg.Environment)
	log.Printf("Prometheus URL: %s", cfg.PrometheusURL)
	log.Printf("Loki URL: %s", cfg.LokiURL)
	log.Printf("User Service URL: %s", cfg.UserServiceURL)
	log.Printf("Project Service URL: %s", cfg.ProjectServiceURL)
	log.Printf("CPU Alert Threshold: %.1f", cfg.CPUAlertThreshold)
	log.Printf("Memory Alert Threshold: %.1f", cfg.MemoryAlertThreshold)
	log.Printf("Project Namespace Filtering Enabled: %t", cfg.ProjectNamespaceFilteringEnabled)
	log.Printf("Project Enrichment Max Concurrency: %d", cfg.ProjectEnrichmentMaxConcurrency)
	log.Printf("Insights Cache TTL: %s", cfg.InsightsCacheTTL)
	log.Printf("Insights Analysis Window: %s", cfg.InsightsAnalysisWindow)
	log.Printf("OpenAI Insights Enabled: %t", cfg.OpenAIAPIKey != "")
	log.Printf("Server Port: %s", cfg.ServerPort)

	prometheusClient := prometheus.NewPrometheusClient(cfg.PrometheusURL)

	metricsService := services.NewMetricsServiceWithDependencies(
		prometheusClient,
		cfg.ProjectServiceURL,
		cfg.UserServiceURL,
		cfg.CPUAlertThreshold,
		cfg.MemoryAlertThreshold,
		cfg.ProjectNamespaceFilteringEnabled,
		cfg.SystemNamespaceBlocklist,
		cfg.ProjectEnrichmentMaxConcurrency,
	)

	metricsHandler := http.NewMetricsHandler(metricsService)

	lokiClient := loki.NewLokiClient(cfg.LokiURL)

	logsService := services.NewLogsService(lokiClient)

	logsHandler := http.NewLogsHandler(logsService)

	exportService := services.NewExportService(lokiClient, prometheusClient)

	exportHandler := http.NewExportHandler(exportService)

	router := http.SetupRouter(metricsHandler, logsHandler, exportHandler, cfg.UserServiceURL)
	if insightsRepo, ok := prometheusClient.(ports.InsightsRepository); ok {
		var aiClient ports.AIInsightsClient
		if cfg.OpenAIAPIKey != "" {
			aiClient = openai.NewClient(cfg.OpenAIAPIKey, cfg.OpenAIModel, cfg.OpenAIBaseURL)
		}

		insightsService := services.NewInsightsServiceWithAI(
			insightsRepo,
			aiClient,
			cfg.InsightsCacheTTL,
			cfg.InsightsAnalysisWindow,
			cfg.SystemNamespaceBlocklist,
			cfg.InsightsAnomalyStdDev,
			cfg.SLOErrorRateTargetPercent,
			cfg.CPUCostPerCoreMonthUSD,
			cfg.MemoryCostPerGBMonthUSD,
		)
		insightsHandler := http.NewInsightsHandler(insightsService)
		http.RegisterAdminRoutes(router, insightsHandler, cfg.UserServiceURL)
	} else {
		log.Printf("warning: prometheus client does not implement insights repository; /api/v1/admin/insights disabled")
	}

	log.Printf("Server listening on port %s", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
