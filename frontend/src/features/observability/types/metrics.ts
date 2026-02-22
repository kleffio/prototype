export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
}

export interface ClusterOverview {
  totalNodes: number;
  runningNodes: number;
  totalPods: number;
  totalNamespaces: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  uptimeSeconds?: number;
  uptimeFormatted?: string;
}

export interface MetricCard {
  title: string;
  value: string;
  rawValue: number;
  changePercent: string;
  changeLabel: string;
  status: "excellent" | "good" | "warning" | "critical";
  sparkline: TimeSeriesDataPoint[];
}

export interface ResourceUtilization {
  currentValue: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
  history: TimeSeriesDataPoint[];
}

export interface NodeMetric {
  name: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  podCount: number;
  status: string;
  uptimeSeconds?: number;
  uptimeFormatted?: string;
}

export interface NamespaceMetric {
  name: string;
  podCount: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface DatabaseMetrics {
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

export type ProjectSortBy = "cpu" | "memory" | "disk";

export interface ResourceAlert {
  type: "cpu" | "memory";
  currentValue: number;
  threshold: number;
  message: string;
}

export interface ProjectRanking {
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerName: string;
  namespace: string;
  cpuRequestCores: number;
  memoryUsageGB: number;
  diskReadBytesPerSec: number;
  diskWriteBytesPerSec: number;
  percentageOfClusterCpu: number;
  percentageOfClusterMemory: number;
}

export interface TopProjectsResponse {
  projects: ProjectRanking[];
  totalClusterCpuCores: number;
  totalClusterMemoryGB: number;
  currentCpuPercent: number;
  currentMemoryPercent: number;
  alert?: ResourceAlert;
}
