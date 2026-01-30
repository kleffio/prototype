package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter(handler *MetricsHandler, logsHandler *LogsHandler) *gin.Engine {
	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"https://kleff.io", "https://api.kleff.io", "http://localhost:5173", "http://localhost:8080", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type", "Cache-Control", "Pragma", "Expires"},
		AllowCredentials: true,
	}))

	api := router.Group("/api/v1/systems")
	api.Use(jwtAuthMiddleware()) // Apply JWT middleware to all API routes
	{
		api.GET("/metrics", handler.GetAllMetrics)
		api.GET("/overview", handler.GetOverview)

		api.GET("/requests-metric", handler.GetRequestsMetric)
		api.GET("/pods-metric", handler.GetPodsMetric)
		api.GET("/nodes-metric", handler.GetNodesMetric)
		api.GET("/tenants-metric", handler.GetTenantsMetric)

		api.GET("/cpu", handler.GetCPUUtilization)
		api.GET("/memory", handler.GetMemoryUtilization)

		api.GET("/nodes", handler.GetNodes)
		api.GET("/namespaces", handler.GetNamespaces)

		api.GET("/database-io", handler.GetDatabaseIOMetrics)

		api.POST("/project-metrics", handler.GetProjectUsageMetrics)

		api.POST("/logs/project-containers", logsHandler.GetProjectContainerLogs)
		api.GET("/projects/:projectID/usage/:days", handler.GetProjectUsageMetricsWithDays)
		api.GET("/projects/:projectID/usage", handler.GetProjectUsageMetrics)
		api.GET("/projects/:projectID/totalusage", handler.GetProjectTotalUsageMetrics)

		api.GET("/uptime", handler.GetUptimeMetrics)
		api.GET("/system-uptime", handler.GetSystemUptime)
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})

	return router
}

// jwtAuthMiddleware validates JWT tokens and checks user deactivation status
func jwtAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearerToken(c.Request)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing or invalid authorization header"})
			c.Abort()
			return
		}

		// Check user status via user-service
		userID, err := extractUserIDFromToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		isActive, err := checkUserStatus(userID)
		if err != nil || !isActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "account has been deactivated"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Next()
	}
}

// extractBearerToken extracts the bearer token from Authorization header
func extractBearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(auth, "Bearer ")
}

// extractUserIDFromToken extracts user ID from JWT token (simplified, assumes JWT format)
func extractUserIDFromToken(token string) (string, error) {
	// Make a call to user-service to validate and get user ID
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("GET", "http://user-service:8080/api/v1/users/me", nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to validate token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token validation failed")
	}

	var user struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return "", fmt.Errorf("failed to decode user response: %w", err)
	}

	return user.ID, nil
}

// checkUserStatus checks if user is active via user-service
func checkUserStatus(userID string) (bool, error) {
	url := fmt.Sprintf("http://user-service:8080/api/v1/users/status/%s", userID)
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return false, fmt.Errorf("failed to check user status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("user status check failed")
	}

	var status struct {
		Active bool `json:"active"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return false, fmt.Errorf("failed to decode status response: %w", err)
	}

	return status.Active, nil
}
