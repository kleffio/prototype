import { useEffect, useState } from "react";
import { getProjectUsage } from "@features/observability/api/getProjectMetricsCumulative";
import type { ProjectUsage } from "@features/observability/types/projectUsage.types";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { MiniCard } from "@shared/ui/MiniCard";
import { GradientIcon } from "@shared/ui/GradientIcon";
import { Cpu, HardDrive, DollarSign } from "lucide-react";
import type { Price } from "../types/Price";
import fetchPrices from "../api/viewPrices";

interface ProjectBillingEstimatesCardProps {
  projectId: string;
}

export default function ProjectBillingEstimatesCard({
  projectId
}: ProjectBillingEstimatesCardProps) {
  const [usage, setUsage] = useState<ProjectUsage | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usageData, pricesData] = await Promise.all([
        getProjectUsage(projectId),
        fetchPrices()
      ]);
      setUsage(usageData);
      setPrices(pricesData);
    } catch (err) {
      setError("Unable to retrieve project usage metrics.");
      console.error("Error fetching project usage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    // Update every 5 minutes for usage metrics
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

  if (!usage || prices.length < 2) return null;

  const cpuCost = (usage.cpuRequestCores || 0) * (prices[0]?.price || 0);
  const memoryCost = (usage.memoryUsageGB || 0) * (prices[1]?.price || 0);
  const totalCost = cpuCost + memoryCost;

  return (
    <SoftPanel>
      <div className="mb-6 flex items-center gap-3">
        <GradientIcon icon={DollarSign} />
        <h2 className="text-lg font-semibold text-neutral-50">Estimated Billing (30 Days)</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniCard title="CPU Cost">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-neutral-400" />
            <span className="text-2xl font-semibold text-neutral-50">${cpuCost.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {(usage.cpuRequestCores || 0).toFixed(3)} cores × ${(prices[0]?.price || 0).toFixed(2)}
            /core
          </p>
        </MiniCard>

        <MiniCard title="Memory Cost">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-neutral-400" />
            <span className="text-2xl font-semibold text-neutral-50">${memoryCost.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {(usage.memoryUsageGB || 0).toFixed(2)} GB × ${(prices[1]?.price || 0).toFixed(2)}/GB
          </p>
        </MiniCard>

        <MiniCard title="Total Estimate">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-neutral-400" />
            <span className="text-2xl font-semibold text-green-400">${totalCost.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">30-day estimate</p>
        </MiniCard>
      </div>
    </SoftPanel>
  );
}
