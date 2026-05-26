"use client";

import { useState } from "react";
import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { useAudienceSeries } from "@/lib/queries";
import type { AudienceRange } from "@/lib/mocks/audience-series";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ranges: { value: AudienceRange; label: string }[] = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
];

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-bg-card/95 px-3 py-2 text-xs shadow-elevated backdrop-blur-xl">
      <p className="mb-1 font-semibold text-text-primary">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-text-secondary capitalize">
            {p.dataKey === "views" ? "Vues" : "Utilisateurs"}
          </span>
          <span className="ml-auto font-semibold text-text-primary">{formatCompact(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function AudienceChart() {
  const [range, setRange] = useState<AudienceRange>("30d");
  const { data } = useAudienceSeries(range);

  const series = (data ?? []).map((d) => ({
    date: d.date.slice(5),
    views: d.views,
    users: d.users,
  }));

  return (
    <GlassCard className="flex flex-col">
      <GlassCardHeader
        title="Statistiques d'audience"
        description="Vues et utilisateurs uniques par jour"
        action={
          <Tabs value={range} onValueChange={(v) => setRange(v as AudienceRange)}>
            <TabsList className="h-8 border border-white/[0.06] bg-white/[0.03] p-0.5">
              {ranges.map((r) => (
                <TabsTrigger key={r.value} value={r.value} className="h-7 px-3 text-xs">
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />
      <div className="h-72 p-3 pr-5 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="audience-views" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="audience-users" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompact(v as number)}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
            <Area
              type="monotone"
              dataKey="views"
              stroke="#60a5fa"
              strokeWidth={2}
              fill="url(#audience-views)"
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#a78bfa"
              strokeWidth={2}
              fill="url(#audience-users)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-5 border-t border-white/[0.06] px-5 py-3 text-xs">
        <span className="inline-flex items-center gap-2 text-text-secondary">
          <span className="inline-block h-2 w-2 rounded-full bg-accent-blue" />
          Vues
        </span>
        <span className="inline-flex items-center gap-2 text-text-secondary">
          <span className="inline-block h-2 w-2 rounded-full bg-accent-violet" />
          Utilisateurs
        </span>
      </div>
    </GlassCard>
  );
}
