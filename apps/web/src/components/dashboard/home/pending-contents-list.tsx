"use client";

import { useState } from "react";
import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { usePendingContents, useRejectContent, useValidateContent } from "@/lib/queries";
import { API_ENABLED } from "@/lib/api-client";
import { usePendingStore } from "@/lib/stores/pending-store";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatRelative } from "@/lib/format";
import { Check, Eye, FileText, Mic, Sparkles, Video } from "lucide-react";
import { toast } from "sonner";
import type { PendingContent } from "@/types";
import { ContentDetailSheet } from "./content-detail-sheet";
import { canValidatePending } from "@/lib/rbac";
import { useEffectiveRole } from "@/lib/use-rbac";

const typeIcon = {
  article: FileText,
  video: Video,
  audio: Mic,
  social: Sparkles,
};

const stepLabel = {
  editor: "Rédacteur",
  chief: "Chef d'édition",
  direction: "Direction",
};

const stepColor = {
  editor: "text-info",
  chief: "text-accent-violet",
  direction: "text-pink-400",
};

export function PendingContentsList() {
  const { data, error, isError, refetch } = usePendingContents();
  const validated = usePendingStore((s) => s.validatedIds);
  const rejected = usePendingStore((s) => s.rejectedIds);
  const validateLocal = usePendingStore((s) => s.validate);
  const rejectLocal = usePendingStore((s) => s.reject);
  const apiMutation = useValidateContent();
  const rejectMutation = useRejectContent();
  const [openContent, setOpenContent] = useState<PendingContent | null>(null);
  const role = useEffectiveRole();

  const list = (data ?? []).filter(
    (c) => !validated.has(c.id) && !rejected.has(c.id),
  );

  function performValidate(c: PendingContent, source: "quick" | "sheet") {
    if (!canValidatePending(role, c)) {
      toast.error("Action non autorisée", {
        description: "Votre rôle ne permet pas de valider cette étape.",
      });
      return;
    }
    if (API_ENABLED) {
      apiMutation.mutate(
        {
          id: c.contentId,
          comment: source === "quick" ? "Validé via queue" : "Validé via Sheet détail",
        },
        {
          onSuccess: (r: { toStep?: string }) => {
            validateLocal(c.id);
            toast.success(`« ${c.title} » validé`, {
              description: `Étape ${stepLabel[c.step]} → ${r?.toStep ?? "—"} · WS broadcast`,
            });
          },
          onError: (err: unknown) => {
            toast.error("Validation refusée par le serveur", {
              description: err instanceof Error ? err.message.slice(0, 80) : "—",
            });
          },
        },
      );
    } else {
      validateLocal(c.id);
      toast.success(`« ${c.title} » validé`, {
        description: `Étape ${stepLabel[c.step]} franchie (mode local)`,
      });
    }
  }

  function performReject(c: PendingContent) {
    if (!canValidatePending(role, c)) {
      toast.error("Action non autorisée", {
        description: "Votre rôle ne permet pas de rejeter cette étape.",
      });
      return;
    }
    if (API_ENABLED) {
      rejectMutation.mutate(
        { id: c.contentId, reason: "Rejet via interface dashboard" },
        {
          onSuccess: () => {
            rejectLocal(c.id);
            toast.error(`« ${c.title} » rejeté`, {
              description: "Le journaliste a été notifié",
            });
          },
          onError: (err: unknown) => {
            toast.error("Rejet refusé par le serveur", {
              description: err instanceof Error ? err.message.slice(0, 80) : "—",
            });
          },
        },
      );
      return;
    }
    rejectLocal(c.id);
    toast.error(`« ${c.title} » rejeté`, {
      description: "Le journaliste a été notifié",
    });
  }

  function handleQuickValidate(e: React.MouseEvent, c: PendingContent) {
    e.stopPropagation();
    performValidate(c, "quick");
  }

  return (
    <>
      <GlassCard className="flex h-full flex-col">
        <GlassCardHeader
          title="Contenus en attente"
          description={`${list.length} contenu${list.length > 1 ? "s" : ""} à valider`}
        />
        {isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : list.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-5 py-10 text-center">
            <p className="text-sm text-text-secondary">Tous les contenus ont été traités.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {list.map((c) => {
              const Icon = typeIcon[c.type];
              const canModerate = canValidatePending(role, c);
              return (
                <li
                  key={c.id}
                  onClick={() => setOpenContent(c)}
                  className="flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-white/[0.025]"
                >
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]"
                    aria-hidden
                  >
                    <Icon size={16} className="text-text-secondary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{c.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-text-secondary">
                        <InitialsAvatar
                          initials={c.author.initials}
                          color={c.author.color}
                          size={16}
                        />
                        {c.author.name}
                      </span>
                      <span className="text-text-muted">·</span>
                      <span className={stepColor[c.step]}>En attente {stepLabel[c.step]}</span>
                      <span className="text-text-muted">·</span>
                      <span className="text-text-muted">{formatRelative(c.submittedAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenContent(c);
                    }}
                    className="hidden h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-text-secondary transition hover:bg-white/[0.08] hover:text-text-primary sm:inline-flex"
                    title="Voir le détail"
                  >
                    <Eye size={14} />
                    Voir
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleQuickValidate(e, c)}
                    disabled={!canModerate || apiMutation.isPending || rejectMutation.isPending}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet px-3 text-xs font-semibold text-white shadow-glow-violet transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                    title={canModerate ? "Valider ce contenu" : "Votre rôle ne valide pas cette étape"}
                  >
                    <Check size={14} />
                    Valider
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>

      <ContentDetailSheet
        pending={openContent}
        canModerate={openContent ? canValidatePending(role, openContent) : false}
        onValidate={(id) => {
          const c = list.find((x) => x.id === id);
          if (c) performValidate(c, "sheet");
        }}
        onReject={(id) => {
          const c = list.find((x) => x.id === id);
          if (c) performReject(c);
        }}
        onOpenChange={(o) => {
          if (!o) setOpenContent(null);
        }}
      />
    </>
  );
}
