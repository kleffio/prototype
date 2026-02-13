import { client } from "@shared/lib/client";
import type { LogExportFormat } from "../types/export";
import { downloadBlob } from "../utils/downloadBlob";

export async function exportLogs(params: {
  projectId: string;
  format: LogExportFormat;
  from: string;
  to: string;
}): Promise<void> {
  const response = await client.get("/api/v1/systems/export/logs", {
    params: {
      projectId: params.projectId,
      format: params.format,
      from: params.from,
      to: params.to
    },
    responseType: "blob"
  });

  const contentDisposition = response.headers["content-disposition"] as string | undefined;
  let filename = `logs-${params.projectId}.${params.format}`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  downloadBlob(response.data as Blob, filename);
}
