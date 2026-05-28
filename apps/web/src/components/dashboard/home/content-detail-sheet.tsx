"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import type { PendingContent } from "@/types";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { CHANNELS, AI_CHECKS } from "@/lib/constants";
import { aiCheckResults, aiGlobalScore } from "@/lib/mocks/ai-checks";
import { Check, X, FileText, Mic, Sparkles, Video, ShieldCheck, AlertTriangle } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { toast } from "sonner";

const typeIcon = { article: FileText, video: Video, audio: Mic, social: Sparkles };
const channelsByType: Record<string, string[]> = {
  video: ["web", "mobile", "youtube", "facebook"],
  article: ["web", "mobile", "telegram"],
  audio: ["web", "mobile"],
  social: ["instagram", "tiktok"],
};

const stepLabel = { editor: "Rédacteur", chief: "Chef d'édition", direction: "Direction éditoriale" };

export function ContentDetailSheet({
  pending,
  canModerate = true,
  onValidate,
  onReject,
  onOpenChange,
}: {
  pending: PendingContent | null;
  canModerate?: boolean;
  onValidate: (id: string) => void;
  onReject: (id: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!pending;
  if (!pending) {
    return <Sheet open={open} onOpenChange={onOpenChange} />;
  }

  const Icon = typeIcon[pending.type];
  const targetChannels = channelsByType[pending.type] ?? ["web", "mobile"];
  const warnCount = aiCheckResults.filter((r) => r.status !== "passed").length;

  function handleValidate() {
    if (!canModerate) return;
    onValidate(pending!.id);
    toast.success(`« ${pending!.title} » validé`, {
      description: `Étape ${stepLabel[pending!.step]} franchie`,
    });
    onOpenChange(false);
  }
  function handleReject() {
    if (!canModerate) return;
    onReject(pending!.id);
    toast.error(`« ${pending!.title} » rejeté`, {
      description: "Le journaliste a été notifié",
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-full !max-w-xl border-l border-white/[0.08] bg-bg-card/95 backdrop-blur-2xl"
      >
        <SheetHeader className="border-b border-white/[0.06] !p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
              <Icon size={14} className="text-text-secondary" />
            </span>
            <span className="rounded-full bg-accent-violet/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-violet ring-1 ring-accent-violet/25">
              En attente {stepLabel[pending.step]}
            </span>
            <span className="text-[11px] text-text-muted">
              · Soumis {formatRelative(pending.submittedAt)}
            </span>
          </div>
          <SheetTitle className="!mt-3 text-lg font-bold !text-text-primary">
            {pending.title}
          </SheetTitle>
          <SheetDescription className="!mt-0 flex items-center gap-2">
            <InitialsAvatar
              initials={pending.author.initials}
              color={pending.author.color}
              size={20}
            />
            <span>par {pending.author.name}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {pending.thumbnail && (
            <div className="aspect-video overflow-hidden rounded-xl ring-1 ring-white/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://images.unsplash.com/photo-${pending.thumbnail}?w=720&h=420&fit=crop&auto=format`}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Aperçu du contenu
            </p>
            <div className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]">
              <p className="text-sm leading-relaxed text-text-secondary">
                Synthèse rédactionnelle de l&apos;article en attente. Les premières lignes
                permettent de juger de l&apos;angle éditorial, de la conformité au guide
                rédactionnel et de la pertinence du sujet vis-à-vis de la grille
                actuelle. Un clic sur « Voir le contenu complet » ouvre le module
                d&apos;édition WYSIWYG (à venir).
              </p>
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Canaux de diffusion prévus
            </p>
            <div className="flex flex-wrap gap-2">
              {targetChannels.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.025] px-2 py-1 text-[11px] ring-1 ring-white/[0.06]"
                  style={{ color: CHANNELS[c as keyof typeof CHANNELS]?.color }}
                >
                  <ChannelIcon channel={c as never} size={12} />
                  {CHANNELS[c as keyof typeof CHANNELS]?.label}
                </span>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Vérifications IA
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                <ShieldCheck size={11} />
                Score {aiGlobalScore}/100
              </span>
            </div>
            <ul className="space-y-1.5">
              {aiCheckResults.map((r) => (
                <li
                  key={r.type}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.025] px-3 py-2 ring-1 ring-white/[0.04]"
                >
                  <div className="flex items-center gap-2">
                    {r.status === "passed" ? (
                      <Check size={12} className="text-success" />
                    ) : (
                      <AlertTriangle size={12} className="text-warning" />
                    )}
                    <span className="text-xs text-text-primary">{AI_CHECKS[r.type].label}</span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${r.status === "passed" ? "text-success" : "text-warning"}`}
                  >
                    {r.score}/100
                  </span>
                </li>
              ))}
            </ul>
            {warnCount > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-warning">
                <AlertTriangle size={11} />
                {warnCount} recommandation{warnCount > 1 ? "s" : ""} avant publication.
              </p>
            )}
          </section>
        </div>

        <SheetFooter className="border-t border-white/[0.06] !p-5">
          {!canModerate && (
            <p className="mb-3 w-full rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning ring-1 ring-warning/20">
              Votre rôle ne permet pas de valider ou rejeter cette étape.
            </p>
          )}
          <div className="flex w-full items-center gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={!canModerate}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={14} />
              Rejeter
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={!canModerate}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2.5 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={14} />
              Valider et faire avancer
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
