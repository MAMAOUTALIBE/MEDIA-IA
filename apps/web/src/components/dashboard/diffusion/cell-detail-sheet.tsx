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
import { formatCompact, formatHour, formatRelative } from "@/lib/format";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Minus,
  Send,
  RefreshCcw,
  Eye,
  Heart,
  TrendingUp,
  X,
  AlertTriangle,
} from "lucide-react";
import type { ChannelKey } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Status = "published" | "scheduled" | "failed" | "na";

export interface DiffusionCell {
  contentId: string;
  contentTitle: string;
  channel: ChannelKey;
  status: Status;
}

const statusMeta: Record<Status, { color: string; bg: string; ring: string; label: string; icon: React.ComponentType<{ size?: number }> }> = {
  published: { color: "text-success", bg: "bg-success-soft", ring: "ring-success/30", label: "Publié", icon: CheckCircle2 },
  scheduled: { color: "text-info", bg: "bg-info-soft", ring: "ring-info/30", label: "Programmé", icon: Clock },
  failed: { color: "text-danger", bg: "bg-danger-soft", ring: "ring-danger/30", label: "Échec", icon: XCircle },
  na: { color: "text-text-muted", bg: "bg-white/[0.03]", ring: "ring-white/[0.06]", label: "Non concerné", icon: Minus },
};

// Format variants per channel
const formatsByChannel: Record<ChannelKey, string[]> = {
  web: ["1080p HLS", "720p fallback", "Article AMP", "Image OG 1200×630"],
  mobile: ["1080p H.264", "720p efficient", "Vignette 16:9"],
  youtube: ["1080p60 H.264", "Chapitres auto", "Vignette 16:9", "Sous-titres FR auto"],
  facebook: ["1080p natif", "Vignette 16:9", "Texte d'accroche IA"],
  instagram: ["Reels 9:16", "Cover 1:1", "Sous-titres burned-in"],
  twitter: ["1080p 16:9 max 2:20", "Image 16:9", "Tweet IA généré"],
  tiktok: ["Vertical 9:16", "Hashtags IA", "Sous-titres burned-in"],
  telegram: ["Article + image 1200×630", "Lien preview"],
  smarttv: ["4K HEVC", "1080p H.264 fallback", "Audio 5.1"],
};

const baseTimelines: Record<Status, Array<{ step: string; at?: string; done: boolean; current?: boolean; failed?: boolean; note?: string }>> = {
  published: [
    { step: "Réception", at: "10:00:02", done: true },
    { step: "Adaptation formats", at: "10:00:48", done: true },
    { step: "Encodage", at: "10:02:14", done: true },
    { step: "Push canal", at: "10:02:31", done: true, note: "ack 200 OK" },
    { step: "Publication confirmée", at: "10:02:35", done: true },
  ],
  scheduled: [
    { step: "Programmé", at: "à 19:00", done: true },
    { step: "Adaptation formats", done: false, current: true, note: "en file d'attente" },
    { step: "Encodage", done: false },
    { step: "Push canal", done: false },
    { step: "Publication", done: false },
  ],
  failed: [
    { step: "Réception", at: "10:00:02", done: true },
    { step: "Adaptation formats", at: "10:00:48", done: true },
    { step: "Encodage", at: "10:02:14", done: true },
    { step: "Push canal", at: "10:02:31", done: false, failed: true, note: "401 Unauthorized — token API expiré" },
    { step: "Publication", done: false },
  ],
  na: [],
};

function metricsFor(channel: ChannelKey, status: Status) {
  if (status !== "published") return null;
  const seedHash = channel.length * 17 + channel.charCodeAt(0);
  const views = 1200 + (seedHash * 313) % 84000;
  const engagement = (3 + (seedHash % 80) / 10).toFixed(1);
  const likes = Math.round(views * (0.04 + (seedHash % 12) / 100));
  return { views, engagement, likes };
}

export function CellDetailSheet({
  cell,
  onOpenChange,
}: {
  cell: DiffusionCell | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!cell;
  if (!cell) return <Sheet open={false} onOpenChange={onOpenChange} />;

  const channelMeta = CHANNELS[cell.channel];
  const sMeta = statusMeta[cell.status];
  const StatusIcon = sMeta.icon;
  const formats = formatsByChannel[cell.channel];
  const timeline = baseTimelines[cell.status];
  const metrics = metricsFor(cell.channel, cell.status);

  function handleRepublish() {
    toast.info("Re-publication relancée", {
      description: `Nouveau push sur ${channelMeta.label} en cours…`,
    });
    onOpenChange(false);
  }

  function handleSchedule() {
    toast.success("Re-programmation enregistrée", {
      description: `${channelMeta.label} — fenêtre optimale prédite par l'IA : 18:42`,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-full !max-w-lg flex flex-col border-l border-white/[0.08] bg-bg-card/95 p-0 backdrop-blur-2xl"
        showCloseButton={false}
      >
        <SheetHeader className="!gap-1 border-b border-white/[0.06] !p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ChannelIcon channel={cell.channel} size={24} decorated />
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="!text-base !font-bold !text-text-primary">
                    {channelMeta.label}
                  </SheetTitle>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                      sMeta.bg,
                      sMeta.color,
                      sMeta.ring,
                    )}
                  >
                    <StatusIcon size={9} />
                    {sMeta.label}
                  </span>
                </div>
                <SheetDescription className="!mt-1 !text-xs !text-text-secondary">
                  {cell.contentTitle}
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {cell.status === "na" ? (
            <div className="rounded-2xl bg-white/[0.025] p-5 ring-1 ring-white/[0.06]">
              <div className="flex items-center gap-3">
                <Minus size={18} className="text-text-muted" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Ce canal n&apos;est pas concerné
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Le contenu n&apos;a pas {channelMeta.label} dans ses canaux cibles. Ajoutez-le depuis la page d&apos;édition.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Timeline */}
              <section>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Pipeline de diffusion
                </p>
                <ol className="relative space-y-3 pl-4">
                  <span
                    className="absolute left-1.5 top-1 h-[calc(100%-1.5rem)] w-px bg-white/[0.06]"
                    aria-hidden
                  />
                  {timeline.map((t, i) => (
                    <li key={i} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[14px] top-1 h-3 w-3 rounded-full ring-2 ring-bg-card",
                          t.failed
                            ? "bg-danger"
                            : t.done
                              ? "bg-success"
                              : t.current
                                ? "bg-warning animate-pulse"
                                : "bg-white/15",
                        )}
                        aria-hidden
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "text-xs font-medium",
                            t.done || t.failed
                              ? "text-text-primary"
                              : "text-text-secondary",
                          )}
                        >
                          {t.step}
                        </p>
                        {t.at && (
                          <span className="font-mono text-[10px] tabular-nums text-text-muted">
                            {t.at}
                          </span>
                        )}
                      </div>
                      {t.note && (
                        <p
                          className={cn(
                            "mt-0.5 text-[11px]",
                            t.failed ? "text-danger" : "text-text-muted",
                          )}
                        >
                          {t.failed && <AlertTriangle size={10} className="mr-1 inline" />}
                          {t.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>

              {/* Formats */}
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Formats adaptés
                </p>
                <div className="flex flex-wrap gap-2">
                  {formats.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-text-secondary ring-1 ring-white/[0.06]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </section>

              {/* Metrics */}
              {metrics && (
                <section>
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Performance sur ce canal
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <MetricTile icon={Eye} label="Vues" value={formatCompact(metrics.views)} color="#60a5fa" />
                    <MetricTile icon={Heart} label="Likes" value={formatCompact(metrics.likes)} color="#f472b6" />
                    <MetricTile icon={TrendingUp} label="Engagement" value={`${metrics.engagement}%`} color="#10b981" />
                  </div>
                </section>
              )}

              {/* Metadata */}
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Métadonnées canal
                </p>
                <dl className="grid grid-cols-2 gap-2 text-[11px]">
                  <MetaRow label="Compte" value={`@cmrtv · ${channelMeta.label}`} />
                  <MetaRow label="Audience" value="3.2M abonnés" />
                  <MetaRow label="Dernière sync API" value={formatRelative("2026-05-26T10:48:00")} />
                  <MetaRow
                    label="Horaire de poste"
                    value={cell.status === "scheduled" ? "19:00" : formatHour("2026-05-26T10:02:35")}
                  />
                </dl>
              </section>
            </>
          )}
        </div>

        {(cell.status === "failed" || cell.status === "scheduled") && (
          <div className="border-t border-white/[0.06] p-4">
            {cell.status === "failed" ? (
              <button
                type="button"
                onClick={handleRepublish}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2.5 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95"
              >
                <RefreshCcw size={14} />
                Re-publier maintenant
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSchedule}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-white/[0.08]"
              >
                <Send size={14} />
                Reprogrammer à la fenêtre IA optimale
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.06]">
      <span style={{ color }} className="inline-flex">
        <Icon size={12} />
      </span>
      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="text-sm font-bold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="truncate text-right font-medium text-text-primary">{value}</dd>
    </>
  );
}
