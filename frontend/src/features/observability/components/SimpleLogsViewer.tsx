import { useEffect, useState } from "react";
import { getContainerLogs, type LogEntry } from "../api/getContainerLogs";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/Select";
import { FileText, RefreshCw, X } from "lucide-react";
import enTranslations from "@app/locales/en/dashboard.json";
import frTranslations from "@app/locales/fr/dashboard.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };
import { ExportLogsButton } from "./ExportLogsButton";

interface SimpleLogsViewerProps {
  projectId: string;
  containerName: string;
}

export default function SimpleLogsViewer({ projectId, containerName }: SimpleLogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocaleState] = useState(getLocale());

  // Filters
  const [searchText, setSearchText] = useState("");
  const [severity, setSeverity] = useState<string>("all");
  const [timeRange, setTimeRange] = useState("1h");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].dashboard;

  const fetchLogs = async () => {
    try {
      setLoading(true);

      let start: string | undefined;
      let end: string | undefined;
      let duration: string | undefined = timeRange;

      if (timeRange === "custom") {
        duration = undefined;
        if (customStart) start = new Date(customStart).toISOString();
        if (customEnd) end = new Date(customEnd).toISOString();
      }

      const data = await getContainerLogs({
        projectId,
        containerName,
        searchText,
        severity: severity === "all" ? undefined : severity,
        duration,
        start,
        end
      });
      setLogs(data);
      setError(null);
    } catch {
      setError(t.logs.failed_title);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, containerName, searchText, severity, timeRange, customStart, customEnd]); // Added dependencies to auto-refresh on filter change

  const formatTimestamp = (timestamp: string): string => {
    const ms = parseInt(timestamp) / 1000000;
    const date = new Date(ms);
    return date.toLocaleTimeString();
  };

  const getLogLevel = (logCheck: string): { level: string; color: string } => {
    try {
      // Try to parse as JSON first
      if (logCheck.trim().startsWith("{") && logCheck.trim().endsWith("}")) {
        const parsed = JSON.parse(logCheck);

        // Handle numeric levels (Pino/Bunyan)
        if (typeof parsed.level === "number") {
          if (parsed.level >= 60) return { level: "FATAL", color: "text-red-600 font-bold" };
          if (parsed.level >= 50) return { level: "ERROR", color: "text-red-500 font-bold" };
          if (parsed.level >= 40) return { level: "WARN", color: "text-yellow-500 font-bold" };
          if (parsed.level >= 30) return { level: "INFO", color: "text-blue-400" };
          if (parsed.level >= 20) return { level: "DEBUG", color: "text-neutral-400" };
          return { level: "TRACE", color: "text-neutral-500" };
        }

        // Handle string levels
        if (typeof parsed.level === "string") {
          const lvl = parsed.level.toLowerCase();
          if (lvl === "fatal") return { level: "FATAL", color: "text-red-600 font-bold" };
          if (lvl === "error") return { level: "ERROR", color: "text-red-500 font-bold" };
          if (lvl === "warn" || lvl === "warning")
            return { level: "WARN", color: "text-yellow-500 font-bold" };
          if (lvl === "info") return { level: "INFO", color: "text-blue-400" };
          if (lvl === "debug") return { level: "DEBUG", color: "text-neutral-400" };
          if (lvl === "trace") return { level: "TRACE", color: "text-neutral-500" };
        }
      }
    } catch {
      // Ignore parse errors
    }

    const lowerLog = logCheck.toLowerCase();
    if (lowerLog.includes("fatal")) return { level: "FATAL", color: "text-red-600 font-bold" };
    if (lowerLog.includes("error") || lowerLog.includes("exception"))
      return { level: "ERROR", color: "text-red-500 font-bold" };
    if (lowerLog.includes("warn")) return { level: "WARN", color: "text-yellow-500 font-bold" };
    if (lowerLog.includes("info")) return { level: "INFO", color: "text-blue-400" };
    if (lowerLog.includes("debug")) return { level: "DEBUG", color: "text-neutral-400" };

    return { level: "LOG", color: "text-neutral-300" };
  };

  const formatLogMessage = (logText: string) => {
    try {
      if (logText.trim().startsWith("{") && logText.trim().endsWith("}")) {
        const parsed = JSON.parse(logText);
        // If it's a structured log, try to format it nicely
        if (parsed.msg || parsed.message) {
          const msg = parsed.msg || parsed.message;
          // Add method/url if present (common in HTTP logs)
          const reqInfo = parsed.req ? ` ${parsed.req.method} ${parsed.req.url}` : "";
          const statusInfo = parsed.res ? ` ${parsed.res.statusCode}` : "";
          const duration = parsed.responseTime ? ` (${Math.round(parsed.responseTime)}ms)` : "";

          return (
            <span>
              <span className="text-white">{msg}</span>
              {reqInfo && <span className="text-neutral-400">{reqInfo}</span>}
              {statusInfo && (
                <span
                  className={`ml-1 ${parsed.res.statusCode >= 400 ? "text-red-400" : "text-green-400"}`}
                >
                  {statusInfo}
                </span>
              )}
              {duration && <span className="text-[10px] text-neutral-500">{duration}</span>}
              {/* Hidden details that can be expanded later if we add that feature */}
            </span>
          );
        }
      }
    } catch {
      // Verify failed
    }
    return <span className="break-all">{logText}</span>;
  };

  const clearFilters = () => {
    setSearchText("");
    setSeverity("all");
    setTimeRange("1h");
    setCustomStart("");
    setCustomEnd("");
  };

  const hasFilters = searchText || severity !== "all" || timeRange !== "1h";

  if (loading && logs.length === 0) {
    return (
      <SoftPanel>
        <p className="py-8 text-center text-sm text-neutral-400">{t.logs.loading}</p>
      </SoftPanel>
    );
  }

  if (error) {
    return (
      <SoftPanel>
        <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <h3 className="text-kleff-gold mb-3 text-xl font-semibold">{t.logs.failed_title}</h3>
          <p className="mb-2 text-sm text-red-400">
            {t.logs.unable_to_retrieve} <span className="font-mono">{containerName}</span>
          </p>
          <p className="mb-6 text-sm text-neutral-500">{t.logs.network_issue}</p>
          <Button onClick={fetchLogs} disabled={loading} size="sm">
            {loading ? t.logs.retrying : t.logs.try_again}
          </Button>
        </div>
      </SoftPanel>
    );
  }

  return (
    <SoftPanel>
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-neutral-50">
              {t.logs.logs_prefix} {containerName}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <ExportLogsButton projectId={projectId} />
            <Button size="sm" variant="ghost" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48">
            <Input
              placeholder="Search logs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="w-32">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="fatal">Fatal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">Last 15m</SelectItem>
                <SelectItem value="1h">Last 1h</SelectItem>
                <SelectItem value="6h">Last 6h</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timeRange === "custom" && (
            <>
              <Input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 w-40"
              />
              <span className="text-neutral-400">-</span>
              <Input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 w-40"
              />
            </>
          )}

          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              className="h-9 px-2 text-neutral-400 hover:text-white"
            >
              <X className="mr-1 h-3 w-3" /> Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 p-4">
        <div className="max-h-96 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-neutral-400">{t.logs.no_logs}</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => {
                const logInfo = getLogLevel(log.log);
                return (
                  <div
                    key={`${log.timestamp}-${index}`}
                    className="group flex gap-2 rounded border-b border-white/5 p-1 text-neutral-300 transition-colors last:border-0 hover:bg-white/5"
                  >
                    <span className="w-[70px] shrink-0 pt-0.5 font-mono text-[10px] text-neutral-500 select-none">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span
                      className={`w-[50px] shrink-0 pt-0.5 font-mono text-[10px] font-bold uppercase ${logInfo.color} h-fit rounded bg-white/5 px-1 text-center select-none`}
                    >
                      {logInfo.level}
                    </span>
                    <div className="min-w-0 flex-1 font-mono text-xs break-words">
                      {formatLogMessage(log.log)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SoftPanel>
  );
}
