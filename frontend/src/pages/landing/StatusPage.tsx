import { useState, useEffect } from "react";
import { useUptime } from "@features/observability/hooks/useUptime";
import { UptimeStatusCard } from "@features/observability/components/UptimeStatusCard";
import { Section } from "@shared/ui/Section";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Skeleton } from "@shared/ui/Skeleton";
import { Pill } from "@shared/ui/Pill";
import { Button } from "@shared/ui/Button";
import { KleffDot } from "@shared/ui/KleffDot";
import { Activity, RefreshCw, Calendar, AlertTriangle } from "lucide-react";

import {
  calculateUptimePercentage,
  getUptimeStatusColor,
  getUptimeStatusText
} from "@features/observability/lib/uptime.utils";

import enTranslations from "@app/locales/en/status.json";
import frTranslations from "@app/locales/fr/status.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

type TimeRange = "24h" | "7d" | "30d" | "90d";

export function StatusPage() {
  const [locale, setLocaleState] = useState(getLocale());
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].status;

  const timeRangeLabels: Record<TimeRange, string> = {
    "24h": t.time_ranges["24h"],
    "7d": t.time_ranges["7d"],
    "30d": t.time_ranges["30d"],
    "90d": t.time_ranges["90d"]
  };

  const [selectedRange, setSelectedRange] = useState<TimeRange>("24h");
  const { data, isLoading, error, refetch } = useUptime({
    duration: selectedRange,
    refreshInterval: 30000
  });

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <div className="min-h-screen">
        <Section className="pt-20 pb-16">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full border border-red-500/30 bg-linear-to-br from-red-500/20 to-orange-500/20 backdrop-blur-sm">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="mb-2 text-3xl font-semibold text-neutral-50">{t.error.title}</h1>
              <p className="text-sm text-neutral-400">{t.error.subtitle}</p>
            </div>

            <SoftPanel className="mb-6">
              <div className="space-y-4">
                {/* Error Details */}
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-semibold text-neutral-200">
                      {t.error.error_details}
                    </h3>
                    <p className="rounded-lg border border-red-500/20 bg-neutral-900/50 px-3 py-2 font-mono text-sm text-neutral-400">
                      {error.message}
                    </p>
                  </div>
                </div>

                {/* Possible Causes */}
                <div className="border-t border-white/5 pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-neutral-200">
                    {t.error.possible_causes}
                  </h3>
                  <ul className="space-y-2 text-sm text-neutral-400">
                    {t.error.causes.map((cause, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-500" />
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-neutral-200">
                    {t.error.troubleshooting}
                  </h3>
                  <div className="space-y-2 text-sm text-neutral-400">
                    {t.error.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="font-semibold text-[rgb(245,181,23)]">{index + 1}.</span>
                        <span>
                          {index === 0 ? (
                            <>
                              {step}{" "}
                              <code className="rounded bg-neutral-900/50 px-2 py-0.5 font-mono text-xs">
                                curl http://localhost:9090/api/v1/query?query=up
                              </code>
                            </>
                          ) : index === 1 ? (
                            <>
                              {step}{" "}
                              <code className="rounded bg-neutral-900/50 px-2 py-0.5 font-mono text-xs">
                                .env
                              </code>{" "}
                              file
                            </>
                          ) : (
                            step
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SoftPanel>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={handleRefresh}
                disabled={isLoading}
                className="bg-gradient-kleff w-full rounded-full px-8 text-sm font-semibold text-black shadow-md shadow-black/40 hover:brightness-110 sm:w-auto"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                {t.error.try_again}
              </Button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-neutral-500">
                {t.error.help_text}{" "}
                <a href="/docs" className="text-[rgb(245,181,23)] hover:underline">
                  {t.error.documentation}
                </a>{" "}
                {t.error.or}{" "}
                <a href="/support" className="text-[rgb(245,181,23)] hover:underline">
                  {t.error.contact_support}
                </a>
              </p>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  const overallPercentage = data ? calculateUptimePercentage(data.uptimeHistory) : 100;
  const statusColor = getUptimeStatusColor(overallPercentage);
  const statusText = getUptimeStatusText(overallPercentage);

  return (
    <div className="min-h-screen">
      <Section className="pt-20 pb-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[rgb(245,181,23)]/30 bg-linear-to-br from-[rgb(250,215,130)]/20 to-[rgb(245,181,23)]/20 backdrop-blur-sm">
            <Activity className="h-8 w-8 text-[rgb(245,181,23)]" />
          </div>
          <h1 className="mb-2 text-3xl font-semibold text-neutral-50">{t.page_title}</h1>
          <p className="text-sm text-neutral-400">{t.page_subtitle}</p>
        </div>

        <div className="mb-8">
          <SoftPanel className="text-center">
            <div className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:justify-between sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white ${statusColor}`}
                >
                  <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                  {statusText}
                </div>
                {data && (
                  <div className="text-sm text-neutral-400">
                    {overallPercentage.toFixed(3)}% uptime
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  {t.refresh}
                </Button>
                {data && (
                  <div className="text-xs text-neutral-500">
                    {t.updated} {new Date().toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </SoftPanel>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-300">{t.time_range}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(timeRangeLabels) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className="focus:outline-none focus-visible:ring-1 focus-visible:ring-[rgb(245,181,23)]/50"
              >
                <Pill active={selectedRange === range}>{timeRangeLabels[range]}</Pill>
              </button>
            ))}
          </div>
        </div>

        {isLoading && !data && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SoftPanel key={i}>
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-8 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              </SoftPanel>
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="mb-4">
              <h2 className="text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
                {t.infrastructure_components}
              </h2>
            </div>

            <div className="space-y-4">
              {data.nodeUptimes.map((node) => (
                <SoftPanel key={node.nodeName}>
                  <UptimeStatusCard
                    serviceName={node.nodeName}
                    history={data.uptimeHistory}
                    uptimeFormatted={node.uptimeFormatted}
                    showPercentage={true}
                    duration={selectedRange}
                  />
                  <div className="mt-3 grid grid-cols-1 gap-4 border-t border-white/5 pt-3 text-xs sm:grid-cols-2">
                    <div>
                      <span className="text-neutral-500">{t.boot_time}</span>
                      <div className="mt-1 font-medium text-neutral-300">
                        {node.bootTimeReadable}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-500">{t.uptime}</span>
                      <div className="mt-1 font-medium text-neutral-300">
                        {node.uptimeFormatted} ({node.uptimeSeconds.toFixed(0)} seconds)
                      </div>
                    </div>
                  </div>
                </SoftPanel>
              ))}
            </div>

            {/* System Summary with Kleff accent */}
            <div className="mt-8">
              <SoftPanel>
                <div className="mb-4 flex items-center gap-2">
                  <KleffDot size={16} variant="dot" />
                  <h3 className="text-sm font-semibold text-neutral-200">{t.system_summary}</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-[rgb(245,181,23)]/20">
                    <div className="text-xs text-neutral-400">{t.total_nodes}</div>
                    <div className="mt-1 text-2xl font-semibold text-neutral-100">
                      {data.nodeUptimes.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-[rgb(245,181,23)]/20">
                    <div className="text-xs text-neutral-400">{t.average_uptime}</div>
                    <div className="mt-1 text-2xl font-semibold text-neutral-100">
                      {data.averageUptimeFormatted}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-[rgb(245,181,23)]/20">
                    <div className="text-xs text-neutral-400">{t.system_uptime}</div>
                    <div className="mt-1 text-2xl font-semibold text-neutral-100">
                      {data.systemUptimeFormatted}
                    </div>
                  </div>
                </div>
              </SoftPanel>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
