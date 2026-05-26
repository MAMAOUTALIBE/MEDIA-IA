import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative block overflow-hidden rounded-md bg-white/[0.04]",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full animate-[cmr-shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />
      <style>{`@keyframes cmr-shimmer{100%{transform:translateX(100%)}}`}</style>
    </span>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025]">
      <div className="grid gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer key={i} className="h-3 w-20" />
        ))}
      </div>
      <ul className="divide-y divide-white/[0.05]">
        {Array.from({ length: rows }).map((_, r) => (
          <li key={r} className="grid gap-3 px-4 py-3.5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((__, c) => (
              <Shimmer key={c} className={c === 0 ? "h-4 w-3/4" : "h-3 w-1/2"} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CardGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025]"
        >
          <div className="aspect-[4/3] w-full">
            <Shimmer className="block h-full w-full rounded-none" />
          </div>
          <div className="space-y-2 p-3">
            <Shimmer className="h-3 w-3/4" />
            <Shimmer className="h-2 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
        >
          <Shimmer className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3 w-2/3" />
            <Shimmer className="h-2 w-1/3" />
          </div>
          <Shimmer className="h-7 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
