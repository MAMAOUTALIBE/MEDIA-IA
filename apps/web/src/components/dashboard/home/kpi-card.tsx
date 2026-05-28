"use client";

import { GlassCard } from "@/components/ui/glass-card";
import type { KpiMetric } from "@/types";
import { formatCompact, formatDelta, formatNumber, formatPercent } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { ClientOnlyChart } from "@/components/ui/client-only-chart";

function formatValue(m: KpiMetric): string {
  if (m.formatter === "percent") return formatPercent(m.value);
  if (m.formatter === "compact") return formatCompact(m.value);
  return formatNumber(m.value);
}

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const isUp = metric.trend === "up";
  const data = metric.sparkline.map((v, i) => ({ i, v }));
  const stroke = isUp ? "#34d399" : "#f87171";
  const haloColor = isUp ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)";

  return (
    <GlassCard
      variant="premium"
      interactive
      className="shimmer-on-hover relative overflow-hidden p-5"
    >
      {/* Trend-tinted halo that bleeds into the corner — gives the card a
          quick at-a-glance mood (green=up, red=down) without a flat color band. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 right-0 h-32 w-32 rounded-full opacity-60 blur-3xl"
        style={{ background: haloColor }}
      />
      {/* Sparkline anchored at the bottom — increased height + smoother curve
          + dual-stop gradient = a more cinematic chart at the same height. */}
      <div className="absolute inset-x-0 bottom-0 h-20 opacity-70">
        <ClientOnlyChart>
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`sparkline-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.55} />
                  <stop offset="60%" stopColor={stroke} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={stroke}
                strokeWidth={1.8}
                strokeOpacity={0.95}
                fill={`url(#sparkline-${metric.key})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ClientOnlyChart>
      </div>

      <div className="relative">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary">
          {metric.label}
        </p>
        <p className="mt-3 text-[2rem] font-bold leading-none tracking-tight text-text-primary">
          {formatValue(metric)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
              isUp
                ? "bg-success-soft text-success ring-success/20"
                : "bg-danger-soft text-danger ring-danger/20",
            )}
          >
            {isUp ? <ArrowUpRight size={12} aria-hidden /> : <ArrowDownRight size={12} aria-hidden />}
            {formatDelta(metric.delta)}
          </span>
          <span className="text-[11px] text-text-muted">vs mois précédent</span>
        </div>
      </div>
    </GlassCard>
  );
}

export function KpiCardSkeleton() {
  return (
    <GlassCard
      variant="premium"
      className="relative h-32 overflow-hidden"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-white/[0.02] via-white/[0.05] to-white/[0.02]" />
    </GlassCard>
  );
}
