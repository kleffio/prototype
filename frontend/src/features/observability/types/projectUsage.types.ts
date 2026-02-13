export interface ProjectUsage {
  projectID: string;
  memoryUsageGB: number;
  cpuRequestCores: number;
  diskReadBytesPerSec: number;
  diskWriteBytesPerSec: number;
  window: string;
}
