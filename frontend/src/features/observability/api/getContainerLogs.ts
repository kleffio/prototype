import { client } from "@shared/lib/client";

export interface LogEntry {
  timestamp: string;
  log: string;
  labels: Record<string, string>;
}

export interface ContainerLogsData {
  containerName: string;
  logs: LogEntry[];
  logCount: number;
  errorCount: number;
  warningCount: number;
  hasMore: boolean;
}

export interface ContainerLogsResponse {
  projectId: string;
  totalLogs: number;
  totalErrors: number;
  totalWarnings: number;
  containers: ContainerLogsData[];
  timestamp: number;
}

export interface GetContainerLogsOptions {
  projectId: string;
  containerName: string;
  limit?: number;
  duration?: string;
  searchText?: string;
  severity?: string;
  start?: string;
  end?: string;
}

export async function getContainerLogs(
  optionsOrProjectId: string | GetContainerLogsOptions,
  containerName?: string
): Promise<LogEntry[]> {
  let options: GetContainerLogsOptions;

  if (typeof optionsOrProjectId === "string") {
    options = {
      projectId: optionsOrProjectId,
      containerName: containerName!,
      limit: 200,
      duration: "1h"
    };
  } else {
    options = optionsOrProjectId;
  }

  const { projectId, containerName: cName, ...rest } = options;

  const response = await client.post<ContainerLogsResponse>(
    "/api/v1/systems/logs/project-containers",
    {
      projectId,
      containerNames: [cName],
      limit: rest.limit || 200,
      duration: rest.duration || "1h",
      text: rest.searchText,
      severity: rest.severity,
      start: rest.start,
      end: rest.end
    }
  );

  // Extract just the logs from the first container
  const containerData = response.data.containers?.[0];
  return containerData?.logs || [];
}
