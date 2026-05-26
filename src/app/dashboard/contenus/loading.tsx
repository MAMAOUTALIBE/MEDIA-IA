import { TableSkeleton } from "@/components/ui/loading-skeletons";

export default function ContenusLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-32 animate-pulse rounded-md bg-white/[0.05]" />
          <div className="h-4 w-96 animate-pulse rounded-md bg-white/[0.03]" />
        </div>
        <div className="h-10 w-44 animate-pulse rounded-xl bg-white/[0.05]" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025]">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div className="h-9 w-80 animate-pulse rounded-lg bg-white/[0.04]" />
          <div className="h-9 w-64 animate-pulse rounded-lg bg-white/[0.04]" />
        </div>
        <div className="p-4">
          <TableSkeleton rows={10} columns={6} />
        </div>
      </div>
    </div>
  );
}
