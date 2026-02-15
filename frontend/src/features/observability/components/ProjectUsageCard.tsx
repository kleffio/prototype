import { useEffect, useState } from "react";
import { getProjectTotalUsageMetrics } from "../api/getProjectTotalUsageMetrics";
import type { ProjectTotalUsageMetrics } from "../types/projectTotalUsageMetrics.types";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { MiniCard } from "@shared/ui/MiniCard";
import { GradientIcon } from "@shared/ui/GradientIcon";
import { Cpu, HardDrive, TrendingUp } from "lucide-react";
import enTranslations from "@app/locales/en/dashboard.json";
import frTranslations from "@app/locales/fr/dashboard.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

interface ProjectUsageCardProps {
  projectId: string;
}

export default function ProjectUsageCard({ projectId }: ProjectUsageCardProps) {
  const [usageMetrics, setUsageMetrics] = useState<ProjectTotalUsageMetrics | null>(null);
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

  const t = translations[locale].dashboard;

  const fetchUsageMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectTotalUsageMetrics(projectId);
      setUsageMetrics(data);
    } catch (err) {
      setError(t.project_usage.error);
      console.error("Error fetching project total usage metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageMetrics();
    const interval = setInterval(fetchUsageMetrics, 300000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading && !usageMetrics) {
    return (
      <SoftPanel>
        <div className="flex justify-center py-10">
          <p className="text-sm text-neutral-400">{t.project_usage.loading}</p>
        </div>
      </SoftPanel>
    );
  }

  if (error) {
    return (
      <SoftPanel>
        <p className="py-6 text-sm text-red-400">{error}</p>
      </SoftPanel>
    );
  }

  if (!usageMetrics) return null;

  return (
    <SoftPanel>
      <div className="mb-6 flex items-center gap-3">
        <GradientIcon icon={TrendingUp} />
        <h2 className="text-lg font-semibold text-neutral-50">{t.project_usage.title}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniCard title={t.project_usage.total_memory}>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-neutral-400" />
            <span className="text-2xl font-semibold text-neutral-50">
              {usageMetrics.memoryGBHours.toFixed(2)}
            </span>
            <span className="text-xs text-neutral-400">{t.project_usage.gb_hours}</span>
          </div>
        </MiniCard>

        <MiniCard title={t.project_usage.total_cpu}>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-neutral-400" />
            <span className="text-2xl font-semibold text-neutral-50">
              {usageMetrics.cpuHours.toFixed(2)}
            </span>
            <span className="text-xs text-neutral-400">{t.project_usage.core_hours}</span>
          </div>
        </MiniCard>

        <MiniCard title={t.project_usage.time_window}>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-semibold text-neutral-50">{usageMetrics.window}</span>
          </div>
        </MiniCard>
      </div>
    </SoftPanel>
  );
}
