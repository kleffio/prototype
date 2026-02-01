import { useCallback } from "react";
import deleteProject from "@features/projects/api/deleteProject";
import { useBatchDeleteContainers } from "./useBatchDeleteContainers";
import fetchProjectContainers from "@features/projects/api/getProjectContainers";
import { generateFinalInvoice } from "@features/billing/api/generateFinalInvoice";
import type { Invoice } from "@features/billing/types/Invoice";

export function useDeleteProject() {
  const { batchDelete } = useBatchDeleteContainers();

  const deleteProjectHandler = useCallback(
    async (projectId: string): Promise<{ invoice: Invoice }> => {
      try {
        // Generate final invoice before deletion
        const invoice = await generateFinalInvoice(projectId);
        console.log("Generated final invoice:", invoice);

        // First, get all containers for the project
        const containers = await fetchProjectContainers(projectId);
        const containerIds = containers.map((container) => container.containerId);

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

        // Return the generated invoice for UI display
        return { invoice };
      } catch (error) {
        console.error("Failed to delete project:", error);
        throw error;
      }
    },
    [batchDelete]
  );

  return { deleteProject: deleteProjectHandler };
}
