import { useEffect, useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  getDatabaseIOMetrics,
  type DatabaseIOMetrics
} from "@features/observability/api/getDatabaseIOMetrics";
import { useProjects } from "@features/projects/hooks/useProjects";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Database, RefreshCw } from "lucide-react";

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

export function DiskGraph() {
  const { projects } = useProjects();
  const [metrics, setMetrics] = useState<DatabaseIOMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter out deleted projects
  const activeProjectIds = useMemo(
    () => projects.filter((p) => p.projectStatus !== "DELETED").map((p) => p.projectId),
    [projects]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getDatabaseIOMetrics("1h", activeProjectIds);
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch IO metrics", err);
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [activeProjectIds]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [fetchData]); // Re-fetch when projects change

  const diskData = useMemo(() => {
    if (!metrics?.diskReadHistory || !metrics?.diskWriteHistory) return [];

    const map = new Map<number, { timestamp: number; read: number; write: number }>();

    metrics.diskReadHistory.forEach((p) => {
      map.set(p.timestamp, { timestamp: p.timestamp, read: p.value, write: 0 });
    });

    metrics.diskWriteHistory.forEach((p) => {
      const existing = map.get(p.timestamp);
      if (existing) {
        existing.write = p.value;
      } else {
        map.set(p.timestamp, { timestamp: p.timestamp, read: 0, write: p.value });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [metrics]);

  const isDiskEmpty = useMemo(() => {
    if (!diskData.length) return true;
    return diskData.every((d) => d.read === 0 && d.write === 0);
  }, [diskData]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i] + "/s";
  };

  const CustomTooltip = ({
    active,
    payload,
    label
  }: {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: number;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="z-50 rounded-lg border border-white/10 bg-neutral-900 p-3 text-xs shadow-xl backdrop-blur-md">
          <p className="mb-2 font-medium text-neutral-300">
            {new Date(label!).toLocaleTimeString()}
          </p>
          {payload.map((p) => (
            <div key={p.name} className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-neutral-400 capitalize">{p.name}:</span>
              <span className="font-mono text-neutral-200">{formatBytes(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <div className="h-[350px] animate-pulse rounded-2xl border border-white/10 bg-black/20" />
      </div>
    );
  }

  if (error) return null;

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Disk I/O Chart */}
      <SoftPanel className="flex h-[350px] flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2">
              <Database className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-200">Disk I/O</h3>
              <p className="text-xs text-neutral-500">Read vs Write Throughput</p>
            </div>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-neutral-500" />}
          </div>
        </div>
        <div className="relative min-h-0 w-full flex-1">
          {isDiskEmpty && (
            <div className="absolute inset-0 z-10 mx-6 mb-4 flex items-center justify-center rounded-lg border border-dashed border-white/5 bg-black/50 backdrop-blur-sm">
              <div className="text-center">
                <Database className="mx-auto mb-2 h-8 w-8 text-neutral-600 opacity-50" />
                <p className="text-sm font-medium text-neutral-500">No Disk Activity</p>
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={diskData}>
              <defs>
                <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWrite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(unix) =>
                  new Date(unix).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }
                stroke="#525252"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
                dy={10}
              />
              <YAxis
                tickFormatter={(val) => formatBytes(val)}
                stroke="#525252"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={65}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "#ffffff20", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="read"
                name="Read"
                stroke="#818cf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRead)"
              />
              <Area
                type="monotone"
                dataKey="write"
                name="Write"
                stroke="#f472b6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorWrite)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SoftPanel>
    </div>
  );
}
