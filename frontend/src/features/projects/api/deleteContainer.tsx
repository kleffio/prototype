import { client } from "@shared/lib/client";

export default async function deleteContainer(containerId: string): Promise<void> {
  await client.delete(`/api/v1/containers/${containerId}`);
}
