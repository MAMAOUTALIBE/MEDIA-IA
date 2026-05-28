"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { useRecentActivity } from "@/lib/queries";
import { useSocketActivity } from "@/lib/socket";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatRelative } from "@/lib/format";
import { Send, ShieldCheck, MessageSquare, Zap, AlertTriangle, Radio, RadioTower } from "lucide-react";
import type { ActivityEvent, ActivityType } from "@/types";

const iconByType: Record<ActivityType, React.ComponentType<{ size?: number; className?: string }>> = {
  publication: Send,
  validation: ShieldCheck,
  comment: MessageSquare,
  automation: Zap,
  alert: AlertTriangle,
};

const colorByType: Record<ActivityType, string> = {
  publication: "text-info",
  validation: "text-success",
  comment: "text-accent-violet",
  automation: "text-accent-blue",
  alert: "text-warning",
};

const templates: Array<Omit<ActivityEvent, "id" | "at">> = [
  {
    type: "publication",
    actor: { name: "Karim Benali", initials: "KB", color: "#10b981" },
    message: "A publié un nouveau format vertical sur TikTok et Instagram",
  },
  {
    type: "validation",
    actor: { name: "Sophie Martin", initials: "SM", color: "#c084fc" },
    message: "A validé l'enquête « Société — Logement étudiant »",
  },
  {
    type: "automation",
    actor: { name: "Automation", initials: "AU", color: "#10b981" },
    message: "Transcription Whisper terminée — sous-titres FR générés",
  },
  {
    type: "comment",
    actor: { name: "Vincent Moreau", initials: "VM", color: "#f472b6" },
    message: "A commenté la tribune libre : « Préciser la source en page 2 »",
  },
  {
    type: "publication",
    actor: { name: "Aïssatou Diop", initials: "AD", color: "#22d3ee" },
    message: "A diffusé une dépêche Flash Info sur X et Telegram",
  },
  {
    type: "alert",
    actor: { name: "Système IA", initials: "IA", color: "#f59e0b" },
    message: "Score IA recalculé pour l'édito vidéo — 99/100",
  },
  {
    type: "automation",
    actor: { name: "Automation", initials: "AU", color: "#10b981" },
    message: "3 shorts verticaux générés depuis le Journal de 20h",
  },
  {
    type: "validation",
    actor: { name: "Fatou Ndiaye", initials: "FN", color: "#a78bfa" },
    message: "A validé l'interview ministérielle — étape Chef d'édition franchie",
  },
  {
    type: "comment",
    actor: { name: "Élise Rousseau", initials: "ER", color: "#10b981" },
    message: "A mentionné @journalistes-sport dans la conférence d'arbitrage",
  },
  {
    type: "publication",
    actor: { name: "Omar Touré", initials: "OT", color: "#ec4899" },
    message: "Reportage culturel mis en ligne sur le site et Facebook",
  },
];

export function RecentActivityFeed() {
  const { data, error, isError, refetch } = useRecentActivity();
  const [liveItems, setLiveItems] = useState<ActivityEvent[]>([]);

  // WebSocket — events pushés depuis l'API si connectée
  const socketStatus = useSocketActivity((event) => {
    const newEvent: ActivityEvent = {
      type: event.type,
      actor: event.actor,
      message: event.message,
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: event.at,
    };
    setLiveItems((prev) => [newEvent, ...prev].slice(0, 10));
  });

  // Fallback : setInterval local quand WebSocket pas connecté
  useEffect(() => {
    if (socketStatus.connected) return; // serveur prend le relais
    const id = setInterval(() => {
      const tpl = templates[Math.floor(Math.random() * templates.length)];
      if (!tpl) return;
      const newEvent: ActivityEvent = {
        ...tpl,
        id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        at: new Date().toISOString(),
      };
      setLiveItems((prev) => [newEvent, ...prev].slice(0, 10));
    }, 9000 + Math.random() * 3000);
    return () => clearInterval(id);
  }, [socketStatus.connected]);

  const items: ActivityEvent[] = [...liveItems, ...(data ?? [])].slice(0, 20);

  return (
    <GlassCard className="flex h-full flex-col">
      <GlassCardHeader
        title="Activité récente"
        description={
          socketStatus.connected
            ? `Stream serveur · tick #${socketStatus.serverTick ?? "—"}`
            : "Auto-rafraîchie en temps réel (mode local)"
        }
        action={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              socketStatus.connected
                ? "bg-accent-violet/15 text-accent-violet"
                : "bg-success-soft text-success"
            }`}
          >
            {socketStatus.connected ? (
              <RadioTower size={10} className="animate-pulse" />
            ) : (
              <Radio size={10} className="animate-pulse" />
            )}
            {socketStatus.connected ? "WebSocket" : "Live"}
          </span>
        }
      />
      {isError ? (
        <ApiErrorState error={error} onRetry={() => void refetch()} />
      ) : (
      <ul className="max-h-[26rem] divide-y divide-white/[0.05] overflow-y-auto">
        <AnimatePresence initial={false}>
          {items.map((e) => {
            const Icon = iconByType[e.type];
            return (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, y: -12, backgroundColor: "rgba(139, 92, 246, 0.10)" }}
                animate={{ opacity: 1, y: 0, backgroundColor: "rgba(139, 92, 246, 0)" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3 px-5 py-3.5"
              >
                <InitialsAvatar
                  initials={e.actor.initials}
                  color={e.actor.color}
                  size={32}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">{e.message}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <Icon size={12} className={colorByType[e.type]} />
                    <span className="text-text-muted">{e.actor.name}</span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-muted">{formatRelative(e.at)}</span>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      )}
    </GlassCard>
  );
}
