package http

import (
	"log"
	"net/http"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"

	"github.com/gin-gonic/gin"
)

type LogsHandler struct {
	logsService ports.LogsService
}

func NewLogsHandler(logsService ports.LogsService) *LogsHandler {
	return &LogsHandler{
		logsService: logsService,
	}
}

type ProjectLogsRequest struct {
	ProjectID      string   `json:"projectId" binding:"required"`
	ContainerNames []string `json:"containerNames" binding:"required"`
	Limit          int      `json:"limit,omitempty"`
	Duration       string   `json:"duration,omitempty"`
	SearchText     string   `json:"text,omitempty"`
	Severity       string   `json:"severity,omitempty"`
	StartTime      string   `json:"start,omitempty"`
	EndTime        string   `json:"end,omitempty"`
}

func (h *LogsHandler) GetProjectContainerLogs(c *gin.Context) {
	log.Printf("[DEBUG] GetProjectContainerLogs endpoint called")

	var req ProjectLogsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[DEBUG] GetProjectContainerLogs request binding failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	log.Printf("[DEBUG] GetProjectContainerLogs request - ProjectID: %s, ContainerNames: %v, Limit: %d, Duration: %s",
		req.ProjectID, req.ContainerNames, req.Limit, req.Duration)

	if req.Limit <= 0 {
		req.Limit = 100
	}
	if req.Duration == "" && req.StartTime == "" {
		req.Duration = "1h"
	}

	options := domain.LogFilterOptions{
		ProjectID:      req.ProjectID,
		ContainerNames: req.ContainerNames,
		Limit:          req.Limit,
		Duration:       req.Duration,
		SearchText:     req.SearchText,
		Severity:       req.Severity,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
	}

	logs, err := h.logsService.GetProjectContainerLogs(c.Request.Context(), options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}
