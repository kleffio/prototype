import { client } from "@shared/lib/client";
import type { Container } from "@features/projects/types/Container";

interface ContainerResponse {
  containerID?: string;
  containerId?: string;
  name: string;
  status?: string;
  image: string;
  ports?: string[];
  port?: number;
  createdAt: string;
  repoUrl?: string;
  branch?: string;
  envVariables?: Record<string, string>;
}

export default async function fetchProjectContainers(projectId: string): Promise<Container[]> {
  try {
    const res = await client.get<ContainerResponse[]>(`/api/v1/containers/${projectId}`);
    // Transform the API response to match the Container type
    const containers: Container[] = (res.data ?? []).map((item) => ({
      containerId: item.containerID || item.containerId || "",
      name: item.name,
      status: item.status || "Unknown",
      image: item.image,
      ports: item.ports || (item.port ? [item.port.toString()] : []),
      createdAt: item.createdAt,
      repoUrl: item.repoUrl || "",
      branch: item.branch || "main",
      envVariables: item.envVariables || {}
    }));
    return containers;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    // If the API returns 404 (no containers found), treat it as successful empty response
    if (err.response?.status === 404) {
      return [];
    }
    // Re-throw other errors
    throw error;
  }
}
