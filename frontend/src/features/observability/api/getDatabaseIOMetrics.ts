import { client } from "@shared/lib/client";

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
}

export interface DatabaseIOMetrics {
  diskReadBytesPerSec: number;
  diskWriteBytesPerSec: number;
  diskReadOpsPerSec: number;
  diskWriteOpsPerSec: number;
  networkReceiveBytesPerSec: number;
  networkTransmitBytesPerSec: number;
  networkReceiveOpsPerSec: number;
  networkTransmitOpsPerSec: number;
  diskReadHistory: TimeSeriesDataPoint[];
  diskWriteHistory: TimeSeriesDataPoint[];
  networkReceiveHistory: TimeSeriesDataPoint[];
  networkTransmitHistory: TimeSeriesDataPoint[];
  source: string;
}

export async function getDatabaseIOMetrics(
  duration = "1h",
  namespaces: string[] = []
): Promise<DatabaseIOMetrics> {
  const params: Record<string, string> = { duration };
  if (namespaces.length > 0) {
    params.namespaces = namespaces.join(",");
  }

  const response = await client.get<DatabaseIOMetrics>("/api/v1/systems/database-io", {
    params
  });
  return response.data;
}
