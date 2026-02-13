package domain

import "time"

type ExportFormat string

const (
	FormatCSV ExportFormat = "csv"
	FormatTXT ExportFormat = "txt"
	FormatPDF ExportFormat = "pdf"
)

type ExportParams struct {
	Format    ExportFormat
	From      time.Time
	To        time.Time
	ProjectID string
}
