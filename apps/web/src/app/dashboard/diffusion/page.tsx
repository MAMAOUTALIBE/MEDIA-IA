"use client";

import { useState } from "react";
import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { useDiffusionMatrix } from "@/lib/queries";
import { CHANNELS, CHANNEL_ORDER } from "@/lib/constants";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { CheckCircle2, Clock, XCircle, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format";
import type { ChannelKey } from "@/types";
import { CellDetailSheet, type DiffusionCell } from "@/components/dashboard/diffusion/cell-detail-sheet";

type Status = "published" | "scheduled" | "failed" | "na";

const statusMeta: Record<Status, { color: string; bg: string; icon: React.ComponentType<{ size?: number }>; label: string }> = {
  published: { color: "text-success", bg: "bg-success-soft", icon: CheckCircle2, label: "Publié" },
  scheduled: { color: "text-info", bg: "bg-info-soft", icon: Clock, label: "Programmé" },
  failed: { color: "text-danger", bg: "bg-danger-soft", icon: XCircle, label: "Échec" },
  na: { color: "text-text-muted", bg: "bg-white/[0.03]", icon: Minus, label: "Non concerné" },
};

export default function DiffusionPage() {
  const { data } = useDiffusionMatrix();
  const matrix = data?.matrix ?? [];
  const stats = data?.stats ?? { publishedToday: 0, scheduled: 0, failed: 0 };
  const [openCell, setOpenCell] = useState<DiffusionCell | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Diffusion omnicanale</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Suivi en temps réel de la publication sur les 9 canaux digitaux.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard className="p-5">
          <p className="text-xs text-text-secondary">Publications aujourd&apos;hui</p>
          <p className="mt-2 text-3xl font-bold text-text-primary">
            {formatNumber(stats.publishedToday)}
          </p>
          <span className="mt-1 inline-block text-[11px] text-success">↑ +12% vs hier</span>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs text-text-secondary">Programmées</p>
          <p className="mt-2 text-3xl font-bold text-text-primary">{formatNumber(stats.scheduled)}</p>
          <span className="mt-1 inline-block text-[11px] text-text-muted">À venir dans les 24h</span>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs text-text-secondary">Échecs</p>
          <p className="mt-2 text-3xl font-bold text-danger">{formatNumber(stats.failed)}</p>
          <span className="mt-1 inline-block text-[11px] text-text-muted">Nécessitent une action</span>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden">
        <GlassCardHeader
          title="Matrice de diffusion"
          description="Statut de publication par contenu et par canal"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-muted">
                <th className="sticky left-0 z-10 min-w-72 bg-bg-card/95 px-4 py-3 font-medium backdrop-blur">Contenu</th>
                {CHANNEL_ORDER.map((ch) => (
                  <th key={ch} className="px-2 py-3 text-center font-medium">
                    <div className="mx-auto flex flex-col items-center gap-1">
                      <ChannelIcon channel={ch} size={14} />
                      <span className="text-[10px]" style={{ color: CHANNELS[ch].color }}>
                        {CHANNELS[ch].label}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {matrix.map((row) => (
                <tr key={row.contentId} className="transition hover:bg-white/[0.03]">
                  <td className="sticky left-0 z-10 bg-bg-card/95 px-4 py-3 backdrop-blur">
                    <p className="line-clamp-1 text-xs font-medium text-text-primary">{row.contentTitle}</p>
                  </td>
                  {CHANNEL_ORDER.map((ch) => {
                    const status = (row.byChannel[ch as ChannelKey] ?? "na") as Status;
                    const meta = statusMeta[status];
                    const Icon = meta.icon;
                    return (
                      <td key={ch} className="px-2 py-3 text-center">
                        <Tooltip>
                          <TooltipTrigger
                            onClick={() =>
                              setOpenCell({
                                contentId: row.contentId,
                                contentTitle: row.contentTitle,
                                channel: ch as ChannelKey,
                                status,
                              })
                            }
                            className={`mx-auto inline-flex h-7 w-7 items-center justify-center rounded-md ${meta.bg} ${meta.color} transition hover:scale-110 hover:ring-2 hover:ring-white/15`}
                            aria-label={`${CHANNELS[ch].label} — ${meta.label} — voir détail`}
                          >
                            <Icon size={12} />
                          </TooltipTrigger>
                          <TooltipContent>
                            {CHANNELS[ch].label} — {meta.label} · clic pour détail
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <CellDetailSheet
        cell={openCell}
        onOpenChange={(o) => {
          if (!o) setOpenCell(null);
        }}
      />
    </div>
  );
}
