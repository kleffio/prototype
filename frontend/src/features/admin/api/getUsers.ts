import { client } from "@shared/lib/client";
import type { AdminUserListResult } from "../types/admin";

interface GetUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function getUsers(
  accessToken: string,
  params: GetUsersParams = {}
): Promise<AdminUserListResult> {
  const { page = 1, pageSize = 20, search = "" } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));
  if (search) {
    queryParams.set("search", search);
  }

  const response = await client.get<AdminUserListResult>(
    `/api/v1/admin/users?${queryParams.toString()}`,
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
