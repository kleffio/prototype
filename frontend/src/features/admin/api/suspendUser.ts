import { client } from "@shared/lib/client";
import type { AdminUserDetail, SuspendRequest } from "../types/admin";

export async function suspendUser(
  accessToken: string,
  userId: string,
  request: SuspendRequest
): Promise<AdminUserDetail> {
  const response = await client.patch<AdminUserDetail>(
    `/api/v1/admin/users/${userId}/suspend`,
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
