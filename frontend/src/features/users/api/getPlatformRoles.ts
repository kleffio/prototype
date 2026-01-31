import { client } from "@shared/lib/client";

export interface PlatformRolesResponse {
  roles: string[];
}

export async function getPlatformRoles(accessToken: string): Promise<PlatformRolesResponse> {
  const response = await client.get<PlatformRolesResponse>("/api/v1/users/me/platform-roles", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    withCredentials: true
  });

  return response.data;
}
