"use client";

import { useEffect, useState } from "react";
import { Radio, Eye } from "lucide-react";
import { formatCompact } from "@/lib/format";

export function LiveBanner() {
  const [viewers, setViewers] = useState(48_215);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => {
        // Random walk ±200 around current value, with mild upward drift
        const drift = Math.round((Math.random() - 0.45) * 420);
        return Math.max(20_000, v + drift);
      });
      setTick((t) => t + 1);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-danger/20 bg-gradient-to-r from-danger/15 via-danger/8 to-transparent p-3 ring-1 ring-danger/10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-danger/20 blur-3xl"
      />
      <div className="relative flex flex-wrap items-center gap-3">
        <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
        </span>
        <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger ring-1 ring-danger/30">
          En direct
        </span>
        <span className="flex items-center gap-2">
          <Radio size={14} className="text-text-secondary" />
          <p className="text-sm font-semibold text-text-primary">
            Journal de 20h — Édition spéciale Élections régionales
          </p>
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-text-secondary">
          <Eye size={13} />
          <span
            key={tick}
            className="font-semibold tabular-nums text-text-primary"
          >
            {formatCompact(viewers)}
          </span>
          <span>spectateurs</span>
        </span>
      </div>
    </div>
  );
}
