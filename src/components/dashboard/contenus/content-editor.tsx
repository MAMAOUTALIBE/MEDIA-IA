"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Content, User, AICheckType, AICheckResult, ChannelKey } from "@/types";
import { GlassCard } from "@/components/ui/glass-card";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { StatusBadge } from "./status-badge";
import { AI_CHECKS, CHANNELS, CHANNEL_ORDER } from "@/lib/constants";
import {
  ArrowLeft,
  AlertTriangle,
  Bold,
  CheckCircle2,
  Code,
  Italic,
  Link2,
  List,
  Quote,
  Save,
  ShieldCheck,
  Sparkles,
  Underline,
  XCircle,
  Send,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SEED_BODY = `Le nouveau centre culturel de Dakar a été officiellement inauguré samedi en présence de plusieurs personnalités politiques et artistiques. L'édifice, qui s'étend sur près de 4 500 m², accueillera dès la semaine prochaine ses premières expositions ainsi qu'une programmation pluridisciplinaire couvrant musique, cinéma, littérature et arts plastiques.

D'un coût total estimé à 3.2 milliards de francs CFA, ce projet a été financé conjointement par l'État et plusieurs partenaires privés. Le centre comprend une salle de spectacle de 800 places, deux galeries d'exposition, une médiathèque et plusieurs espaces de résidence pour les artistes invités.

« Ce centre incarne notre ambition culturelle et notre attachement à la jeunesse », a déclaré la ministre lors de la cérémonie d'ouverture, soulignant que le projet vise également à structurer une véritable filière professionnelle pour les industries culturelles du pays.`;

function computeAIChecks(title: string, body: string, channels: ChannelKey[]): {
  results: AICheckResult[];
  global: number;
} {
  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  // Spelling: heuristic — too short body or unusual character ratio lowers score
  const upperRatio = bodyLen > 0 ? (body.match(/[A-Z]/g)?.length ?? 0) / bodyLen : 0;
  const spellingScore = Math.min(
    100,
    Math.round(
      85 +
        (bodyLen >= 250 ? 8 : 0) +
        (upperRatio < 0.05 ? 4 : 0) +
        (wordCount > 100 ? 3 : 0),
    ),
  );

  // SEO: title length (sweet spot 45-65), body length minimum
  const titleOk = titleLen >= 35 && titleLen <= 65;
  const titleAcceptable = titleLen >= 25 && titleLen <= 80;
  const seoScore = Math.max(
    0,
    Math.min(
      100,
      (titleOk ? 70 : titleAcceptable ? 50 : 25) +
        (wordCount >= 80 ? 25 : wordCount >= 40 ? 15 : 0) +
        (channels.length >= 2 ? 5 : 0),
    ),
  );

  // Media quality: needs at least 1 visual channel for ≥85
  const hasVisualChannel = channels.some((c) =>
    ["youtube", "instagram", "tiktok", "smarttv"].includes(c),
  );
  const mediaScore = hasVisualChannel ? 96 : 78;

  // Sensitive: penalize if body contains banned-like words (mock)
  const banned = /(scandale|exclusif obtenu|fuite confidentielle|rumeur)/i.test(body);
  const sensitiveScore = banned ? 72 : 97;

  // Fixed-ish
  const plagiarismScore = bodyLen < 200 ? 80 : 100;
  const copyrightScore = 100;
  const fakeNewsScore = banned ? 78 : 99;

  const results: AICheckResult[] = [
    {
      type: "spelling",
      score: spellingScore,
      status: spellingScore >= 90 ? "passed" : spellingScore >= 75 ? "warning" : "failed",
      message: spellingScore >= 90 ? "Aucune erreur détectée" : "Quelques tournures à revoir",
    },
    {
      type: "plagiarism",
      score: plagiarismScore,
      status: plagiarismScore >= 90 ? "passed" : "warning",
      message: plagiarismScore >= 90 ? "Aucun doublon" : "Contenu trop court pour analyse fiable",
    },
    {
      type: "sensitive",
      score: sensitiveScore,
      status: sensitiveScore >= 90 ? "passed" : "warning",
      message: sensitiveScore >= 90 ? "RAS" : "Termes potentiellement sensationnels détectés",
    },
    {
      type: "copyright",
      score: copyrightScore,
      status: "passed",
      message: "Sources vérifiées",
    },
    {
      type: "media_quality",
      score: mediaScore,
      status: mediaScore >= 90 ? "passed" : "warning",
      message: mediaScore >= 90 ? "Qualité OK" : "Ajouter un canal visuel (Youtube, Insta, TikTok…)",
    },
    {
      type: "seo",
      score: seoScore,
      status: seoScore >= 85 ? "passed" : seoScore >= 60 ? "warning" : "failed",
      message:
        titleOk
          ? "Titre bien dimensionné"
          : titleLen < 25
            ? "Titre trop court (< 25 caractères)"
            : titleLen > 80
              ? "Titre trop long (> 80 caractères)"
              : "Longueur du titre acceptable",
    },
    {
      type: "fake_news",
      score: fakeNewsScore,
      status: fakeNewsScore >= 90 ? "passed" : "warning",
      message: fakeNewsScore >= 90 ? "Sources fiables détectées" : "Croisement de sources requis",
    },
  ];
  const global = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  return { results, global };
}

function statusIcon(status: AICheckResult["status"]) {
  switch (status) {
    case "passed":
      return CheckCircle2;
    case "warning":
      return AlertTriangle;
    case "failed":
      return XCircle;
  }
}

function statusColor(status: AICheckResult["status"]) {
  switch (status) {
    case "passed":
      return { fg: "text-success", bg: "bg-success-soft" };
    case "warning":
      return { fg: "text-warning", bg: "bg-warning-soft" };
    case "failed":
      return { fg: "text-danger", bg: "bg-danger-soft" };
  }
}

const toolbarItems = [
  { icon: Bold, label: "Gras" },
  { icon: Italic, label: "Italique" },
  { icon: Underline, label: "Souligné" },
  { icon: Quote, label: "Citation" },
  { icon: List, label: "Liste" },
  { icon: Link2, label: "Lien" },
  { icon: ImageIcon, label: "Image" },
  { icon: Code, label: "Code" },
];

export function ContentEditor({
  content,
  author,
}: {
  content: Content;
  author?: User;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(content.title);
  const [body, setBody] = useState(content.excerpt + "\n\n" + SEED_BODY);
  const [channels, setChannels] = useState<ChannelKey[]>(content.channels);
  const [dirty, setDirty] = useState(false);

  const { results, global } = useMemo(
    () => computeAIChecks(title, body, channels),
    [title, body, channels],
  );

  const warnCount = results.filter((r) => r.status !== "passed").length;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));

  function toggleChannel(c: ChannelKey) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setDirty(true);
  }

  function handleSave() {
    setDirty(false);
    toast.success("Brouillon enregistré", {
      description: `${words} mots · ${channels.length} canaux ciblés`,
    });
  }

  function handleSubmit() {
    if (global < 75) {
      toast.error("Score IA insuffisant", {
        description: `Score actuel ${global}/100 — corrigez les avertissements avant soumission.`,
      });
      return;
    }
    toast.success("Soumis pour validation", {
      description: `Envoyé au rédacteur · Score IA ${global}/100`,
    });
    setTimeout(() => router.push("/dashboard/contenus"), 800);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/contenus"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
            aria-label="Retour"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">
              Édition · {content.id}
            </p>
            <h1 className="text-lg font-bold tracking-tight text-text-primary">
              Espace de rédaction
            </h1>
          </div>
          <StatusBadge status={content.status} />
          {dirty && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              Modifications non enregistrées
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-white/[0.06]"
          >
            <Save size={14} />
            Enregistrer le brouillon
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95"
          >
            <Send size={14} />
            Soumettre à validation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* Editor */}
        <div className="space-y-5">
          <GlassCard className="overflow-hidden">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              placeholder="Titre du contenu…"
              className="w-full border-b border-white/[0.06] bg-transparent px-6 py-5 text-2xl font-bold text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <div className="flex items-center gap-1 border-b border-white/[0.06] bg-white/[0.015] px-3 py-2">
              {toolbarItems.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.label}
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
                    title={t.label}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-3 text-[11px] text-text-muted">
                <span>{words} mots</span>
                <span>·</span>
                <span>~{minutes} min lecture</span>
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setDirty(true);
              }}
              placeholder="Écrivez votre contenu… L'IA analyse en temps réel."
              className="block min-h-[420px] w-full resize-y bg-transparent px-6 py-5 text-[15px] leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </GlassCard>

          <GlassCard className="p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Canaux de diffusion
            </p>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_ORDER.map((c) => {
                const on = channels.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleChannel(c)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition",
                      on
                        ? "ring-white/[0.18] shadow-card"
                        : "ring-white/[0.06] hover:ring-white/[0.12]",
                    )}
                    style={{
                      background: on ? CHANNELS[c].bg : "rgba(255,255,255,0.025)",
                      color: on ? CHANNELS[c].color : "var(--text-secondary)",
                    }}
                    aria-pressed={on}
                  >
                    <ChannelIcon channel={c} size={12} />
                    {CHANNELS[c].label}
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* AI panel */}
        <div className="space-y-5">
          <GlassCard variant="accent" className="overflow-hidden">
            <div className="border-b border-white/[0.06] p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-accent-violet" />
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-violet">
                  Vérifications IA · live
                </p>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <p className="bg-gradient-to-br from-white to-accent-violet bg-clip-text text-5xl font-bold leading-none text-transparent tabular-nums">
                  {global}
                </p>
                <p className="mb-1 text-lg font-semibold text-text-secondary">/100</p>
                <span
                  className={cn(
                    "mb-2 ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    global >= 90
                      ? "bg-success-soft text-success"
                      : global >= 75
                        ? "bg-warning-soft text-warning"
                        : "bg-danger-soft text-danger",
                  )}
                >
                  {global >= 90 ? "Excellent" : global >= 75 ? "À améliorer" : "Insuffisant"}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-blue via-accent-violet to-success transition-all duration-500"
                  style={{ width: `${global}%` }}
                />
              </div>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {results.map((r) => {
                const Icon = statusIcon(r.status);
                const { fg, bg } = statusColor(r.status);
                const meta = AI_CHECKS[r.type as AICheckType];
                return (
                  <li key={r.type} className="flex items-start gap-3 px-5 py-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-white/[0.06]",
                        bg,
                        fg,
                      )}
                    >
                      <Icon size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-text-secondary">{r.message}</p>
                    </div>
                    <span className={cn("shrink-0 text-xs font-bold tabular-nums", fg)}>
                      {r.score}
                    </span>
                  </li>
                );
              })}
            </ul>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              <Sparkles size={11} className="text-accent-violet" />
              Recommandations IA
            </p>
            <ul className="space-y-2 text-xs text-text-secondary">
              {warnCount === 0 ? (
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="mt-0.5 text-success" />
                  Aucune recommandation — le contenu est prêt à être soumis.
                </li>
              ) : (
                results
                  .filter((r) => r.status !== "passed")
                  .map((r) => (
                    <li key={r.type} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-violet" />
                      <span>{AI_CHECKS[r.type as AICheckType].label} : {r.message}</span>
                    </li>
                  ))
              )}
            </ul>
          </GlassCard>

          {author && (
            <GlassCard className="p-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Auteur
              </p>
              <div className="flex items-center gap-3">
                <InitialsAvatar
                  initials={author.initials}
                  color={author.color}
                  size={40}
                />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{author.name}</p>
                  <p className="text-[11px] text-text-secondary">{author.team}</p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
