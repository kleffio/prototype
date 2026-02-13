package http

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestParseTimeRange_Defaults(t *testing.T) {
	from, to, err := parseTimeRange("", "")
	assert.NoError(t, err)
	assert.WithinDuration(t, time.Now(), to, 2*time.Second)
	assert.WithinDuration(t, time.Now().Add(-1*time.Hour), from, 2*time.Second)
}

func TestParseTimeRange_ValidTimestamps(t *testing.T) {
	fromStr := "2024-01-15T10:00:00Z"
	toStr := "2024-01-15T11:00:00Z"

	from, to, err := parseTimeRange(fromStr, toStr)
	assert.NoError(t, err)
	assert.Equal(t, 2024, from.Year())
	assert.Equal(t, time.January, from.Month())
	assert.Equal(t, 15, from.Day())
	assert.Equal(t, 10, from.Hour())
	assert.Equal(t, 11, to.Hour())
}

func TestParseTimeRange_InvalidFrom(t *testing.T) {
	_, _, err := parseTimeRange("not-a-date", "2024-01-15T11:00:00Z")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid 'from' timestamp")
}

func TestParseTimeRange_InvalidTo(t *testing.T) {
	_, _, err := parseTimeRange("2024-01-15T10:00:00Z", "not-a-date")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid 'to' timestamp")
}

func TestParseTimeRange_FromAfterTo(t *testing.T) {
	_, _, err := parseTimeRange("2024-01-15T12:00:00Z", "2024-01-15T10:00:00Z")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "'from' timestamp must be before 'to'")
}

func TestGetContentType(t *testing.T) {
	assert.Equal(t, "text/csv", getContentType("csv"))
	assert.Equal(t, "text/plain", getContentType("txt"))
	assert.Equal(t, "application/pdf", getContentType("pdf"))
	assert.Equal(t, "application/octet-stream", getContentType("unknown"))
}
