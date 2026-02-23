import { client } from "@shared/lib/client";
import type { RoleUpdateRequest, RoleUpdateResult } from "../types/admin";

export async function updateUserRoles(
  accessToken: string,
  userId: string,
  request: RoleUpdateRequest
): Promise<RoleUpdateResult> {
  const response = await client.patch<RoleUpdateResult>(
    `/api/v1/admin/users/${userId}/roles`,
    request,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      withCredentials: true
    }
  );

  return response.data;
}
