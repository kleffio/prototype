import { client } from "@shared/lib/client";

export async function getProjectCollaborators(projectId: string) {
  const response = await client.get(`/api/v1/projects/${projectId}/collaborators`);
  return response.data;
}

export async function deleteCollaborator(projectId: string, userId: string): Promise<void> {
  await client.delete(`/api/v1/projects/${projectId}/collaborators/${userId}`);
}

export async function updateCollaboratorRole(
  projectId: string,
  userId: string,
  role: "ADMIN" | "DEVELOPER" | "VIEWER"
): Promise<void> {
  await client.put(`/api/v1/projects/${projectId}/collaborators/${userId}`, { role });
}
