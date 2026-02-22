import { client } from "@shared/lib/client";
import type { AdminAuditLogResult, AdminAuditLogFilter } from "../types/admin";

interface GetAuditLogsParams {
  page?: number;
  pageSize?: number;
  filter?: AdminAuditLogFilter;
}

export async function getAdminAuditLogs(
  accessToken: string,
  params: GetAuditLogsParams = {}
): Promise<AdminAuditLogResult> {
  const { page = 1, pageSize = 20, filter = {} } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));

  if (filter.adminUserId) {
    queryParams.set("adminUserId", filter.adminUserId);
  }
  if (filter.action) {
    queryParams.set("action", filter.action);
  }
  if (filter.targetType) {
    queryParams.set("targetType", filter.targetType);
  }
  if (filter.targetId) {
    queryParams.set("targetId", filter.targetId);
  }
  if (filter.startDate) {
    queryParams.set("startDate", filter.startDate);
  }
  if (filter.endDate) {
    queryParams.set("endDate", filter.endDate);
  }

  const response = await client.get<AdminAuditLogResult>(
    `/api/v1/admin/audit-logs?${queryParams.toString()}`,
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