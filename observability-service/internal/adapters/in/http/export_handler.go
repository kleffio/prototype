package http

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"

	"github.com/gin-gonic/gin"
)

type ExportHandler struct {
	exportService ports.ExportService
}

func NewExportHandler(exportService ports.ExportService) *ExportHandler {
	return &ExportHandler{
		exportService: exportService,
	}
}

func (h *ExportHandler) ExportLogs(c *gin.Context) {
	format := c.DefaultQuery("format", "csv")
	fromStr := c.Query("from")
	toStr := c.Query("to")
	projectID := c.Query("projectId")

	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId is required"})
		return
	}

	if format != "csv" && format != "txt" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid format: supported formats are csv, txt"})
		return
	}

	from, to, err := parseTimeRange(fromStr, toStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	params := domain.ExportParams{
		Format:    domain.ExportFormat(format),
		From:      from,
		To:        to,
		ProjectID: projectID,
	}

	log.Printf("[DEBUG] ExportLogs request - ProjectID: %s, Format: %s, From: %s, To: %s",
		projectID, format, from.Format(time.RFC3339), to.Format(time.RFC3339))

	data, filename, err := h.exportService.ExportLogs(c.Request.Context(), params)
	if err != nil {
		log.Printf("[ERROR] ExportLogs failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	contentType := getContentType(domain.ExportFormat(format))
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Data(http.StatusOK, contentType, data)
}

func (h *ExportHandler) ExportMetrics(c *gin.Context) {
	format := c.DefaultQuery("format", "csv")
	fromStr := c.Query("from")
	toStr := c.Query("to")
	projectID := c.Query("projectId")

	if format != "csv" && format != "pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid format: supported formats are csv, pdf"})
		return
	}

	from, to, err := parseTimeRange(fromStr, toStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	params := domain.ExportParams{
		Format:    domain.ExportFormat(format),
		From:      from,
		To:        to,
		ProjectID: projectID,
	}

	log.Printf("[DEBUG] ExportMetrics request - Format: %s, From: %s, To: %s, ProjectID: %s",
		format, from.Format(time.RFC3339), to.Format(time.RFC3339), projectID)

	data, filename, err := h.exportService.ExportMetrics(c.Request.Context(), params)
	if err != nil {
		log.Printf("[ERROR] ExportMetrics failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	contentType := getContentType(domain.ExportFormat(format))
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Data(http.StatusOK, contentType, data)
}

func parseTimeRange(fromStr, toStr string) (time.Time, time.Time, error) {
	now := time.Now()

	var from, to time.Time

	if toStr == "" {
		to = now
	} else {
		parsed, err := time.Parse(time.RFC3339, toStr)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid 'to' timestamp: must be ISO 8601 format (e.g., 2024-01-01T00:00:00Z)")
		}
		to = parsed
	}

	if fromStr == "" {
		from = to.Add(-1 * time.Hour)
	} else {
		parsed, err := time.Parse(time.RFC3339, fromStr)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid 'from' timestamp: must be ISO 8601 format (e.g., 2024-01-01T00:00:00Z)")
		}
		from = parsed
	}

	if from.After(to) {
		return time.Time{}, time.Time{}, fmt.Errorf("'from' timestamp must be before 'to' timestamp")
	}

	return from, to, nil
}

func getContentType(format domain.ExportFormat) string {
	switch format {
	case domain.FormatCSV:
		return "text/csv"
	case domain.FormatTXT:
		return "text/plain"
	case domain.FormatPDF:
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}
