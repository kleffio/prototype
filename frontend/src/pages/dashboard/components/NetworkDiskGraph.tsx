import { useEffect, useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getDatabaseIOMetrics, type DatabaseIOMetrics } from "@features/observability/api/getDatabaseIOMetrics";
import { useProjects } from "@features/projects/hooks/useProjects";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Network, Database, RefreshCw } from "lucide-react";

export function NetworkDiskGraph() {
  const { projects } = useProjects();
  const [metrics, setMetrics] = useState<DatabaseIOMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter out deleted projects
  const activeProjectIds = useMemo(() => 
    projects
      .filter(p => p.projectStatus !== "DELETED")
      .map(p => p.projectId), 
    [projects]
  );

  const fetchData = async () => {
    // Wait until projects are loaded, otherwise do nothing or fetch a default set
    // If no projects, the graph should probably show "No Data" or empty.
    
    try {
      setLoading(true); 
      // If we have projects, we ONLY fetch metrics for those projects.
      // If we have NO projects, we pass an empty list which the backend interprets as "all namespaces" right now?
      // No, we updated backend: if list > 0, filter by list.
      // If list == 0, filter OUT system namespaces.
      // So if user has 0 projects, params are empty => backend gets cluster total minus system. 
      // Which is probably correct (maybe user has un-projected containers or we show cluster state).
      // But the user asked to "get info specifically from these projects".
      
      const data = await getDatabaseIOMetrics("1h", activeProjectIds);
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch IO metrics", err);
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [activeProjectIds]); // Re-fetch when projects change

  // Merge data for Recharts
  const networkData = useMemo(() => {
    if (!metrics?.networkReceiveHistory || !metrics?.networkTransmitHistory) return [];
    
    // Create a map by timestamp
    const map = new Map<number, { timestamp: number; rx: number; tx: number }>();
    
    metrics.networkReceiveHistory.forEach(p => {
        map.set(p.timestamp, { timestamp: p.timestamp, rx: p.value, tx: 0 });
    });

    metrics.networkTransmitHistory.forEach(p => {
        const existing = map.get(p.timestamp);
        if (existing) {
            existing.tx = p.value;
        } else {
            // If timestamps don't perfectly align, we might lose some points or insert new ones.
            // For Prometheus step queries, they typically align.
            map.set(p.timestamp, { timestamp: p.timestamp, rx: 0, tx: p.value });
        }
    });

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [metrics]);

  const diskData = useMemo(() => {
    if (!metrics?.diskReadHistory || !metrics?.diskWriteHistory) return [];
    
    const map = new Map<number, { timestamp: number; read: number; write: number }>();
    
    metrics.diskReadHistory.forEach(p => {
        map.set(p.timestamp, { timestamp: p.timestamp, read: p.value, write: 0 });
    });

    metrics.diskWriteHistory.forEach(p => {
        const existing = map.get(p.timestamp);
        if (existing) {
            existing.write = p.value;
        } else {
            map.set(p.timestamp, { timestamp: p.timestamp, read: 0, write: p.value });
        }
    });

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [metrics]);

  const isNetworkEmpty = useMemo(() => {
    if (!networkData.length) return true;
    return networkData.every(d => d.rx === 0 && d.tx === 0);
  }, [networkData]);

  const isDiskEmpty = useMemo(() => {
    if (!diskData.length) return true;
    return diskData.every(d => d.read === 0 && d.write === 0);
  }, [diskData]);


  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i] + "/s";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-900 border border-white/10 p-3 rounded-lg shadow-xl text-xs backdrop-blur-md z-50">
          <p className="mb-2 font-medium text-neutral-300">{new Date(label).toLocaleTimeString()}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[350px] rounded-2xl border border-white/10 bg-black/20 animate-pulse" />
            <div className="h-[350px] rounded-2xl border border-white/10 bg-black/20 animate-pulse" />
        </div>
      );
  }

  if (error) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Network Traffic Chart */}
      <SoftPanel className="h-[350px] flex flex-col">
        <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                     <Network className="h-5 w-5 text-green-400" />
                </div>
                <div>
                   <h3 className="font-semibold text-neutral-200">Network Traffic</h3>
                   <p className="text-xs text-neutral-500">Inbound vs Outbound (Cluster)</p>
                </div>
            </div>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-neutral-500" />}
        </div>
        <div className="flex-1 w-full min-h-0 relative">
            {isNetworkEmpty && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 rounded-lg border border-dashed border-white/5 mx-6 mb-4">
                    <div className="text-center">
                        <Network className="h-8 w-8 text-neutral-600 mx-auto mb-2 opacity-50" />
                        <p className="text-neutral-500 font-medium text-sm">No Network Activity</p>
                    </div>
                </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={networkData}>
                    <defs>
                        <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(unix) => new Date(unix).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1 }} />
                    <Area 
                        type="monotone" 
                        dataKey="rx" 
                        name="Inbound"
                        stroke="#22c55e" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRx)" 
                    />
                    <Area 
                        type="monotone" 
                        dataKey="tx" 
                        name="Outbound"
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorTx)" 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </SoftPanel>

       {/* Disk I/O Chart */}
      <SoftPanel className="h-[350px] flex flex-col">
        <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                     <Database className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-neutral-200">Disk I/O</h3>
                    <p className="text-xs text-neutral-500">Read vs Write Throughput</p>
                </div>
            </div>
        </div>
        <div className="flex-1 w-full min-h-0 relative">
            {isDiskEmpty && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 rounded-lg border border-dashed border-white/5 mx-6 mb-4">
                    <div className="text-center">
                        <Database className="h-8 w-8 text-neutral-600 mx-auto mb-2 opacity-50" />
                        <p className="text-neutral-500 font-medium text-sm">No Disk Activity</p>
                    </div>
                </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={diskData}>
                    <defs>
                        <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorWrite" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f472b6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(unix) => new Date(unix).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1 }} />
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
