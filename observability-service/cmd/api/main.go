package main

import (
	"log"

	"prometheus-metrics-api/internal/adapters/in/http"
	"prometheus-metrics-api/internal/adapters/out/repository/loki"
	"prometheus-metrics-api/internal/adapters/out/repository/prometheus"
	"prometheus-metrics-api/internal/config"
	"prometheus-metrics-api/internal/core/services"
)

func main() {

	cfg := config.Load()

	log.Printf("Starting Prometheus Metrics API...")
	log.Printf("Environment: %s", cfg.Environment)
	log.Printf("Prometheus URL: %s", cfg.PrometheusURL)
	log.Printf("Loki URL: %s", cfg.LokiURL)
	log.Printf("User Service URL: %s", cfg.UserServiceURL)
	log.Printf("Server Port: %s", cfg.ServerPort)

	prometheusClient := prometheus.NewPrometheusClient(cfg.PrometheusURL)

	metricsService := services.NewMetricsService(prometheusClient)

	metricsHandler := http.NewMetricsHandler(metricsService)

	lokiClient := loki.NewLokiClient(cfg.LokiURL)

	logsService := services.NewLogsService(lokiClient)

	logsHandler := http.NewLogsHandler(logsService)

	exportService := services.NewExportService(lokiClient, prometheusClient)

	exportHandler := http.NewExportHandler(exportService)

	router := http.SetupRouter(metricsHandler, logsHandler, exportHandler, cfg.UserServiceURL)

	log.Printf("Server listening on port %s", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
