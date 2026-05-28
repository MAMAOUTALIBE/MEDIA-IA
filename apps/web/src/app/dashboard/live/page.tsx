"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  VolumeX,
  Send,
  Heart,
  Eye,
  Signal,
  Maximize2,
  Settings,
  PictureInPicture2,
  CircleDot,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live Streaming page.
 *
 * The on-air player uses a real <video> element with public test streams so
 * every control (play/pause/stop, volume, mute, PiP, fullscreen, camera switch)
 * does what the operator expects — they're not decorative buttons.
 *
 * The "going live" RECORD button toggles a simulated state (no real RTMP
 * ingest); end-to-end RTMP is on the roadmap behind the `streaming.rtmp`
 * gateway once Camunda+OBS bridge ships.
 */
export default function LiveStreamingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const [viewers, setViewers] = useState(48_215);
  const [likes, setLikes] = useState(1842);
  const [peakViewers] = useState(52_400);
  const [audioLevels, setAudioLevels] = useState<number[]>(
    Array.from({ length: 24 }, () => 0.3),
  );
  // `isStreaming` reflects whether we're broadcasting; `isPlaying` reflects the
  // preview <video> state. They diverge when you pause the preview but keep
  // sending the feed downstream (or vice-versa during go-live rehearsals).
  const [isStreaming, setIsStreaming] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeCamera, setActiveCamera] = useState(0);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const [showVolume, setShowVolume] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [bitrateMbps, setBitrateMbps] = useState(6.2);
  const [resolution, setResolution] = useState("1080p");
  const [signalQuality, setSignalQuality] = useState<"Excellent" | "Bon" | "Faible">("Excellent");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isPip, setIsPip] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState(initialChat);
  const chatRef = useRef<HTMLUListElement>(null);

  // ------ Live viewer count + audio levels animation -----------------------
  useEffect(() => {
    if (!isStreaming) return;
    const id = setInterval(() => {
      setViewers((v) => Math.max(20_000, v + Math.round((Math.random() - 0.45) * 540)));
      setLikes((l) => l + Math.floor(Math.random() * 8));
      setAudioLevels(Array.from({ length: 24 }, () => 0.2 + Math.random() * 0.8));
    }, 600);
    return () => clearInterval(id);
  }, [isStreaming]);

  // ------ Stream health probe — bitrate jitter + dropped-frame ratio -------
  useEffect(() => {
    if (!isStreaming) return;
    const id = setInterval(() => {
      // Small random walk around 6 Mbps; clamp to a believable encoder range.
      setBitrateMbps((b) => {
        const next = b + (Math.random() - 0.5) * 0.8;
        return Math.min(8.5, Math.max(3.5, Number(next.toFixed(1))));
      });
      const video = videoRef.current;
      if (video?.getVideoPlaybackQuality) {
        const q = video.getVideoPlaybackQuality();
        const dropped = q.droppedVideoFrames / Math.max(1, q.totalVideoFrames);
        setSignalQuality(dropped > 0.05 ? "Faible" : dropped > 0.01 ? "Bon" : "Excellent");
      }
    }, 1500);
    return () => clearInterval(id);
  }, [isStreaming]);

  // ------ Elapsed time — driven by video timeUpdate, not a wall clock -----
  // Using the <video> currentTime keeps the displayed timecode in sync with
  // what the operator is actually seeing, even after pause/resume.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setElapsed(v.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onMeta = () => {
      const w = v.videoWidth;
      if (w >= 1920) setResolution("1080p");
      else if (w >= 1280) setResolution("720p");
      else setResolution("SD");
    };
    const onError = () =>
      setVideoError("Le flux préview n'a pas pu démarrer. Vérifiez la connexion réseau.");
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("error", onError);
    };
  }, []);

  // ------ Apply muted / volume to the underlying video ---------------------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = volume;
  }, [muted, volume]);

  // ------ Auto-incoming chat messages --------------------------------------
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

  // ------ Picture-in-Picture state ----------------------------------------
  useEffect(() => {
    const onEnter = () => setIsPip(true);
    const onLeave = () => setIsPip(false);
    document.addEventListener("enterpictureinpicture", onEnter);
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      document.removeEventListener("enterpictureinpicture", onEnter);
      document.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, []);

  // ------ Action handlers --------------------------------------------------
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const stopStream = useCallback(() => {
    setIsStreaming((s) => !s);
    const v = videoRef.current;
    if (!v) return;
    if (isStreaming) {
      v.pause();
      v.currentTime = 0;
    } else {
      void v.play();
    }
  }, [isStreaming]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
      }
    } catch {
      /* user denied or unsupported — fail silently, button keeps idle state */
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = playerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* user denied / iframe — fail silently */
    }
  }, []);

  const switchCamera = useCallback(
    (i: number) => {
      if (i === activeCamera) return;
      setActiveCamera(i);
      const v = videoRef.current;
      if (!v) return;
      // Preserve playback state across camera switch — operators expect the
      // preview to keep rolling, not restart.
      const wasPlaying = !v.paused;
      v.load();
      if (wasPlaying) void v.play().catch(() => undefined);
    },
    [activeCamera],
  );

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

  const cam = cameras[activeCamera]!;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative inline-flex h-3 w-3 shrink-0" aria-hidden>
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
              {isStreaming ? `Diffusion en cours · ${cam.location}` : "Studio en standby"}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Live Streaming
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-text-secondary ring-1 ring-white/[0.06]">
            <Eye size={12} aria-hidden />
            <span className="font-semibold text-text-primary tabular-nums">{formatCompact(viewers)}</span>
            spectateurs
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-text-secondary ring-1 ring-white/[0.06]">
            <Heart size={12} className="text-pink-400" aria-hidden />
            <span className="font-semibold text-text-primary tabular-nums">{formatCompact(likes)}</span>
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
              signalQuality === "Excellent"
                ? "bg-success-soft text-success ring-success/30"
                : signalQuality === "Bon"
                  ? "bg-warning-soft text-warning ring-warning/30"
                  : "bg-danger-soft text-danger ring-danger/30",
            )}
          >
            <Signal size={12} aria-hidden />
            {signalQuality}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* Player + cameras */}
        <div className="space-y-5">
          <GlassCard className="overflow-hidden">
            {/* Player */}
            <div
              ref={playerRef}
              className="group/player relative aspect-video w-full overflow-hidden bg-black"
            >
              <video
                ref={videoRef}
                key={cam.src}
                className="absolute inset-0 h-full w-full object-cover"
                src={cam.src}
                poster={cam.thumbnail}
                autoPlay
                loop
                muted={muted}
                playsInline
                preload="auto"
                aria-label={`Flux vidéo en direct depuis ${cam.name}`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              {videoError && (
                <div
                  role="alert"
                  className="absolute inset-x-0 top-16 mx-auto flex max-w-md items-center gap-2 rounded-lg border border-warning/40 bg-black/70 px-3 py-2 text-xs text-warning backdrop-blur"
                >
                  <AlertTriangle size={14} aria-hidden />
                  {videoError}
                </div>
              )}

              {/* Overlay top */}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    {isStreaming ? "Live" : "Off air"}
                  </span>
                  <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur ring-1 ring-white/10">
                    {cam.name}
                  </span>
                  {isPip && (
                    <span className="rounded-full bg-accent-violet/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-violet ring-1 ring-accent-violet/40">
                      PiP actif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={togglePip}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                    aria-label="Picture-in-Picture"
                    title="Picture-in-Picture"
                  >
                    <PictureInPicture2 size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                    aria-label="Paramètres"
                  >
                    <Settings size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                    aria-label="Plein écran"
                  >
                    <Maximize2 size={14} aria-hidden />
                  </button>
                </div>
              </div>

              {/* Overlay bottom — controls */}
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-4">
                <button
                  type="button"
                  onClick={stopStream}
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full text-white shadow-elevated transition-transform hover:scale-105",
                    isStreaming
                      ? "bg-danger hover:bg-danger/90"
                      : "bg-success hover:bg-success/90",
                  )}
                  aria-label={isStreaming ? "Arrêter le live" : "Démarrer le live"}
                  title={isStreaming ? "Arrêter le live (Ctrl+S)" : "Démarrer le live"}
                >
                  {isStreaming ? <Square size={14} aria-hidden /> : <CircleDot size={16} aria-hidden />}
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                  aria-label={isPlaying ? "Pause" : "Lecture"}
                  title={isPlaying ? "Pause" : "Lecture"}
                >
                  {isPlaying ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
                </button>
                <div
                  className="relative"
                  onMouseEnter={() => setShowVolume(true)}
                  onMouseLeave={() => setShowVolume(false)}
                >
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                    aria-label={muted ? "Activer le son" : "Couper le son"}
                  >
                    {muted || volume === 0 ? (
                      <VolumeX size={14} aria-hidden />
                    ) : (
                      <Volume2 size={14} aria-hidden />
                    )}
                  </button>
                  {showVolume && (
                    <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-black/80 p-2 backdrop-blur ring-1 ring-white/10">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={muted ? 0 : volume}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setVolume(v);
                          if (v > 0 && muted) setMuted(false);
                          if (v === 0) setMuted(true);
                        }}
                        className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/20 accent-accent-violet"
                        aria-label="Volume"
                      />
                    </div>
                  )}
                </div>
                <span className="ml-auto rounded-full bg-black/40 px-3 py-1 text-[11px] font-mono text-white backdrop-blur tabular-nums">
                  {formatElapsed(elapsed)} · {resolution} · {bitrateMbps.toFixed(1)} Mbps
                </span>
              </div>
            </div>

            {/* Camera tiles */}
            <div className="grid grid-cols-4 gap-2 border-t border-white/[0.06] p-3">
              {cameras.map((c, i) => {
                const active = i === activeCamera;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => switchCamera(i)}
                    className={cn(
                      "group relative overflow-hidden rounded-lg ring-2 transition",
                      active ? "ring-accent-violet" : "ring-transparent hover:ring-white/15",
                    )}
                    aria-pressed={active}
                    aria-label={`Basculer sur ${c.name}`}
                  >
                    <div className="relative aspect-video bg-bg-elevated">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.thumbnail} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          <Camera size={8} aria-hidden />
                          {c.name}
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
              <HealthMetric label="Bitrate" value={`${bitrateMbps.toFixed(1)} Mbps`} status="ok" />
              <HealthMetric label="Encodage" value={`H.264 ${resolution}60`} status="ok" />
              <HealthMetric label="Latence" value="2.1 s" status="ok" />
              <HealthMetric label="Qualité" value={signalQuality} status={signalQuality === "Excellent" ? "ok" : signalQuality === "Bon" ? "warn" : "down"} />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">
                  Audio level (canal principal)
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                  <Mic size={10} className="text-success" aria-hidden />
                  Studio A · -12 dB
                </div>
              </div>
              <div className="flex h-10 items-end gap-0.5 rounded-md bg-white/[0.025] p-1.5 ring-1 ring-white/[0.06]" aria-hidden>
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
                    aria-label={t.status === "ok" ? "Connecté" : "Reconnexion en cours"}
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
                aria-label="Message du modérateur"
              />
              <button
                type="submit"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet text-white transition hover:opacity-95"
                aria-label="Envoyer"
              >
                <Send size={13} aria-hidden />
              </button>
            </form>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="mb-3 text-sm font-semibold text-text-primary">Statistiques du live</p>
            <ul className="space-y-3 text-xs">
              <StatRow label="Spectateurs actuels" value={formatCompact(viewers)} accent />
              <StatRow label="Pic d'audience" value={formatCompact(peakViewers)} />
              <StatRow label="Durée du flux" value={formatElapsed(elapsed)} />
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

function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
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
          aria-hidden
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
      <Icon size={13} className={on ? "text-accent-violet" : "text-text-muted"} aria-hidden />
      <span className="flex-1">{label}</span>
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          on ? "bg-accent-violet animate-pulse" : "bg-text-muted",
        )}
        aria-hidden
      />
    </button>
  );
}

/**
 * Public test feeds. We use Mux / Google sample MP4s because:
 *  - they're CORS-permissive (no proxy needed)
 *  - they're tiny so the preview pane starts instantly
 *  - looping makes them feel like a continuous live stream
 *
 * In production these are replaced by HLS manifests (`.m3u8`) served by the
 * media gateway behind a signed cookie.
 */
const cameras = [
  {
    name: "CAM 1",
    location: "Studio A",
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnail:
      "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=960&h=540&fit=crop&auto=format",
  },
  {
    name: "CAM 2",
    location: "Studio A",
    src: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
    thumbnail:
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=960&h=540&fit=crop&auto=format",
  },
  {
    name: "PLATEAU",
    location: "Plateau Principal",
    src: "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
    thumbnail:
      "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=960&h=540&fit=crop&auto=format",
  },
  {
    name: "TERRAIN",
    location: "Reportage Terrain",
    src: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
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
