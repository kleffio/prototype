import { useEffect, useState } from "react";
import { getProjectUsage } from "@features/observability/api/getProjectMetrics";
import type { ProjectUsage } from "@features/observability/types/projectUsage.types";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { MiniCard } from "@shared/ui/MiniCard";
import { GradientIcon } from "@shared/ui/GradientIcon";
import { Clock, Cpu, HardDrive, Database } from "lucide-react";
import enTranslations from "@app/locales/en/dashboard.json";
import frTranslations from "@app/locales/fr/dashboard.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

interface ProjectMetricsCardProps {
  projectId: string;
}

export default function ProjectMetricsCard({ projectId }: ProjectMetricsCardProps) {
  const [usage, setUsage] = useState<ProjectUsage | null>(null);
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

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectUsage(projectId);
      setUsage(data);
    } catch (err) {
      setError(t.project_metrics.error);
      console.error("Error fetching project usage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 300000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading && !usage) {
    return (
      <SoftPanel>
        <div className="flex justify-center py-10">
          <p className="text-sm text-neutral-400">{t.project_metrics.loading}</p>
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

  if (!usage) return null;

  return (
    <SoftPanel>
      <div className="mb-6 flex items-center gap-3">
        <GradientIcon icon={Clock} />
        <h2 className="text-lg font-semibold text-neutral-50">{t.project_metrics.title}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniCard title={t.project_metrics.avg_cpu}>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-neutral-400" />
            <span className="text-2xl font-semibold text-neutral-50">
              {(usage.cpuRequestCores || 0).toFixed(3)}
            </span>
            <span className="text-xs text-neutral-400">{t.project_metrics.cores}</span>
          </div>
        </MiniCard>

        <MiniCard title={t.project_metrics.avg_memory}>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-neutral-400" />
            <span className="text-2xl font-semibold text-neutral-50">
              {(usage.memoryUsageGB || 0).toFixed(2)}
            </span>
            <span className="text-xs text-neutral-400">{t.project_metrics.gb}</span>
          </div>
        </MiniCard>

        <MiniCard title={t.project_metrics.avg_disk}>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-neutral-400" />
            <div className="flex flex-col">
              <span className="text-lg leading-tight font-semibold text-neutral-50">
                R:{((usage.diskReadBytesPerSec || 0) / 1024).toFixed(1)} / W:
                {((usage.diskWriteBytesPerSec || 0) / 1024).toFixed(1)}
              </span>
              <span className="text-xs text-neutral-400">{t.project_metrics.kbps}</span>
            </div>
          </div>
        </MiniCard>
      </div>
    </SoftPanel>
  );
}
