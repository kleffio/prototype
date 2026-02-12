import { useState, useRef, useEffect } from "react";
import { Download, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@shared/ui/Button";
import { exportLogs } from "../api/exportLogs";
import type { LogExportFormat } from "../types/export";

interface ExportLogsButtonProps {
  projectId: string;
}

const TIME_RANGES = [
  { label: "Last 1 hour", value: "1h", hours: 1 },
  { label: "Last 6 hours", value: "6h", hours: 6 },
  { label: "Last 24 hours", value: "24h", hours: 24 },
  { label: "Last 7 days", value: "7d", hours: 168 }
];

const FORMAT_OPTIONS: { label: string; value: LogExportFormat }[] = [
  { label: "CSV", value: "csv" },
  { label: "Plain Text", value: "txt" }
];

export function ExportLogsButton({ projectId }: ExportLogsButtonProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<LogExportFormat>("csv");
  const [timeRange, setTimeRange] = useState("1h");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleExport = async () => {
    setLoading(true);
    setStatus("idle");
    setErrorMessage("");

    const selectedRange = TIME_RANGES.find((r) => r.value === timeRange);
    const hours = selectedRange?.hours ?? 1;
    const to = new Date().toISOString();
    const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    try {
      await exportLogs({ projectId, format, from, to });
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        setOpen(false);
      }, 2000);
    } catch {
      setStatus("error");
      setErrorMessage("Failed to export logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} title="Export logs">
        <Download className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-64 rounded-lg border border-white/10 bg-neutral-900 p-4 shadow-xl">
          <h3 className="mb-3 text-sm font-medium text-neutral-200">Export Logs</h3>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-neutral-400">Format</label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    format === opt.value
                      ? "border-blue-500/50 bg-blue-500/20 text-blue-300"
                      : "border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-neutral-400">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 focus:ring-2 focus:ring-white/20 focus:outline-none"
              style={{ colorScheme: "dark" }}
            >
              {TIME_RANGES.map((r) => (
                <option key={r.value} value={r.value} className="bg-neutral-900">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <Button size="sm" className="w-full" onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Generating report...
              </>
            ) : status === "success" ? (
              <>
                <Check className="mr-2 h-3.5 w-3.5" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="mr-2 h-3.5 w-3.5" />
                Download
              </>
            )}
          </Button>

          {status === "error" && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
