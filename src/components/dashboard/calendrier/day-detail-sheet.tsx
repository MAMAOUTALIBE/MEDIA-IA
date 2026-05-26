"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { CHANNELS } from "@/lib/constants";
import { formatHour } from "@/lib/format";
import type { CalendarEvent, ContentType } from "@/types";
import {
  FileText,
  Video,
  Mic,
  Sparkles,
  X,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const typeIcon: Record<ContentType, React.ComponentType<{ size?: number; className?: string }>> = {
  article: FileText,
  video: Video,
  audio: Mic,
  social: Sparkles,
};

export function DayDetailSheet({
  date,
  events,
  onOpenChange,
}: {
  date: Date | null;
  events: CalendarEvent[];
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!date;
  if (!date) return <Sheet open={false} onOpenChange={onOpenChange} />;

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const dayLabel = format(date, "EEEE d MMMM yyyy", { locale: fr });
  const grouped: Record<string, CalendarEvent[]> = {};
  sorted.forEach((e) => {
    const hour = format(new Date(e.date), "HH:mm");
    grouped[hour] = grouped[hour] ?? [];
    grouped[hour].push(e);
  });

  function handleSchedule() {
    toast.success("Création de publication", {
      description: `Le créneau du ${format(date!, "d MMMM 'à' HH:mm", { locale: fr })} est sélectionné.`,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-full !max-w-md flex flex-col border-l border-white/[0.08] bg-bg-card/95 p-0 backdrop-blur-2xl"
        showCloseButton={false}
      >
        <SheetHeader className="!gap-1 border-b border-white/[0.06] !p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-violet/20 text-accent-violet ring-1 ring-white/[0.08]">
                <CalendarIcon size={18} />
              </span>
              <div>
                <SheetTitle className="!text-base !font-bold capitalize !text-text-primary">
                  {dayLabel}
                </SheetTitle>
                <SheetDescription className="!mt-0.5 !text-[11px] !text-text-secondary">
                  {sorted.length} publication{sorted.length > 1 ? "s" : ""} programmée{sorted.length > 1 ? "s" : ""}
                </SheetDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-blue/12 to-accent-violet/10 text-accent-violet ring-1 ring-white/[0.08]">
                <CalendarIcon size={22} />
              </span>
              <p className="text-sm font-semibold text-text-primary">Journée libre</p>
              <p className="max-w-xs text-xs text-text-secondary">
                Aucune publication n&apos;est programmée pour ce jour. Profitez-en pour planifier un contenu.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-4 pl-5">
              <span className="absolute left-1.5 top-2 h-[calc(100%-2rem)] w-px bg-white/[0.06]" aria-hidden />
              {Object.entries(grouped).map(([hour, items]) => (
                <li key={hour} className="relative">
                  <span className="absolute -left-[14px] top-1.5 h-3 w-3 rounded-full bg-gradient-to-br from-accent-blue to-accent-violet ring-2 ring-bg-card" aria-hidden />
                  <p className="font-mono text-[11px] font-bold tabular-nums text-accent-violet">
                    {hour}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {items.map((e) => {
                      const Icon = typeIcon[e.contentType];
                      const channelMeta = CHANNELS[e.channel];
                      return (
                        <li
                          key={e.id}
                          className="flex items-center gap-3 rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.06] transition hover:bg-white/[0.04]"
                        >
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
                            <Icon size={14} className="text-text-secondary" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {e.title}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <ChannelIcon channel={e.channel} size={11} />
                              <span
                                className="text-[10px] font-medium"
                                style={{ color: channelMeta.color }}
                              >
                                {channelMeta.label}
                              </span>
                              <span className="text-[10px] text-text-muted">·</span>
                              <span className="text-[10px] text-text-muted">
                                {formatHour(e.date)}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-info-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-info ring-1 ring-info/30">
                            Programmé
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="border-t border-white/[0.06] p-4">
          <button
            type="button"
            onClick={handleSchedule}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2.5 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95"
          >
            <Plus size={14} />
            Programmer une publication ce jour
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
