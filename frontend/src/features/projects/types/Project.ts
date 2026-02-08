export type Project = {
  projectId: string;
  name: string;
  description: string | null;
  ownerId: string | null;
  stackId: string | null;
  projectStatus: string | null;
  createdDate: string | null;
  updatedDate: string | null;
};
