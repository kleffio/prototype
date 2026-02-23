import { getTopProjects } from "@features/observability/api/getTopProjects";
import type {
  ProjectRanking,
  ProjectSortBy,
  TopProjectsResponse
} from "@features/observability/types/metrics";
import enTranslations from "@app/locales/en/dashboard.json";
import frTranslations from "@app/locales/fr/dashboard.json";
import { getLocale } from "@app/locales/locale";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

const translations = { en: enTranslations, fr: frTranslations };

interface Props {
  duration: string;
}

function percentLabel(value: number): string {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
}

function metricValue(project: ProjectRanking, sortBy: ProjectSortBy): string {
  if (sortBy === "memory") return `${project.memoryUsageGB.toFixed(2)} GB`;
  if (sortBy === "disk") {
    const total = project.diskReadBytesPerSec + project.diskWriteBytesPerSec;
    return `${(total / 1024 / 1024).toFixed(2)} MB/s`;
  }
  return `${project.cpuRequestCores.toFixed(2)} cores`;
}

function percentageValue(
  project: ProjectRanking,
  sortBy: ProjectSortBy,
  allProjects: ProjectRanking[]
): number {
  if (sortBy === "memory") return project.percentageOfClusterMemory;
  if (sortBy === "disk") {
    const totalDisk = allProjects.reduce((acc, item) => {
      return acc + item.diskReadBytesPerSec + item.diskWriteBytesPerSec;
    }, 0);
    if (totalDisk <= 0) return 0;
    return ((project.diskReadBytesPerSec + project.diskWriteBytesPerSec) / totalDisk) * 100;
  }
  return project.percentageOfClusterCpu;
}

export function ProjectAttributionPanel({ duration }: Props) {
  const [sortBy, setSortBy] = useState<ProjectSortBy>("cpu");
  const [data, setData] = useState<TopProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].dashboard.resource_attribution;

  const fetchTopProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTopProjects(sortBy, 10, duration);
      setData(response);
    } catch (err) {
      console.error("Failed to fetch top projects", err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [duration, sortBy, t.error]);

  useEffect(() => {
    fetchTopProjects();
    const interval = setInterval(fetchTopProjects, 30000);
    return () => clearInterval(interval);
  }, [fetchTopProjects]);

  useEffect(() => {
    if (data?.alert?.type === "cpu") {
      setSortBy("cpu");
    } else if (data?.alert?.type === "memory") {
      setSortBy("memory");
    }
  }, [data?.alert?.type]);

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-6">
      {data?.alert && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          <span>
            {t.high_load_prefix} {data.alert.type.toUpperCase()} (
            {data.alert.currentValue.toFixed(1)}%)
          </span>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-neutral-50">{t.title}</h3>
        <div className="flex items-center gap-2">
          {(["cpu", "memory", "disk"] as ProjectSortBy[]).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                sortBy === sort
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/15 bg-white/5 text-neutral-300 hover:border-white/30 hover:bg-white/10"
              }`}
            >
              {t.sort[sort]}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-8 text-center text-sm text-neutral-400">{t.loading}</div>}
      {!loading && error && <div className="py-8 text-center text-sm text-red-400">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-400 uppercase">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-400 uppercase">
                  {t.headers.project}
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-400 uppercase">
                  {t.headers.owner}
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-400 uppercase">
                  {t.headers.namespace}
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-400 uppercase">
                  {t.headers.metric}
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-400 uppercase">
                  {t.headers.cluster_share}
                </th>
              </tr>
            </thead>
            <tbody>
              {(data?.projects ?? []).map((project, index) => {
                const projects = data?.projects ?? [];
                const share = percentageValue(project, sortBy, projects);
                return (
                  <tr
                    key={`${project.projectId}-${index}`}
                    className="border-b border-neutral-800 last:border-b-0 hover:bg-white/5"
                  >
                    <td className="px-3 py-3 text-sm text-neutral-300">{index + 1}</td>
                    <td className="px-3 py-3 text-sm font-medium text-amber-300">
                      <Link
                        to={`/dashboard/projects/${project.projectId}`}
                        className="hover:underline"
                      >
                        {project.projectName || project.projectId}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-sm text-neutral-200">
                      {project.ownerName || "Unknown"}
                    </td>
                    <td className="px-3 py-3 font-mono text-sm text-neutral-400">
                      {project.namespace}
                    </td>
                    <td className="px-3 py-3 text-sm text-neutral-200">
                      {metricValue(project, sortBy)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="mb-1 h-2 w-full rounded-full bg-neutral-800">
                        <div
                          className="h-2 rounded-full bg-amber-400"
                          style={{ width: `${Math.max(2, Math.min(100, share))}%` }}
                        />
                      </div>
                      <div className="text-xs text-neutral-400">{percentLabel(share)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(data?.projects?.length ?? 0) === 0 && (
            <div className="py-6 text-center text-sm text-neutral-400">{t.empty}</div>
          )}
        </div>
      )}
    </div>
  );
}
