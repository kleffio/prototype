package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"
)

const defaultOpenAIBaseURL = "https://api.openai.com/v1"

type client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
	model      string
}

func NewClient(apiKey, model, baseURL string) ports.AIInsightsClient {
	if strings.TrimSpace(baseURL) == "" {
		baseURL = defaultOpenAIBaseURL
	}
	if strings.TrimSpace(model) == "" {
		model = "gpt-4o-mini"
	}
	return &client{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    strings.TrimRight(baseURL, "/"),
		apiKey:     strings.TrimSpace(apiKey),
		model:      model,
	}
}

func (c *client) GenerateInsights(ctx context.Context, input *domain.InsightsResponse) (*domain.AIInsightsResponse, error) {
	if c.apiKey == "" || input == nil {
		return nil, fmt.Errorf("openai client not configured")
	}

	payload, err := buildPromptPayload(input)
	if err != nil {
		return nil, err
	}

	body := map[string]any{
		"model": c.model,
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a Kubernetes SRE assistant. Return valid JSON only.",
			},
			{
				"role": "user",
				"content": "Enhance these infrastructure insights with concise, actionable recommendations. " +
					"Output JSON schema: {\"recommendations\":[{\"type\":\"...\",\"severity\":\"low|medium|high|critical\",\"resource\":\"...\",\"current\":\"...\",\"recommendation\":\"...\",\"impact\":\"...\",\"confidence\":0.0,\"basedOn\":\"...\"}],\"summaryNote\":\"...\"}. Data: " + payload,
			},
		},
		"temperature": 0.2,
	}

	encoded, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(encoded))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("openai returned status %d", resp.StatusCode)
	}

	var completion struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&completion); err != nil {
		return nil, err
	}
	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("openai response missing choices")
	}

	content := stripCodeFence(completion.Choices[0].Message.Content)
	var out domain.AIInsightsResponse
	if err := json.Unmarshal([]byte(content), &out); err != nil {
		return nil, err
	}

	return &out, nil
}

func buildPromptPayload(input *domain.InsightsResponse) (string, error) {
	type compact struct {
		Summary         domain.InsightsSummary         `json:"summary"`
		CostSavings     domain.CostSavingsInsight      `json:"costSavings"`
		SLOStatus       domain.SLOStatus               `json:"sloStatus"`
		Recommendations []domain.InsightRecommendation `json:"recommendations"`
		Anomalies       []domain.InsightAnomaly        `json:"anomalies"`
	}
	encoded, err := json.Marshal(compact{
		Summary:         input.Summary,
		CostSavings:     input.CostSavings,
		SLOStatus:       input.SLOStatus,
		Recommendations: input.Recommendations,
		Anomalies:       input.Anomalies,
	})
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func stripCodeFence(content string) string {
	trimmed := strings.TrimSpace(content)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	return strings.TrimSpace(trimmed)
}
