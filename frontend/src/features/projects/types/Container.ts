export type Container = {
  containerId: string;
  name: string;
  status: string;
  image: string;
  ports: string[];
  createdAt: string;
  repoUrl: string;
  branch: string;
  envVariables?: Record<string, string>;
};
