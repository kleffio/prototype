import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { Project } from "../types/Project";
import getProjects from "@features/projects/api/getProjects";

type ProjectsState = {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refreshInvoices?: () => Promise<void>; // Optional function to refresh invoices
};

const ProjectsContext = createContext<ProjectsState | undefined>(undefined);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load projects.");
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const value = useMemo(
    () => ({
      projects,
      isLoading,
      error,
      reload: load
    }),
    [projects, isLoading, error]
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProjectsContext(): ProjectsState {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error("useProjectsContext must be used within a ProjectsProvider");
  }
  return ctx;
}
