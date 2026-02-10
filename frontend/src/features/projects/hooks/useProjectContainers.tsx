import { useEffect, useState } from "react";
import type { Container } from "@features/projects/types/Container";
import fetchProjectContainers from "@features/projects/api/getProjectContainers";

export function useProjectContainers(projectId: string) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const loadContainers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchProjectContainers(projectId);
        setContainers(data);
      } catch (err: unknown) {
        console.error('useProjectContainers error:', err);
        const error = err as { message?: string };
        setError(error?.message || "Failed to load containers");
      } finally {
        setIsLoading(false);
      }
    };

    void loadContainers();
  }, [projectId]);

  const reload = async () => {
    if (projectId) {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchProjectContainers(projectId);
        setContainers(data);
      } catch (err: unknown) {
        console.error('useProjectContainers reload error:', err);
        const error = err as { message?: string };
        setError(error?.message || "Failed to load containers");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return { containers, isLoading, error, reload, setContainers };
}
