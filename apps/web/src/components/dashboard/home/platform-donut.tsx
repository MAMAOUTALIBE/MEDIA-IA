"use client";

import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { CHANNELS } from "@/lib/constants";
import { usePlatformShares } from "@/lib/queries";
import { ClientOnlyChart } from "@/components/ui/client-only-chart";
import { ApiErrorState } from "@/components/ui/api-error-state";

export function PlatformDonut() {
  const { data, error, isError, refetch } = usePlatformShares();
  const shares = data ?? [];
  return (
    <GlassCard className="flex h-full flex-col">
      <GlassCardHeader
        title="Répartition par plateforme"
        description="Part d'audience par canal"
      />
      {isError ? (
        <ApiErrorState error={error} onRetry={() => void refetch()} />
      ) : (
      <div className="flex flex-1 items-center gap-4 p-5">
        <div className="relative h-44 w-44 shrink-0">
          <ClientOnlyChart>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={shares}
                  dataKey="share"
                  nameKey="channel"
                  innerRadius={48}
                  outerRadius={84}
                  paddingAngle={2}
                  stroke="rgba(0,0,0,0.4)"
                >
                  {shares.map((s) => (
                    <Cell key={s.channel} fill={CHANNELS[s.channel].color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-text-primary">100%</p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">9 canaux</p>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {shares.map((s) => (
            <li
              key={s.channel}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: CHANNELS[s.channel].color }}
              />
              <span className="flex-1 truncate text-text-secondary">
                {CHANNELS[s.channel].label}
              </span>
              <span className="font-semibold text-text-primary">{s.share}%</span>
            </li>
          ))}
        </ul>
      </div>
      )}
    </GlassCard>
  );
}
