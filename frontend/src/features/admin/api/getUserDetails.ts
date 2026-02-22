import { client } from "@shared/lib/client";
import type { AdminUserDetail } from "../types/admin";

export async function getUserDetails(
  accessToken: string,
  userId: string
): Promise<AdminUserDetail> {
  const response = await client.get<AdminUserDetail>(
    `/api/v1/admin/users/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      },
      withCredentials: true
    }
  );

  return response.data;
}