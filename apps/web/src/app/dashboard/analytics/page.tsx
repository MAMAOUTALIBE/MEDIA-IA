"use client";

import { useState } from "react";
import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { useAnalyticsDeep } from "@/lib/queries";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCompact, formatPercent } from "@/lib/format";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { CHANNELS } from "@/lib/constants";
import { PublicationHeatmap } from "@/components/dashboard/analytics/publication-heatmap";
import { ClientOnlyChart } from "@/components/ui/client-only-chart";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { PermissionGate } from "@/components/auth/permission-gate";

export default function AnalyticsPage() {
  return (
    <PermissionGate permission="view.analytics">
      <AnalyticsContent />
    </PermissionGate>
  );
}

function AnalyticsContent() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "365d">("30d");
  const { data, error, isError, refetch } = useAnalyticsDeep();
  const engagement = data?.engagementByDayOfWeek ?? [];
  const topContents = data?.topContents ?? [];
  const topChannels = data?.topChannels ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Performances détaillées par contenu, canal et audience.
          </p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <TabsList className="h-9 border border-white/[0.06] bg-white/[0.03] p-0.5">
            <TabsTrigger value="7d" className="h-8 px-3 text-xs">7 jours</TabsTrigger>
            <TabsTrigger value="30d" className="h-8 px-3 text-xs">30 jours</TabsTrigger>
            <TabsTrigger value="90d" className="h-8 px-3 text-xs">90 jours</TabsTrigger>
            <TabsTrigger value="365d" className="h-8 px-3 text-xs">12 mois</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isError ? (
        <GlassCard>
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        </GlassCard>
      ) : (
      <>
      <PublicationHeatmap />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard>
          <GlassCardHeader
            title="Engagement par jour de la semaine"
            description="Taux d'engagement moyen (%)"
          />
          <div className="h-72 p-4">
            <ClientOnlyChart>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={engagement} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v) => [formatPercent(Number(v)), "Engagement"]}
                  />
                  <Bar dataKey="engagement" radius={[8, 8, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </ClientOnlyChart>
          </div>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader title="Top canaux" description="Vues cumulées par canal" />
          <div className="h-72 p-4">
            <ClientOnlyChart>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart
                  data={topChannels}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompact(v as number)}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v) => [formatCompact(Number(v)), "Vues"]}
                  />
                  <Bar dataKey="views" radius={[0, 8, 8, 0]}>
                    {topChannels.map((c) => (
                      <Cell key={c.channel} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ClientOnlyChart>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <GlassCardHeader
          title="Top 10 contenus"
          description="Classement par vues sur la période sélectionnée"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Titre</th>
                <th className="px-4 py-3 font-medium">Canal</th>
                <th className="px-4 py-3 text-right font-medium">Vues</th>
                <th className="px-4 py-3 text-right font-medium">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {topContents.map((tc, i) => (
                <tr key={tc.id} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-xs text-text-muted">#{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">{tc.title}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <ChannelIcon channel={tc.channel} size={14} />
                      <span style={{ color: CHANNELS[tc.channel].color }}>
                        {CHANNELS[tc.channel].label}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-text-primary">{formatCompact(tc.views)}</td>
                  <td className="px-4 py-3 text-right text-xs text-text-primary">
                    {formatPercent(tc.engagement)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      </>
      )}
    </div>
  );
}
