import { client } from "@shared/lib/client";
import type { InsightsResponse } from "../types/insights";

export async function getInsights(accessToken: string, window = "7d"): Promise<InsightsResponse> {
  const response = await client.get<InsightsResponse>("/api/v1/admin/insights", {
    params: { window },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    withCredentials: true
  });

  return response.data;
}
