import { client } from "@shared/lib/client";
import type { MetricExportFormat } from "../types/export";
import { downloadBlob } from "../utils/downloadBlob";

export async function exportMetrics(params: {
  format: MetricExportFormat;
  from: string;
  to: string;
  projectId?: string;
}): Promise<void> {
  const response = await client.get("/api/v1/systems/export/metrics", {
    params: {
      format: params.format,
      from: params.from,
      to: params.to,
      ...(params.projectId ? { projectId: params.projectId } : {})
    },
    responseType: "blob"
  });

  const contentDisposition = response.headers["content-disposition"] as string | undefined;
  const ext = params.format === "pdf" ? "pdf" : "csv";
  let filename = `metrics-${params.projectId || "cluster"}.${ext}`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  downloadBlob(response.data as Blob, filename);
}
