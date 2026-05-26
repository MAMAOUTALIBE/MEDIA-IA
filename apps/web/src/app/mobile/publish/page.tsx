"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMobileStore } from "@/lib/stores/mobile-store";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { CHANNELS, CHANNEL_ORDER } from "@/lib/constants";
import { Camera, Send, Image as ImageIcon, Mic } from "lucide-react";
import type { ChannelKey } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = ["Culture", "Politique", "Économie", "Sport", "Société", "International", "Tech"];

export default function MobilePublishPage() {
  const router = useRouter();
  const submit = useMobileStore((s) => s.submit);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Culture");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState<ChannelKey[]>(["web", "facebook"]);
  const [mediaCount, setMediaCount] = useState(0);

  const canSubmit = title.trim().length >= 8 && body.trim().length >= 20;

  function toggleChannel(c: ChannelKey) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const sub = submit({
      title: title.trim(),
      category,
      body: body.trim(),
      channels,
    });
    toast.success("Publication soumise", {
      description: "Le rédacteur recevra une notification dans quelques secondes.",
    });
    router.push(`/mobile/contenus/${sub.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Nouvelle publication
        </h1>
        <p className="mt-1 text-xs text-text-secondary">
          Soumettez votre dépêche au pipeline de validation éditoriale.
        </p>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Titre
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre clair et factuel"
          className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
        />
        <p className="mt-1 text-[10px] text-text-muted">
          {title.length} caractères {title.length < 8 && "· min 8"}
        </p>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Catégorie
        </label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition",
                c === category
                  ? "bg-accent-violet/15 text-accent-violet ring-accent-violet/30"
                  : "bg-white/[0.025] text-text-secondary ring-white/[0.06]",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Contenu
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Rédigez votre dépêche : faits, sources, contexte…"
          className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
        />
        <p className="mt-1 text-[10px] text-text-muted">
          {body.trim().split(/\s+/).filter(Boolean).length} mots · min 20 caractères
        </p>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Médias
        </label>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMediaCount((c) => c + 1)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.10] bg-white/[0.025] px-3 py-2.5 text-xs font-medium text-text-secondary transition hover:bg-white/[0.04]"
          >
            <Camera size={14} />
            Photo
          </button>
          <button
            type="button"
            onClick={() => setMediaCount((c) => c + 1)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.10] bg-white/[0.025] px-3 py-2.5 text-xs font-medium text-text-secondary transition hover:bg-white/[0.04]"
          >
            <ImageIcon size={14} />
            Vidéo
          </button>
          <button
            type="button"
            onClick={() => setMediaCount((c) => c + 1)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.10] bg-white/[0.025] px-3 py-2.5 text-xs font-medium text-text-secondary transition hover:bg-white/[0.04]"
          >
            <Mic size={14} />
            Audio
          </button>
        </div>
        {mediaCount > 0 && (
          <p className="mt-1 text-[10px] text-text-secondary">
            {mediaCount} pièce{mediaCount > 1 ? "s" : ""} jointe{mediaCount > 1 ? "s" : ""} (mock)
          </p>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Canaux de diffusion
        </label>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {CHANNEL_ORDER.map((c) => {
            const on = channels.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleChannel(c)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium ring-1 transition",
                  on
                    ? "ring-accent-violet/30 shadow-card"
                    : "ring-white/[0.06] hover:ring-white/[0.12]",
                )}
                style={{
                  background: on ? CHANNELS[c].bg : "rgba(255,255,255,0.025)",
                  color: on ? CHANNELS[c].color : "var(--text-secondary)",
                }}
              >
                <ChannelIcon channel={c} size={10} />
                {CHANNELS[c].label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-3 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95 disabled:opacity-40"
      >
        <Send size={14} />
        Envoyer pour validation
      </button>
    </form>
  );
}
