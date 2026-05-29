"use client";

import { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Share2,
  Loader2,
  AlertTriangle,
  Check,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import {
  useFactCheck,
  useGenerateTitles,
  useSocialPosts,
} from "@/lib/queries";

type Platform = "twitter" | "instagram" | "tiktok" | "facebook" | "telegram";

const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: "X (Twitter)",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  telegram: "Telegram",
};

/**
 * Panneau IA pour l'éditeur de contenu :
 * - Génère 5 titres alternatifs via Groq Llama 3.3 70B
 * - Fact-check léger (flags + niveau de risque)
 * - Posts sociaux adaptés par plateforme
 *
 * Tous backed par GROQ_API_KEY côté backend. Si la clé manque, les boutons
 * renvoient un toast d'erreur explicite.
 */
export function AIAssistantPanel({
  contentId,
  title,
  body,
  onPickTitle,
}: {
  contentId?: string;
  title?: string;
  body?: string;
  onPickTitle?: (title: string) => void;
}) {
  const titles = useGenerateTitles();
  const factCheck = useFactCheck();
  const social = useSocialPosts();

  const [platforms, setPlatforms] = useState<Platform[]>(["twitter", "instagram", "tiktok"]);

  const togglePlatform = (p: Platform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const handleTitles = () =>
    titles
      .mutateAsync({ contentId, body, currentTitle: title })
      .catch((err) => toast.error("Échec génération titres", { description: String(err) }));

  const handleFactCheck = () =>
    factCheck
      .mutateAsync({ contentId, body })
      .catch((err) => toast.error("Échec fact-check", { description: String(err) }));

  const handleSocial = () => {
    if (platforms.length === 0) {
      toast.warning("Sélectionne au moins une plateforme");
      return;
    }
    return social
      .mutateAsync({ contentId, title, body, platforms })
      .catch((err) => toast.error("Échec social posts", { description: String(err) }));
  };

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copié");
  };

  return (
    <GlassCard className="space-y-4 p-4">
      <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
        <Sparkles size={14} className="text-accent-violet" />
        <h3 className="text-sm font-semibold text-text-primary">Assistant IA éditorial</h3>
        <span className="ml-auto rounded-full bg-accent-violet/10 px-2 py-0.5 text-[10px] font-medium text-accent-violet">
          Llama 3.3 70B · Groq
        </span>
      </div>

      {/* TITRES */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
            <Sparkles size={11} /> Suggestions de titres
          </h4>
          <button
            type="button"
            onClick={handleTitles}
            disabled={titles.isPending}
            className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-text-primary transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            {titles.isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              "Générer 5 titres"
            )}
          </button>
        </div>
        {titles.data?.titles && (
          <ul className="space-y-1">
            {titles.data.titles.map((t, i) => (
              <li
                key={i}
                className="group flex items-center gap-2 rounded-md bg-white/[0.02] px-2 py-1.5"
              >
                <span className="line-clamp-2 flex-1 text-xs text-text-secondary">{t}</span>
                {onPickTitle && (
                  <button
                    type="button"
                    onClick={() => onPickTitle(t)}
                    className="invisible rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-text-primary transition group-hover:visible hover:bg-white/[0.06]"
                  >
                    Utiliser
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => copy(t)}
                  className="invisible rounded border border-white/[0.08] p-1 text-text-muted transition group-hover:visible hover:text-text-primary"
                  aria-label="Copier"
                >
                  <Copy size={10} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* FACT-CHECK */}
      <section className="space-y-2 border-t border-white/[0.05] pt-3">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
            <ShieldCheck size={11} /> Fact-check pré-publication
          </h4>
          <button
            type="button"
            onClick={handleFactCheck}
            disabled={factCheck.isPending}
            className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-text-primary transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            {factCheck.isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              "Analyser"
            )}
          </button>
        </div>
        {factCheck.data && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted">Risque global :</span>
              <span
                className={
                  factCheck.data.overallRisk === "high"
                    ? "rounded-full bg-danger/15 px-2 py-0.5 font-semibold text-danger"
                    : factCheck.data.overallRisk === "medium"
                      ? "rounded-full bg-warning/15 px-2 py-0.5 font-semibold text-warning"
                      : "rounded-full bg-success/15 px-2 py-0.5 font-semibold text-success"
                }
              >
                {factCheck.data.overallRisk}
              </span>
            </div>
            {factCheck.data.flags.length > 0 && (
              <ul className="space-y-1.5">
                {factCheck.data.flags.map((f, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2 text-[11px]"
                  >
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle
                        size={10}
                        className={
                          f.risk === "high"
                            ? "mt-0.5 text-danger"
                            : f.risk === "medium"
                              ? "mt-0.5 text-warning"
                              : "mt-0.5 text-text-muted"
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary">{f.claim}</p>
                        <p className="mt-0.5 text-text-secondary">{f.reason}</p>
                        <p className="mt-0.5 italic text-text-muted">→ {f.verify}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {factCheck.data.suggestedSources.length > 0 && (
              <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2 text-[11px]">
                <p className="font-medium text-text-primary">Sources à vérifier</p>
                <ul className="mt-1 space-y-0.5 text-text-secondary">
                  {factCheck.data.suggestedSources.map((s, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <Check size={9} className="mt-1 text-accent-violet" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SOCIAL POSTS */}
      <section className="space-y-2 border-t border-white/[0.05] pt-3">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
            <Share2 size={11} /> Posts sociaux
          </h4>
          <button
            type="button"
            onClick={handleSocial}
            disabled={social.isPending}
            className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-text-primary transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            {social.isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              "Générer"
            )}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlatform(p)}
              className={
                platforms.includes(p)
                  ? "rounded-full bg-accent-violet/15 px-2 py-0.5 text-[10px] font-medium text-accent-violet ring-1 ring-accent-violet/30"
                  : "rounded-full bg-white/[0.02] px-2 py-0.5 text-[10px] font-medium text-text-muted ring-1 ring-white/[0.05] hover:bg-white/[0.04]"
              }
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
        {social.data?.posts && (
          <ul className="space-y-1.5">
            {Object.entries(social.data.posts).map(([p, post]) => (
              <li
                key={p}
                className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2 text-[11px]"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-text-primary">
                    {PLATFORM_LABELS[p as Platform]}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(post)}
                    className="rounded border border-white/[0.08] p-1 text-text-muted transition hover:text-text-primary"
                    aria-label="Copier"
                  >
                    <Copy size={10} />
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-text-secondary">{post}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </GlassCard>
  );
}
