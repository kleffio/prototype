package http

import (
	"net/http"

	"prometheus-metrics-api/internal/core/ports"

	"github.com/gin-gonic/gin"
)

type InsightsHandler struct {
	insightsService ports.InsightsService
}

func NewInsightsHandler(insightsService ports.InsightsService) *InsightsHandler {
	return &InsightsHandler{insightsService: insightsService}
}

func (h *InsightsHandler) GetInsights(c *gin.Context) {
	window := c.DefaultQuery("window", "7d")

	response, err := h.insightsService.GetAdminInsights(c.Request.Context(), window)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to generate insights",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}
