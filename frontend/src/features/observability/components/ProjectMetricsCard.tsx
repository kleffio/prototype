import { useEffect, useState } from "react";
import { getProjectUsage } from "@features/observability/api/getProjectMetrics";
import type { ProjectUsage } from "@features/observability/types/projectUsage.types";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { MiniCard } from "@shared/ui/MiniCard";
import { GradientIcon } from "@shared/ui/GradientIcon";
import { Clock, Cpu, HardDrive } from "lucide-react";

interface ProjectMetricsCardProps {
  projectId: string;
}

export default function ProjectMetricsCard({ projectId }: ProjectMetricsCardProps) {
  const [usage, setUsage] = useState<ProjectUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectUsage(projectId);
      setUsage(data);
    } catch (err) {
      setError("Unable to retrieve project usage metrics.");
      console.error("Error fetching project usage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    // Update every 5 minutes for usage metrics (less frequent than real-time metrics)
    const interval = setInterval(fetchUsage, 300000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading && !usage) {
    return (
      <SoftPanel>
        <div className="flex justify-center py-10">
          <p className="text-sm text-neutral-400">Loading usage metrics...</p>
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
        <h2 className="text-lg font-semibold text-neutral-50">Project Usage (30 Days)</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MiniCard title="Avg CPU Requests">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-neutral-400" />
            <span className="text-2xl font-semibold text-neutral-50">
              {(usage.cpuRequestCores || 0).toFixed(3)}
            </span>
            <span className="text-xs text-neutral-400">cores</span>
          </div>
        </MiniCard>

        <MiniCard title="Avg Memory Usage">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-neutral-400" />
            <span className="text-2xl font-semibold text-neutral-50">
              {(usage.memoryUsageGB || 0).toFixed(2)}
            </span>
            <span className="text-xs text-neutral-400">GB</span>
          </div>
        </MiniCard>
      </div>
    </SoftPanel>
  );
}
