import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import deleteProject from "@features/projects/api/deleteProject";
import { useBatchDeleteContainers } from "./useBatchDeleteContainers";
import fetchProjectContainers from "@features/projects/api/getProjectContainers";

export function useDeleteProject() {
  const navigate = useNavigate();
  const { batchDelete } = useBatchDeleteContainers();

  const deleteProjectHandler = useCallback(
    async (projectId: string): Promise<void> => {
      try {
        // First, get all containers for the project
        const containers = await fetchProjectContainers(projectId);
        const containerIds = containers.map(container => container.containerId);

        // Delete all containers in the project using the batch delete endpoint
        if (containerIds.length > 0) {
          const result = await batchDelete(projectId, containerIds);
          
          // Log the results
          if (result.failed.length > 0) {
            console.warn("Some containers failed to delete:", result.failed);
          }
          
          console.log(`Successfully deleted ${result.deleted.length} containers`);
        }

        // Finally, delete the project itself
        await deleteProject(projectId);
        
        // Don't navigate away - let the calling component handle UI updates
      } catch (error) {
        console.error("Failed to delete project:", error);
        throw error;
      }
    },
    [navigate, batchDelete]
  );

  return { deleteProject: deleteProjectHandler };
}
