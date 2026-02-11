import { useEffect, useState, useRef } from "react";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Button } from "@shared/ui/Button";
import { FileText, RefreshCw, XCircle } from "lucide-react";

interface BuildLogsViewerProps {
  projectId: string;
  containerId: string;
}

export function BuildLogsViewer({ projectId, containerId }: BuildLogsViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    setLogs([]);
    setIsStreaming(true);

    const controller = new AbortController();
    const signal = controller.signal;

    // Create a new fetch request to handle streaming
    fetch(
      `${(import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080").replace(/\/$/, "")}/api/v1/build/logs/${projectId}/${containerId}`,
      {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Accept: "text/plain"
        },
        signal
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch build logs: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        // Read the stream
        const read = () => {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                // Process any remaining data in the buffer
                if (buffer.trim()) {
                  setLogs((prev) => [...prev, buffer.trim()]);
                }
                setIsStreaming(false);
                setLoading(false);
                return;
              }

              // Decode and process the chunk
              buffer += decoder.decode(value, { stream: true });

              // Split buffer into lines
              const lines = buffer.split("\n");
              buffer = lines.pop() || ""; // Keep incomplete line in buffer

              lines
                .filter((line) => line.trim())
                .forEach((line) => {
                  setLogs((prev) => [...prev, line.trim()]);
                  setLoading(false);
                });

              read(); // Continue reading
            })
            .catch((error) => {
              // Only report error if it's not an abort error
              if (error.name !== "AbortError") {
                setError(error.message);
                setLoading(false);
                setIsStreaming(false);
              }
            });
        };

        read();
      })
      .catch((error) => {
        // Only report error if it's not an abort error
        if (error.name !== "AbortError") {
          setError(error.message);
          setLoading(false);
          setIsStreaming(false);
        }
      });

    return () => {
      controller.abort();
    };
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Create a new fetch request to handle streaming
    fetch(
      `${(import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080").replace(/\/$/, "")}/api/v1/build/logs/${projectId}/${containerId}`,
      {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Accept: "text/plain"
        },
        signal
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch build logs: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        // Read the stream
        const read = () => {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                // Process any remaining data in the buffer
                if (buffer.trim()) {
                  setLogs((prev) => [...prev, buffer.trim()]);
                }
                setIsStreaming(false);
                setLoading(false);
                return;
              }

              // Decode and process the chunk
              buffer += decoder.decode(value, { stream: true });

              // Split buffer into lines
              const lines = buffer.split("\n");
              buffer = lines.pop() || ""; // Keep incomplete line in buffer

              lines
                .filter((line) => line.trim())
                .forEach((line) => {
                  setLogs((prev) => [...prev, line.trim()]);
                  setLoading(false);
                });

              read(); // Continue reading
            })
            .catch((error) => {
              // Only report error if it's not an abort error
              if (error.name !== "AbortError") {
                setError(error.message);
                setLoading(false);
                setIsStreaming(false);
              }
            });
        };

        read();
      })
      .catch((error) => {
        // Only report error if it's not an abort error
        if (error.name !== "AbortError") {
          setError(error.message);
          setLoading(false);
          setIsStreaming(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [projectId, containerId]);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (loading && logs.length === 0) {
    return (
      <SoftPanel>
        <p className="py-8 text-center text-sm text-neutral-400">Connecting to log stream...</p>
      </SoftPanel>
    );
  }

  if (error) {
    return (
      <SoftPanel>
        <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <h3 className="text-kleff-gold mb-3 text-xl font-semibold">Failed to Load Build Logs</h3>
          <p className="mb-2 text-sm text-red-400">
            Unable to retrieve build logs for <span className="font-mono">{containerId}</span>
          </p>
          <p className="mb-6 text-sm text-neutral-500">
            This could be due to the build not having started yet, or the build job has been cleaned
            up.
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
          <h2 className="text-lg font-semibold text-neutral-50">Build Logs: {containerId}</h2>
          {isStreaming && (
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={fetchLogs} disabled={loading || isStreaming}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {isStreaming ? "Streaming..." : "Refresh"}
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 p-4">
        <div ref={logContainerRef} className="max-h-96 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-neutral-400">No build logs available</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2 text-neutral-300">
                  {log.includes("error") || log.includes("Error") || log.includes("ERROR") ? (
                    <XCircle className="h-3 w-3 flex-shrink-0 text-red-400" />
                  ) : log.includes("warning") ||
                    log.includes("Warning") ||
                    log.includes("WARNING") ? (
                    <XCircle className="h-3 w-3 flex-shrink-0 text-yellow-400" />
                  ) : null}
                  <span>{log}</span>
                </div>
              ))}
              {isStreaming && (
                <div className="flex gap-2 text-neutral-400">
                  <span className="animate-pulse">Receiving logs...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SoftPanel>
  );
}
