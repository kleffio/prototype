import { client } from "@shared/lib/client";

interface BatchDeleteRequest {
  targets: Array<{
    projectID: string;
    containerID: string;
  }>;
}

interface BatchDeleteResponse {
  deleted: string[];
  failed: Array<{
    containerID: string;
    reason: string;
  }>;
}

export default async function batchDeleteContainers(
  projectId: string,
  containerIds: string[]
): Promise<BatchDeleteResponse> {
  const targets = containerIds.map(containerId => ({
    projectID: projectId,
    containerID: containerId
  }));

  const requestBody: BatchDeleteRequest = {
    targets
  };

  const res = await client.post<BatchDeleteResponse>("/api/v1/containers/batch-delete", requestBody);
  return res.data;
}