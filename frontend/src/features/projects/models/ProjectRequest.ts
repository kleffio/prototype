export type ProjectRequestModel = {
  name: string;
  description?: string;
  ownerId?: string;
  stackId?: string;
  enableDatabase?: boolean;
  storageSize?: number; // in GB
};
