package services

import (
	"context"

	"prometheus-metrics-api/internal/core/domain"
	"prometheus-metrics-api/internal/core/ports"
)

func enrichInsightsWithAI(ctx context.Context, client ports.AIInsightsClient, base *domain.InsightsResponse) {
	if client == nil || base == nil {
		return
	}

	aiResp, err := client.GenerateInsights(ctx, base)
	if err != nil || aiResp == nil {
		return
	}

	if len(aiResp.Recommendations) > 0 {
		base.Recommendations = mergeRecommendations(base.Recommendations, aiResp.Recommendations)
		base.Summary.TotalRecommendations = len(base.Recommendations)
	}
	if aiResp.SummaryNote != "" {
		base.CostSavings.Note = aiResp.SummaryNote
	}
}

func mergeRecommendations(base, extra []domain.InsightRecommendation) []domain.InsightRecommendation {
	out := make([]domain.InsightRecommendation, 0, len(base)+len(extra))
	seen := map[string]struct{}{}
	for _, rec := range base {
		key := rec.Type + "|" + rec.Resource + "|" + rec.Recommendation
		seen[key] = struct{}{}
		out = append(out, rec)
	}
	for _, rec := range extra {
		key := rec.Type + "|" + rec.Resource + "|" + rec.Recommendation
		if _, ok := seen[key]; ok {
			continue
		}
		if rec.Confidence == 0 {
			rec.Confidence = 0.7
		}
		out = append(out, rec)
	}
	return out
}
