"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { useCalendarEvents } from "@/lib/queries";
import type { CalendarEvent } from "@/types";
import { CHANNELS } from "@/lib/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DayDetailSheet } from "@/components/dashboard/calendrier/day-detail-sheet";

export default function CalendrierPage() {
  const { data, error, isError, refetch } = useCalendarEvents();
  const [cursor, setCursor] = useState(new Date("2026-05-15"));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const monthLabel = format(cursor, "MMMM yyyy", { locale: fr });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (data ?? []).forEach((e) => {
      const key = e.date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    return map;
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Calendrier éditorial</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Planning de publication par canal et par contenu.
        </p>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
              aria-label="Mois précédent"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
              aria-label="Mois suivant"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date("2026-05-15"))}
              className="ml-2 h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-medium text-text-secondary transition hover:bg-white/[0.06]"
            >
              Aujourd&apos;hui
            </button>
          </div>
          <p className="text-base font-semibold capitalize text-text-primary">{monthLabel}</p>
        </div>
        {isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : (
        <>
        <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase tracking-wider text-text-muted">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="px-3 py-2 text-center font-semibold">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const events = eventsByDay.get(key) ?? [];
            const muted = !isSameMonth(d, cursor);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={cn(
                  "block w-full min-h-28 cursor-pointer border-b border-r border-white/[0.04] p-2 text-left transition hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-violet/40",
                  muted && "bg-white/[0.01]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday(d)
                        ? "bg-accent-violet/20 font-bold text-accent-violet"
                        : muted
                          ? "text-text-muted"
                          : "text-text-primary",
                    )}
                  >
                    {format(d, "d")}
                  </span>
                  {events.length > 0 && (
                    <span className="text-[10px] text-text-muted">{events.length}</span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1">
                  {events.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-white/[0.06]"
                      style={{
                        background: CHANNELS[e.channel].bg,
                        color: CHANNELS[e.channel].color,
                      }}
                      title={e.title}
                    >
                      {e.title}
                    </div>
                  ))}
                  {events.length > 2 && (
                    <p className="text-[10px] text-text-muted">+{events.length - 2}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        </>
        )}
      </GlassCard>

      {!isError && <DayDetailSheet
        date={selectedDay}
        events={
          selectedDay
            ? eventsByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? []
            : []
        }
        onOpenChange={(o) => {
          if (!o) setSelectedDay(null);
        }}
      />}
    </div>
  );
}
