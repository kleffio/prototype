import { useEffect, useState } from "react";
import { getContainerLogs, type LogEntry } from "../api/getContainerLogs";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Button } from "@shared/ui/Button";
import { FileText, RefreshCw } from "lucide-react";
import { ExportLogsButton } from "./ExportLogsButton";

interface SimpleLogsViewerProps {
  projectId: string;
  containerName: string;
}

export default function SimpleLogsViewer({ projectId, containerName }: SimpleLogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getContainerLogs(projectId, containerName);
      setLogs(data);
      setError(null);
    } catch {
      setError("Failed to load logs");
      // Error is handled by setting error state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, containerName]);

  const formatTimestamp = (timestamp: string): string => {
    const ms = parseInt(timestamp) / 1000000;
    const date = new Date(ms);
    return date.toLocaleTimeString();
  };

  if (loading && logs.length === 0) {
    return (
      <SoftPanel>
        <p className="py-8 text-center text-sm text-neutral-400">Loading logs...</p>
      </SoftPanel>
    );
  }

  if (error) {
    return (
      <SoftPanel>
        <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <h3 className="text-kleff-gold mb-3 text-xl font-semibold">Failed to Load Logs</h3>
          <p className="mb-2 text-sm text-red-400">
            Unable to retrieve logs for <span className="font-mono">{containerName}</span>
          </p>
          <p className="mb-6 text-sm text-neutral-500">
            This could be due to network issues or the observability service being unavailable.
          </p>
          <Button onClick={fetchLogs} disabled={loading} size="sm">
            {loading ? "Retrying..." : "Try Again"}
          </Button>
        </div>
      </SoftPanel>
    );
  }

  return (
    <SoftPanel>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-neutral-50">Logs: {containerName}</h2>
        </div>
        <div className="flex items-center gap-1">
          <ExportLogsButton projectId={projectId} />
          <Button size="sm" variant="ghost" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 p-4">
        <div className="max-h-96 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-neutral-400">No logs found</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="flex gap-2 text-neutral-300">
                  <span className="text-neutral-500">{formatTimestamp(log.timestamp)}</span>
                  <span>{log.log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SoftPanel>
  );
}
