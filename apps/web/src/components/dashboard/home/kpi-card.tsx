"use client";

import { GlassCard } from "@/components/ui/glass-card";
import type { KpiMetric } from "@/types";
import { formatCompact, formatDelta, formatNumber, formatPercent } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

function formatValue(m: KpiMetric): string {
  if (m.formatter === "percent") return formatPercent(m.value);
  if (m.formatter === "compact") return formatCompact(m.value);
  return formatNumber(m.value);
}

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const isUp = metric.trend === "up";
  const data = metric.sparkline.map((v, i) => ({ i, v }));
  const stroke = isUp ? "#34d399" : "#f87171";
  return (
    <GlassCard className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 bottom-0 h-16 opacity-50">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`sparkline-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.5} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={1.6}
              fill={`url(#sparkline-${metric.key})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="relative">
        <p className="text-xs font-medium text-text-secondary">{metric.label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
          {formatValue(metric)}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              isUp
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger",
            )}
          >
            {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {formatDelta(metric.delta)}
          </span>
          <span className="text-[11px] text-text-muted">vs mois précédent</span>
        </div>
      </div>
    </GlassCard>
  );
}

export function KpiCardSkeleton() {
  return <GlassCard className="h-32 animate-pulse bg-white/[0.025]" />;
}
