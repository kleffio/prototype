import { client } from "@shared/lib/client";
import type { ProjectSortBy, TopProjectsResponse } from "@features/observability/types/metrics";

export async function getTopProjects(
  sort: ProjectSortBy = "cpu",
  limit = 10,
  duration = "1h"
): Promise<TopProjectsResponse> {
  const response = await client.get<TopProjectsResponse>("/api/v1/systems/projects", {
    params: {
      sort,
      limit,
      duration
    }
  });

  return response.data;
}
