import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import deleteProject from "@features/projects/api/deleteProject";
import { ROUTES } from "@app/routes/routes";

export function useDeleteProject() {
  const navigate = useNavigate();

  const deleteProjectHandler = useCallback(
    async (projectId: string): Promise<void> => {
      try {
        await deleteProject(projectId);
        // Don't navigate away - let the calling component handle UI updates
      } catch (error) {
        console.error("Failed to delete project:", error);
        throw error;
      }
    },
    [navigate]
  );

  return { deleteProject: deleteProjectHandler };
}
