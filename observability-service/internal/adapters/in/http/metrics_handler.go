package http

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"prometheus-metrics-api/internal/core/ports"

	"github.com/gin-gonic/gin"
)

type MetricsHandler struct {
	metricsService ports.MetricsService
}

const authTokenContextKey = "authorization_token"

func NewMetricsHandler(metricsService ports.MetricsService) *MetricsHandler {
	return &MetricsHandler{
		metricsService: metricsService,
	}
}

func (h *MetricsHandler) GetAllMetrics(c *gin.Context) {
	duration := c.DefaultQuery("duration", "1h")

	metrics, err := h.metricsService.GetAllMetrics(c.Request.Context(), duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

func (h *MetricsHandler) GetOverview(c *gin.Context) {
	overview, err := h.metricsService.GetClusterOverview(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, overview)
}

func (h *MetricsHandler) GetRequestsMetric(c *gin.Context) {
	duration := c.DefaultQuery("duration", "1h")

	metric, err := h.metricsService.GetRequestsMetric(c.Request.Context(), duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metric)
}

func (h *MetricsHandler) GetPodsMetric(c *gin.Context) {
	duration := c.DefaultQuery("duration", "1h")

	metric, err := h.metricsService.GetPodsMetric(c.Request.Context(), duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metric)
}

func (h *MetricsHandler) GetNodesMetric(c *gin.Context) {
	duration := c.DefaultQuery("duration", "1h")

	metric, err := h.metricsService.GetNodesMetric(c.Request.Context(), duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metric)
}

func (h *MetricsHandler) GetTenantsMetric(c *gin.Context) {
	duration := c.DefaultQuery("duration", "1h")

	metric, err := h.metricsService.GetTenantsMetric(c.Request.Context(), duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metric)
}

func (h *MetricsHandler) GetCPUUtilization(c *gin.Context) {
	duration := c.DefaultQuery("duration", "1h")

	utilization, err := h.metricsService.GetCPUUtilization(c.Request.Context(), duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, utilization)
}

func (h *MetricsHandler) GetMemoryUtilization(c *gin.Context) {
	duration := c.DefaultQuery("duration", "1h")

	utilization, err := h.metricsService.GetMemoryUtilization(c.Request.Context(), duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, utilization)
}

func (h *MetricsHandler) GetNodes(c *gin.Context) {
	nodes, err := h.metricsService.GetNodes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, nodes)
}

func (h *MetricsHandler) GetNamespaces(c *gin.Context) {
	namespaces, err := h.metricsService.GetNamespaces(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, namespaces)
}

func (h *MetricsHandler) GetTopProjects(c *gin.Context) {
	sortBy := c.Query("sort")
	if sortBy == "" {
		sortBy = c.DefaultQuery("sortBy", "cpu")
	}

	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err != nil || parsedLimit < 1 || parsedLimit > 50 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "limit must be an integer between 1 and 50"})
			return
		}
		limit = parsedLimit
	}

	duration := c.DefaultQuery("duration", "1h")

	ctx := c.Request.Context()
	if token := extractBearerToken(c.Request); token != "" {
		ctx = context.WithValue(ctx, authTokenContextKey, token)
	}

	projects, err := h.metricsService.GetTopProjects(ctx, sortBy, limit, duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, projects)
}

func (h *MetricsHandler) GetDatabaseIOMetrics(c *gin.Context) {
	duration := c.DefaultQuery("duration", "1h")
	namespacesStr := c.Query("namespaces")

	var namespaces []string
	if namespacesStr != "" {
		namespaces = strings.Split(namespacesStr, ",")
	}

	metrics, err := h.metricsService.GetDatabaseIOMetrics(c.Request.Context(), duration, namespaces)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

func (h *MetricsHandler) GetProjectUsageMetrics(c *gin.Context) {
	projectID := c.Param("projectID")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectID is required"})
		return
	}

	metrics, err := h.metricsService.GetProjectUsageMetrics(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

func (h *MetricsHandler) GetProjectUsageMetricsWithDays(c *gin.Context) {
	projectID := c.Param("projectID")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectID is required"})
		return
	}

	daysStr := c.Param("days")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "days must be a positive integer"})
		return
	}

	metrics, err := h.metricsService.GetProjectUsageMetricsWithDays(c.Request.Context(), projectID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

func (h *MetricsHandler) GetProjectTotalUsageMetrics(c *gin.Context) {
	projectID := c.Param("projectID")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectID is required"})
		return
	}

	metrics, err := h.metricsService.GetProjectTotalUsageMetrics(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

func (h *MetricsHandler) GetUptimeMetrics(c *gin.Context) {
	duration := c.DefaultQuery("duration", "24h")

	metrics, err := h.metricsService.GetUptimeMetrics(c.Request.Context(), duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

func (h *MetricsHandler) GetSystemUptime(c *gin.Context) {
	uptime, err := h.metricsService.GetSystemUptime(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"uptimeSeconds": uptime,
		"uptime":        formatUptimeSimple(uptime),
	})
}

func formatUptimeSimple(seconds float64) string {
	days := int(seconds / 86400)
	hours := int(seconds/3600) % 24
	minutes := int(seconds/60) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	} else if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	}
	return fmt.Sprintf("%dm", minutes)
}
