"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { CHANNELS } from "@/lib/constants";
import { TEMPLATES, useDraftsStore } from "@/lib/stores/drafts-store";
import { currentUser } from "@/lib/mocks/users";
import { useCreateContent } from "@/lib/queries";
import { API_ENABLED } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";
import { ArrowRight, FileText, Loader2, Mic, Video, Plus, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const typeIcons = {
  article: FileText,
  video: Video,
  audio: Mic,
  social: Sparkles,
};

export function NewContentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const createFromTemplate = useDraftsStore((s) => s.createFromTemplate);
  const createContent = useCreateContent();
  const [selected, setSelected] = useState<string>("reportage");

  async function handleCreate() {
    const template = TEMPLATES.find((t) => t.key === selected);
    if (!template) return;
    // API mode : POST /contents avec authorId forcé côté backend
    if (API_ENABLED) {
      try {
        const created = await createContent.mutateAsync({
          title: `${template.label} — nouveau brouillon`,
          excerpt: template.description,
          type: template.type,
          channels: template.channels,
        });
        toast.success(`Brouillon « ${template.label} » créé`, {
          description: "Synchronisé avec l'API — édition en temps réel.",
        });
        onOpenChange(false);
        setTimeout(() => router.push(`/dashboard/contenus/${created.id}`), 200);
        return;
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error("Création refusée", { description: err.displayMessage });
        } else {
          toast.error("Création échouée", { description: String(err) });
        }
        return;
      }
    }
    // Fallback offline (mocks Zustand) si pas d'API
    const draft = createFromTemplate(template, currentUser.id);
    toast.success(`Brouillon « ${template.label} » créé (local)`, {
      description: "Mode démo — pas d'API connectée.",
    });
    onOpenChange(false);
    setTimeout(() => router.push(`/dashboard/contenus/${draft.id}`), 200);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl !gap-0 border border-white/[0.10] bg-bg-card/95 p-0 backdrop-blur-2xl">
        <DialogHeader className="border-b border-white/[0.06] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet text-white shadow-glow-violet">
              <Plus size={18} />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-text-primary">
                Nouveau contenu
              </DialogTitle>
              <DialogDescription className="!mt-0.5 !text-[11px] !text-text-secondary">
                Démarrez avec un modèle préconfiguré — canaux et structure éditoriale.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {TEMPLATES.map((t) => {
            const Icon = typeIcons[t.type];
            const active = t.key === selected;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelected(t.key)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl p-4 text-left ring-1 transition",
                  active
                    ? "bg-gradient-to-br ring-accent-violet/40 shadow-glow-violet"
                    : "bg-white/[0.025] ring-white/[0.06] hover:bg-white/[0.05]",
                  active && t.gradient,
                )}
                aria-pressed={active}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl leading-none">{t.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{t.label}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-text-secondary">
                        <Icon size={10} />
                        Format {t.type === "video" ? "vidéo" : t.type === "article" ? "article" : t.type === "audio" ? "audio" : "social"}
                      </p>
                    </div>
                  </div>
                  {active && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-violet text-white">
                      <Check size={11} />
                    </span>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
                  {t.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {t.channels.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-white/[0.06]"
                      style={{ background: CHANNELS[c].bg, color: CHANNELS[c].color }}
                    >
                      <ChannelIcon channel={c} size={8} />
                      {CHANNELS[c].label}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-white/[0.06] !p-4">
          <span className="text-[11px] text-text-secondary">
            Vous pourrez personnaliser tous les paramètres dans l&apos;éditeur.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createContent.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2 text-xs font-semibold text-white shadow-glow-violet transition hover:opacity-95 disabled:opacity-60"
            >
              {createContent.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  Créer ce brouillon
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewContentTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95"
    >
      <Plus size={16} />
      Nouveau contenu
    </button>
  );
}
