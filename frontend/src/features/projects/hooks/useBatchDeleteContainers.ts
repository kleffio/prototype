import { useCallback } from "react";
import batchDeleteContainers from "@features/projects/api/batchDeleteContainers";

export function useBatchDeleteContainers() {
  const batchDelete = useCallback(
    async (
      projectId: string,
      containerIds: string[]
    ): Promise<{
      deleted: string[];
      failed: Array<{ containerID: string; reason: string }>;
    }> => {
      try {
        const result = await batchDeleteContainers(projectId, containerIds);
        return result;
      } catch (error) {
        console.error("Failed to batch delete containers:", error);
        throw error;
      }
    },
    []
  );

  return { batchDelete };
}
