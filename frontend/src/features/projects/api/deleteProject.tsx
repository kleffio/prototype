import { client } from "@shared/lib/client";

export default async function deleteProject(projectId: string): Promise<void> {
  const res = await client.delete(`/api/v1/projects/${projectId}`);
  return res.data;
}
