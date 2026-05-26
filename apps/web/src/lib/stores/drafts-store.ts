"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Content, ChannelKey } from "@/types";

export interface ContentTemplate {
  key: string;
  label: string;
  description: string;
  type: Content["type"];
  channels: ChannelKey[];
  titlePlaceholder: string;
  bodySeed: string;
  emoji: string;
  gradient: string;
}

export const TEMPLATES: ContentTemplate[] = [
  {
    key: "reportage",
    label: "Reportage",
    description: "Format vidéo long avec voix-off et plans terrain. Diffusion principale sur web + YouTube + mobile.",
    type: "video",
    channels: ["web", "mobile", "youtube"],
    titlePlaceholder: "Reportage : titre accrocheur (50-65 caractères)",
    bodySeed: "Lieu, contexte, témoignages clés, séquences attendues…",
    emoji: "🎥",
    gradient: "from-accent-blue/30 to-accent-violet/20",
  },
  {
    key: "interview",
    label: "Interview",
    description: "Entretien plateau ou terrain de 5 à 25 min. Web + YouTube + Facebook.",
    type: "video",
    channels: ["web", "youtube", "facebook"],
    titlePlaceholder: "Interview — Prénom Nom · Sujet",
    bodySeed: "Profil de l'invité, angle, questions clés, citations à mettre en avant.",
    emoji: "🎙️",
    gradient: "from-pink-400/30 to-accent-violet/20",
  },
  {
    key: "flash",
    label: "Flash Info",
    description: "Format article court urgent. Diffusion immédiate sur web, mobile, Telegram et X.",
    type: "article",
    channels: ["web", "mobile", "telegram", "twitter"],
    titlePlaceholder: "FLASH — Sujet en majuscules",
    bodySeed: "Dépêche : 3-5 phrases factuelles, sources confirmées, mise à jour si évolution.",
    emoji: "⚡",
    gradient: "from-warning/30 to-pink-400/20",
  },
  {
    key: "edito",
    label: "Édito",
    description: "Édito vidéo hebdomadaire (2-4 min). Tous les canaux principaux.",
    type: "video",
    channels: ["web", "youtube", "facebook", "twitter"],
    titlePlaceholder: "Édito : thèse en une ligne",
    bodySeed: "Thèse, deux arguments principaux, contre-argument, conclusion engagée.",
    emoji: "✍️",
    gradient: "from-success/30 to-accent-blue/20",
  },
];

export interface Draft extends Content {
  templateKey: string;
  bodyDraft?: string;
}

interface DraftsState {
  drafts: Draft[];
  createFromTemplate: (template: ContentTemplate, authorId: string) => Draft;
  getById: (id: string) => Draft | undefined;
  remove: (id: string) => void;
}

export const useDraftsStore = create<DraftsState>()(
  persist(
    (set, get) => ({
      drafts: [],
      createFromTemplate: (template, authorId) => {
        const id = `draft-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const now = new Date().toISOString();
        const draft: Draft = {
          id,
          title: template.titlePlaceholder,
          excerpt: template.bodySeed,
          type: template.type,
          status: "draft",
          authorId,
          channels: template.channels,
          createdAt: now,
          updatedAt: now,
          templateKey: template.key,
          bodyDraft: template.bodySeed,
        };
        set({ drafts: [draft, ...get().drafts] });
        return draft;
      },
      getById: (id) => get().drafts.find((d) => d.id === id),
      remove: (id) => set({ drafts: get().drafts.filter((d) => d.id !== id) }),
    }),
    {
      name: "cmr-drafts",
    },
  ),
);
