import { GlassCard } from "@/components/ui/glass-card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-white/[0.05]" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-white/[0.03]" />
      </div>

      {/* Breaking news + live banner skeletons */}
      <div className="h-12 animate-pulse rounded-2xl bg-white/[0.025]" />
      <div className="h-14 animate-pulse rounded-2xl bg-white/[0.025]" />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} className="h-32 animate-pulse bg-white/[0.025]" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <GlassCard className="h-96 animate-pulse bg-white/[0.025]" />
        </div>
        <div className="lg:col-span-4">
          <GlassCard className="h-96 animate-pulse bg-white/[0.025]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <GlassCard className="h-80 animate-pulse bg-white/[0.025]" />
        </div>
        <div className="lg:col-span-5">
          <GlassCard className="h-80 animate-pulse bg-white/[0.025]" />
        </div>
      </div>
    </div>
  );
}
