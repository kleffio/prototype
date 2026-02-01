import { client } from "@shared/lib/client";

interface BatchDeleteTarget {
  projectID: string;
  containerID: string;
}

interface BatchDeleteRequest {
  targets: BatchDeleteTarget[];
}

interface BatchDeleteResponse {
  deleted: string[];
  failed: Array<{
    containerID: string;
    reason: string;
  }>;
}

export default async function batchDeleteContainers(
  projectID: string,
  containerIDs: string[]
): Promise<BatchDeleteResponse> {
  const targets: BatchDeleteTarget[] = containerIDs.map(containerID => ({
    projectID,
    containerID
  }));

  const request: BatchDeleteRequest = { targets };
  
  const res = await client.post<BatchDeleteResponse>("/api/v1/containers/batch-delete", request);
  return res.data;
}