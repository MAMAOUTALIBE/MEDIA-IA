"use client";

import { useKpis } from "@/lib/queries";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard, KpiCardSkeleton } from "./kpi-card";

export function KpiRow() {
  const { data, error, isError, isLoading, refetch } = useKpis();
  if (isError) {
    return (
      <GlassCard>
        <ApiErrorState error={error} onRetry={() => void refetch()} />
      </GlassCard>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {data.map((m) => (
        <KpiCard key={m.key} metric={m} />
      ))}
    </div>
  );
}
