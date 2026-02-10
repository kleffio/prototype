export type ContainerRequest = {
  projectID: string;
  name: string;
  port: number;
  repoUrl: string;
  branch: string;
  envVariables?: Record<string, string>;
};
