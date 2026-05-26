"use client";

import { useEffect, useRef, useState } from "react";
import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { formatCompact } from "@/lib/format";
import {
  Radio,
  Mic,
  MicOff,
  Camera,
  Play,
  Pause,
  Square,
  Volume2,
  Send,
  Heart,
  Eye,
  Signal,
  Maximize2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LiveStreamingPage() {
  const [viewers, setViewers] = useState(48_215);
  const [likes, setLikes] = useState(1842);
  const [peakViewers] = useState(52_400);
  const [audioLevels, setAudioLevels] = useState<number[]>(
    Array.from({ length: 24 }, () => 0.3),
  );
  const [isStreaming, setIsStreaming] = useState(true);
  const [activeCamera, setActiveCamera] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState(initialChat);
  const chatRef = useRef<HTMLUListElement>(null);

  // Live viewer count + audio levels animation
  useEffect(() => {
    if (!isStreaming) return;
    const id = setInterval(() => {
      setViewers((v) => Math.max(20_000, v + Math.round((Math.random() - 0.45) * 540)));
      setLikes((l) => l + Math.floor(Math.random() * 8));
      setAudioLevels(Array.from({ length: 24 }, () => 0.2 + Math.random() * 0.8));
    }, 600);
    return () => clearInterval(id);
  }, [isStreaming]);

  // Auto-incoming chat messages
  useEffect(() => {
    if (!isStreaming) return;
    const id = setInterval(() => {
      setChatMessages((prev) => {
        const msg = simulatedMessages[Math.floor(Math.random() * simulatedMessages.length)];
        const next = [...prev, { ...msg, id: `m${Date.now()}` }];
        return next.slice(-40);
      });
    }, 3200);
    return () => clearInterval(id);
  }, [isStreaming]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `me-${Date.now()}`,
        author: "Vous",
        initials: "VV",
        color: "#a78bfa",
        text: chatInput.trim(),
        role: "moderator" as const,
      },
    ]);
    setChatInput("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative inline-flex h-3 w-3 shrink-0">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full",
                isStreaming
                  ? "animate-ping bg-danger opacity-75"
                  : "bg-text-muted opacity-40",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-3 w-3 rounded-full",
                isStreaming
                  ? "bg-danger shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                  : "bg-text-muted",
              )}
            />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">
              {isStreaming ? "Diffusion en cours · Studio A" : "Studio en standby"}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Live Streaming
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-text-secondary ring-1 ring-white/[0.06]">
            <Eye size={12} />
            <span className="font-semibold text-text-primary tabular-nums">{formatCompact(viewers)}</span>
            spectateurs
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-text-secondary ring-1 ring-white/[0.06]">
            <Heart size={12} className="text-pink-400" />
            <span className="font-semibold text-text-primary tabular-nums">{formatCompact(likes)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success ring-1 ring-success/30">
            <Signal size={12} />
            Excellent
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* Player + cameras */}
        <div className="space-y-5">
          <GlassCard className="overflow-hidden">
            {/* Player */}
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cameras[activeCamera]!.thumbnail}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              {/* Overlay top */}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    Live
                  </span>
                  <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur ring-1 ring-white/10">
                    {cameras[activeCamera]!.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                    aria-label="Paramètres"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                    aria-label="Plein écran"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>
              {/* Overlay bottom — controls */}
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setIsStreaming((v) => !v)}
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full text-white shadow-elevated transition",
                    isStreaming
                      ? "bg-danger hover:bg-danger/90"
                      : "bg-success hover:bg-success/90",
                  )}
                  aria-label={isStreaming ? "Arrêter le live" : "Démarrer le live"}
                >
                  {isStreaming ? <Square size={14} /> : <Play size={14} />}
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                  aria-label="Pause"
                >
                  <Pause size={14} />
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                  aria-label="Volume"
                >
                  <Volume2 size={14} />
                </button>
                <span className="ml-auto rounded-full bg-black/40 px-3 py-1 text-[11px] font-mono text-white backdrop-blur">
                  01:24:38 · 1080p · 6.2 Mbps
                </span>
              </div>
            </div>

            {/* Camera tiles */}
            <div className="grid grid-cols-4 gap-2 border-t border-white/[0.06] p-3">
              {cameras.map((cam, i) => {
                const active = i === activeCamera;
                return (
                  <button
                    key={cam.name}
                    type="button"
                    onClick={() => setActiveCamera(i)}
                    className={cn(
                      "group relative overflow-hidden rounded-lg ring-2 transition",
                      active ? "ring-accent-violet" : "ring-transparent hover:ring-white/15",
                    )}
                    aria-pressed={active}
                  >
                    <div className="relative aspect-video bg-bg-elevated">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cam.thumbnail} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          <Camera size={8} />
                          {cam.name}
                        </span>
                        {active && (
                          <span className="rounded bg-danger px-1 py-0.5 text-[8px] font-bold uppercase text-white">
                            ON AIR
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Stream health */}
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">Santé du flux</p>
              <span className="text-[10px] uppercase tracking-wider text-text-muted">temps réel</span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <HealthMetric label="Bitrate" value="6.2 Mbps" status="ok" />
              <HealthMetric label="Encodage" value="H.264 1080p60" status="ok" />
              <HealthMetric label="Latence" value="2.1 s" status="ok" />
              <HealthMetric label="Dropped frames" value="0.02%" status="ok" />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">
                  Audio level (canal principal)
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                  <Mic size={10} className="text-success" />
                  Studio A · -12 dB
                </div>
              </div>
              <div className="flex h-10 items-end gap-0.5 rounded-md bg-white/[0.025] p-1.5 ring-1 ring-white/[0.06]">
                {audioLevels.map((v, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-sm transition-[height] duration-150"
                    style={{
                      height: `${Math.max(8, v * 100)}%`,
                      background:
                        v < 0.65
                          ? `linear-gradient(180deg, #34d399, #10b981)`
                          : v < 0.85
                            ? `linear-gradient(180deg, #f59e0b, #d97706)`
                            : `linear-gradient(180deg, #ef4444, #b91c1c)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Diffusion targets */}
          <GlassCard className="p-5">
            <p className="mb-4 text-sm font-semibold text-text-primary">Canaux de diffusion en direct</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { c: "youtube", label: "YouTube Live", status: "ok", url: "youtube.com/c/cmrtv" },
                { c: "facebook", label: "Facebook Live", status: "ok", url: "fb.com/cmrtv" },
                { c: "instagram", label: "Instagram Live", status: "ok", url: "ig.com/cmrtv" },
                { c: "twitter", label: "X Live", status: "warn", url: "x.com/cmrtv" },
                { c: "tiktok", label: "TikTok Live", status: "ok", url: "tiktok.com/@cmrtv" },
                { c: "smarttv", label: "Smart TV", status: "ok", url: "Chaîne 12" },
              ].map((t) => (
                <div
                  key={t.label}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.06]"
                >
                  <ChannelIcon channel={t.c as never} size={18} decorated />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-text-primary">{t.label}</p>
                    <p className="truncate text-[10px] text-text-muted">{t.url}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-2 w-2 rounded-full",
                      t.status === "ok" ? "bg-success animate-pulse" : "bg-warning",
                    )}
                    title={t.status === "ok" ? "OK" : "Reconnexion"}
                  />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Chat + stats */}
        <div className="space-y-5">
          <GlassCard className="flex h-[640px] flex-col overflow-hidden">
            <GlassCardHeader
              title="Chat en direct"
              description={`${formatCompact(viewers)} spectateurs connectés`}
              action={
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                  Modération IA
                </span>
              }
            />
            <ul ref={chatRef} className="flex-1 space-y-2 overflow-y-auto p-4">
              {chatMessages.map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <InitialsAvatar initials={m.initials} color={m.color} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[11px] font-semibold",
                          m.role === "moderator"
                            ? "text-accent-violet"
                            : m.role === "vip"
                              ? "text-warning"
                              : "text-text-secondary",
                        )}
                      >
                        {m.author}
                      </span>
                      {m.role === "moderator" && (
                        <span className="rounded bg-accent-violet/20 px-1 py-0.5 text-[8px] font-bold uppercase text-accent-violet">
                          MOD
                        </span>
                      )}
                      {m.role === "vip" && (
                        <span className="rounded bg-warning/20 px-1 py-0.5 text-[8px] font-bold uppercase text-warning">
                          VIP
                        </span>
                      )}
                    </div>
                    <p className="break-words text-xs leading-snug text-text-primary">
                      {m.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 border-t border-white/[0.06] p-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Modérer ou répondre…"
                className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
              />
              <button
                type="submit"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet text-white transition hover:opacity-95"
                aria-label="Envoyer"
              >
                <Send size={13} />
              </button>
            </form>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="mb-3 text-sm font-semibold text-text-primary">Statistiques du live</p>
            <ul className="space-y-3 text-xs">
              <StatRow label="Spectateurs actuels" value={formatCompact(viewers)} accent />
              <StatRow label="Pic d'audience" value={formatCompact(peakViewers)} />
              <StatRow label="Durée moyenne de visionnage" value="14 min 22 s" />
              <StatRow label="Mentions « j'aime »" value={formatCompact(likes)} />
              <StatRow label="Messages chat (h)" value={formatCompact(8420)} />
              <StatRow label="Messages modérés (IA)" value="142" />
            </ul>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="border-b border-white/[0.06] p-4">
              <p className="text-sm font-semibold text-text-primary">Régie en direct</p>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                Contrôles audio / vidéo / sous-titres
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              <ToggleControl label="Sous-titres FR" defaultOn icon="cc" />
              <ToggleControl label="Sous-titres EN" defaultOn={false} icon="cc" />
              <ToggleControl label="Bouton réagir" defaultOn icon="heart" />
              <ToggleControl label="Chat public" defaultOn icon="msg" />
              <ToggleControl label="Mic invité" defaultOn={false} icon="mic" />
              <ToggleControl label="Replay auto" defaultOn icon="play" />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function HealthMetric({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "ok" | "warn" | "down";
}) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.06]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            status === "ok" ? "bg-success" : status === "warn" ? "bg-warning" : "bg-danger",
          )}
        />
      </div>
      <p className="mt-1 text-sm font-bold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          accent ? "text-accent-violet" : "text-text-primary",
        )}
      >
        {value}
      </span>
    </li>
  );
}

function ToggleControl({
  label,
  defaultOn,
  icon,
}: {
  label: string;
  defaultOn: boolean;
  icon: "cc" | "heart" | "msg" | "mic" | "play";
}) {
  const [on, setOn] = useState(defaultOn);
  const Icon =
    icon === "cc"
      ? Radio
      : icon === "heart"
        ? Heart
        : icon === "msg"
          ? Send
          : icon === "mic"
            ? on
              ? Mic
              : MicOff
            : Play;
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className={cn(
        "flex items-center gap-2 rounded-xl p-3 text-left text-xs ring-1 transition",
        on
          ? "bg-accent-violet/10 ring-accent-violet/30 text-text-primary"
          : "bg-white/[0.025] ring-white/[0.06] text-text-secondary hover:bg-white/[0.05]",
      )}
      aria-pressed={on}
    >
      <Icon size={13} className={on ? "text-accent-violet" : "text-text-muted"} />
      <span className="flex-1">{label}</span>
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          on ? "bg-accent-violet animate-pulse" : "bg-text-muted",
        )}
      />
    </button>
  );
}

const cameras = [
  {
    name: "CAM 1",
    thumbnail:
      "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=960&h=540&fit=crop&auto=format",
  },
  {
    name: "CAM 2",
    thumbnail:
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=960&h=540&fit=crop&auto=format",
  },
  {
    name: "PLATEAU",
    thumbnail:
      "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=960&h=540&fit=crop&auto=format",
  },
  {
    name: "TERRAIN",
    thumbnail:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=960&h=540&fit=crop&auto=format",
  },
] as const;

type ChatMsg = {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  role: "viewer" | "moderator" | "vip";
};

const initialChat: ChatMsg[] = [
  { id: "c1", author: "Awa M.", initials: "AM", color: "#22d3ee", text: "Super émission ce soir !", role: "viewer" },
  { id: "c2", author: "Vincent Moreau", initials: "VM", color: "#f472b6", text: "Petite recommandation : remonter le micro 2", role: "moderator" },
  { id: "c3", author: "Yacine S.", initials: "YS", color: "#10b981", text: "On entend bien depuis Dakar, RAS", role: "viewer" },
  { id: "c4", author: "Marie L.", initials: "ML", color: "#f59e0b", text: "Pouvez-vous repréciser le chiffre ?", role: "vip" },
  { id: "c5", author: "Aïssatou Diop", initials: "AD", color: "#a78bfa", text: "Je prépare la transition vers le reportage", role: "moderator" },
  { id: "c6", author: "Karim B.", initials: "KB", color: "#60a5fa", text: "👏👏👏", role: "viewer" },
  { id: "c7", author: "Sophie M.", initials: "SM", color: "#c084fc", text: "Question en attente pour le ministre", role: "viewer" },
];

const simulatedMessages: Omit<ChatMsg, "id">[] = [
  { author: "Cheikh D.", initials: "CD", color: "#22d3ee", text: "Très bonne analyse", role: "viewer" },
  { author: "Nora B.", initials: "NB", color: "#f59e0b", text: "L'invité est précis", role: "viewer" },
  { author: "Modération IA", initials: "IA", color: "#a78bfa", text: "Commentaire toxique masqué", role: "moderator" },
  { author: "Sami T.", initials: "ST", color: "#10b981", text: "On suit depuis Thiès, merci !", role: "viewer" },
  { author: "Aminata K.", initials: "AK", color: "#ec4899", text: "Bravo à l'équipe technique", role: "vip" },
  { author: "Pierre R.", initials: "PR", color: "#60a5fa", text: "Le son du plateau est top", role: "viewer" },
  { author: "Fatou N.", initials: "FN", color: "#a78bfa", text: "On passe au reportage terrain dans 3 min", role: "moderator" },
  { author: "Omar G.", initials: "OG", color: "#22d3ee", text: "Question pour le débat", role: "viewer" },
];
