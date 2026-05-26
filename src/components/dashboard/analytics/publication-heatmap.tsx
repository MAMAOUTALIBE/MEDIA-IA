"use client";

import { useMemo } from "react";
import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { publicationHeatmap, heatmapTotals, type HeatmapDay } from "@/lib/mocks/publication-heatmap";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, getDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Flame } from "lucide-react";
import { formatNumber } from "@/lib/format";

const intensityClasses = [
  "bg-white/[0.04] ring-white/[0.04]",
  "bg-accent-violet/15 ring-accent-violet/15",
  "bg-accent-violet/30 ring-accent-violet/25",
  "bg-accent-violet/55 ring-accent-violet/40",
  "bg-accent-violet ring-accent-violet/60",
];

export function PublicationHeatmap() {
  // Build columns of 7 days (Mon-Sun)
  const columns = useMemo(() => {
    // Group consecutive days into weeks. Pad leading nulls so the first week aligns to weekday.
    const first = publicationHeatmap[0]!;
    const firstWeekday = (getDay(parseISO(first.date)) + 6) % 7; // Mon=0 ... Sun=6
    const padded: (HeatmapDay | null)[] = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...publicationHeatmap,
    ];
    const out: Array<Array<HeatmapDay | null>> = [];
    for (let i = 0; i < padded.length; i += 7) {
      out.push(padded.slice(i, i + 7));
    }
    return out;
  }, []);

  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    columns.forEach((week, idx) => {
      const firstReal = week.find((d) => d !== null);
      if (!firstReal) return;
      const m = parseISO(firstReal.date).getMonth();
      if (m !== lastMonth) {
        labels.push({ col: idx, label: format(parseISO(firstReal.date), "MMM", { locale: fr }) });
        lastMonth = m;
      }
    });
    return labels;
  }, [columns]);

  return (
    <GlassCard className="overflow-hidden">
      <GlassCardHeader
        title="Intensité de publication"
        description="Heatmap des 365 derniers jours"
        action={
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-text-secondary">
              <strong className="text-text-primary tabular-nums">
                {formatNumber(heatmapTotals.total)}
              </strong>{" "}
              publications
            </span>
            <span className="text-text-secondary">
              <strong className="text-text-primary tabular-nums">
                {heatmapTotals.averagePerDay}
              </strong>{" "}
              / jour
            </span>
            <span className="text-text-secondary">
              <strong className="text-text-primary tabular-nums">
                {heatmapTotals.activeDays}
              </strong>{" "}
              jours actifs
            </span>
          </div>
        }
      />
      <div className="overflow-x-auto p-5">
        <div className="min-w-[760px]">
          {/* Month labels */}
          <div className="relative ml-7 h-4">
            {monthLabels.map((m) => (
              <span
                key={`${m.col}-${m.label}`}
                className="absolute text-[10px] uppercase tracking-wider text-text-muted"
                style={{ left: `${m.col * 14}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] pr-2 text-[9px] text-text-muted">
              {["Lun", "", "Mer", "", "Ven", "", "Dim"].map((d, i) => (
                <span key={i} className="flex h-3 items-center">
                  {d}
                </span>
              ))}
            </div>
            {/* Grid */}
            <div className="flex gap-[2px]">
              {columns.map((week, ci) => (
                <div key={ci} className="flex flex-col gap-[2px]">
                  {week.map((d, ri) => {
                    if (!d) {
                      return <span key={ri} className="h-3 w-3" aria-hidden />;
                    }
                    return (
                      <Tooltip key={ri}>
                        <TooltipTrigger
                          className={`h-3 w-3 rounded-[3px] ring-1 ${intensityClasses[d.intensity]} hover:ring-2 hover:ring-white/30`}
                          aria-label={`${d.count} publications le ${d.date}`}
                        />
                        <TooltipContent>
                          <div className="text-[11px]">
                            <p className="font-semibold capitalize text-text-primary">
                              {format(parseISO(d.date), "EEEE d MMMM yyyy", { locale: fr })}
                            </p>
                            <p className="text-text-secondary">
                              {d.count === 0
                                ? "Aucune publication"
                                : `${d.count} publication${d.count > 1 ? "s" : ""}`}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-between">
            <p className="inline-flex items-center gap-1 text-[10px] text-text-secondary">
              <Flame size={10} className="text-warning" />
              Pic : {heatmapTotals.best.count} publications le{" "}
              {format(parseISO(heatmapTotals.best.date), "d MMMM", { locale: fr })}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span>Moins</span>
              {intensityClasses.map((c, i) => (
                <span key={i} className={`h-3 w-3 rounded-[3px] ring-1 ${c}`} />
              ))}
              <span>Plus</span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
