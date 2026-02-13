export interface ProjectUsage {
  projectID: string;
  memoryUsageGB: number;
  cpuRequestCores: number;
  networkReceiveBytesPerSec: number;
  networkTransmitBytesPerSec: number;
  diskReadBytesPerSec: number;
  diskWriteBytesPerSec: number;
  window: string;
}
