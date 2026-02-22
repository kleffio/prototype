package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

// HealthHandler handles health check endpoints
type HealthHandler struct {
	db *sql.DB
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(db *sql.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// ServiceHealth represents the health status of a service
type ServiceHealth struct {
	Name      string                 `json:"name"`
	Status    string                 `json:"status"`
	Latency   int64                  `json:"latencyMs"`
	Timestamp string                 `json:"timestamp"`
	Details   map[string]interface{} `json:"details,omitempty"`
	Error     string                 `json:"error,omitempty"`
}

// SystemHealthResponse represents the overall system health
type SystemHealthResponse struct {
	Status    string          `json:"status"`
	Timestamp string          `json:"timestamp"`
	Services  []ServiceHealth `json:"services"`
}

// GetSystemHealth returns the overall system health status
func (h *HealthHandler) GetSystemHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	services := []ServiceHealth{}
	allHealthy := true

	// Check database connectivity
	dbHealth := h.checkDatabase()
	services = append(services, dbHealth)
	if dbHealth.Status != "healthy" {
		allHealthy = false
	}

	// Check observability service itself
	obsHealth := ServiceHealth{
		Name:      "observability-service",
		Status:    "healthy",
		Latency:   0,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Details: map[string]interface{}{
			"version": "1.0.0",
		},
	}
	services = append(services, obsHealth)

	// Determine overall status
	status := "healthy"
	if !allHealthy {
		status = "degraded"
	}

	response := SystemHealthResponse{
		Status:    status,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Services:  services,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// checkDatabase checks the database connectivity
func (h *HealthHandler) checkDatabase() ServiceHealth {
	start := time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var status string
	var errMsg string
	var details map[string]interface{}

	err := h.db.PingContext(ctx)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		status = "unhealthy"
		errMsg = err.Error()
	} else {
		status = "healthy"

		// Get database stats
		stats := h.db.Stats()
		details = map[string]interface{}{
			"openConnections": stats.OpenConnections,
			"idle":            stats.Idle,
			"inUse":           stats.InUse,
		}
	}

	return ServiceHealth{
		Name:      "database",
		Status:    status,
		Latency:   latency,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Details:   details,
		Error:     errMsg,
	}
}
