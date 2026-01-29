import { Skeleton } from "@shared/ui/Skeleton";
import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ResourceUtilization } from "../types/metrics";

interface Props {
  title: string;
  data: ResourceUtilization;
  color?: string;
  loading?: boolean;
  showDebug?: boolean;
}

export const ResourceChart: React.FC<Props> = ({
  title,
  data,
  color = "#fbbf24",
  loading,
  showDebug = false
}) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-6">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  // Normalize timestamps: server may return seconds or milliseconds
  const normalize = (ts: number) => {
    // if ts looks like seconds (around 1e9), convert to ms
    if (ts < 1e12) return ts * 1000;
    return ts;
  };

  const chartData = (data.history || [])
    .slice()
    .map((p) => ({ ...p, timestamp: normalize(p.timestamp) }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((point) => ({
      timestamp: point.timestamp,
      timeLabel: new Date(point.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      value: point.value
    }));

  const points = chartData.length;
  let spanSec = 0;
  if (points > 1) {
    spanSec = Math.max(0, (chartData[points - 1].timestamp - chartData[0].timestamp) / 1000);
  }

  const formatSpan = (s: number) => {
    if (s < 60) return `${Math.round(s)}s`;
    if (s < 3600) return `${Math.round(s / 60)}m`;
    return `${(s / 3600).toFixed(1)}h`;
  };

  const tickOptions: Intl.DateTimeFormatOptions =
    spanSec < 60
      ? { hour: "2-digit", minute: "2-digit", second: "2-digit" }
      : spanSec < 3600
        ? { hour: "2-digit", minute: "2-digit" }
        : { month: "short", day: "numeric", hour: "2-digit" };

  const timeFormatter = (ts: number | string) => {
    const n = typeof ts === "number" ? ts : Number(ts);
    return new Date(n).toLocaleTimeString("en-US", tickOptions);
  };

  // Use a full formatter for the displayed start/end so small ranges are explicit
  const fullTimeFormatter = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

  const formattedStart = points > 0 ? fullTimeFormatter(chartData[0].timestamp) : "-";
  const formattedEnd = points > 0 ? fullTimeFormatter(chartData[points - 1].timestamp) : "-";

  const trendClasses = {
    up: "bg-emerald-500/10 text-emerald-500",
    down: "bg-red-500/10 text-red-500",
    stable: "bg-amber-500/10 text-amber-500"
  };

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-6 transition-all duration-200 hover:border-neutral-600">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-3">
          <div className="text-[22px] font-bold text-white">
            {data.currentValue?.toFixed(1) ?? "0.0"}%
          </div>
          <div
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${trendClasses[data.trend as keyof typeof trendClasses] || trendClasses.stable}`}
          >
            {(data.changePercent ?? 0) > 0 ? "+" : ""}
            {data.changePercent?.toFixed(1) ?? "0.0"}%
          </div>
          {showDebug && (
            <>
              <div className="text-xs text-neutral-400" title="Data span and points">
                {points} pts · {formatSpan(spanSec)}
              </div>
              <div className="text-xs font-normal text-neutral-500">
                {formattedStart} — {formattedEnd}
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              stroke="#a0a0a0"
              style={{ fontSize: "12px" }}
              tickLine={false}
              tickFormatter={timeFormatter}
              scale="time"
            />
            <YAxis
              stroke="#a0a0a0"
              style={{ fontSize: "12px" }}
              tickLine={false}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                color: "#fff"
              }}
              formatter={(value: number | string | undefined) => [
                `${Number(value || 0).toFixed(2)}%`,
                "Usage"
              ]}
              labelFormatter={(label) => timeFormatter(label as number)}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${title})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
