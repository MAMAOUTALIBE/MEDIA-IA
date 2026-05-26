"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChannelKey } from "@/types";

export type MobileStep = "submitted" | "editor" | "chief" | "direction" | "published";

export interface MobileSubmission {
  id: string;
  title: string;
  category: string;
  body: string;
  channels: ChannelKey[];
  step: MobileStep;
  createdAt: string;
  history: Array<{ step: MobileStep; at: string; actor: string }>;
}

interface MobileState {
  submissions: MobileSubmission[];
  submit: (payload: Omit<MobileSubmission, "id" | "step" | "createdAt" | "history">) => MobileSubmission;
  advance: (id: string) => void;
  reset: () => void;
}

const seed: MobileSubmission[] = [
  {
    id: "ms-1",
    title: "Ouverture du nouveau centre culturel à Dakar",
    category: "Culture",
    body: "Le nouveau centre culturel de Dakar a été officiellement inauguré samedi en présence de plusieurs personnalités…",
    channels: ["web", "facebook", "instagram"],
    step: "chief",
    createdAt: "2026-05-26T10:32:00",
    history: [
      { step: "submitted", at: "2026-05-26T10:15:00", actor: "Vous · Journaliste" },
      { step: "editor", at: "2026-05-26T10:20:00", actor: "Mathieu Lefèvre · Rédacteur" },
      { step: "chief", at: "2026-05-26T10:32:00", actor: "Fatou Ndiaye · Chef d'édition" },
    ],
  },
  {
    id: "ms-2",
    title: "Interview — Artiste XYZ",
    category: "Culture",
    body: "Entretien réalisé sur le plateau B, focus sur le nouveau projet de l'artiste…",
    channels: ["web", "youtube"],
    step: "submitted",
    createdAt: "2026-05-26T08:50:00",
    history: [
      { step: "submitted", at: "2026-05-26T08:50:00", actor: "Vous · Journaliste" },
    ],
  },
  {
    id: "ms-3",
    title: "Conférence de presse — Premier Ministre",
    category: "Politique",
    body: "Conférence de presse publiée intégralement après validation Direction.",
    channels: ["web", "youtube", "facebook", "twitter"],
    step: "published",
    createdAt: "2026-05-25T16:00:00",
    history: [
      { step: "submitted", at: "2026-05-25T15:30:00", actor: "Vous · Journaliste" },
      { step: "editor", at: "2026-05-25T15:42:00", actor: "Claire Dubois · Rédactrice" },
      { step: "chief", at: "2026-05-25T16:01:00", actor: "Fatou Ndiaye · Chef d'édition" },
      { step: "direction", at: "2026-05-25T16:25:00", actor: "Vincent Moreau · Direction" },
      { step: "published", at: "2026-05-25T17:30:00", actor: "Automation · Publication" },
    ],
  },
];

export const useMobileStore = create<MobileState>()(
  persist(
    (set, get) => ({
      submissions: seed,
      submit: (payload) => {
        const id = `ms-${Date.now().toString(36)}`;
        const now = new Date().toISOString();
        const sub: MobileSubmission = {
          ...payload,
          id,
          step: "submitted",
          createdAt: now,
          history: [{ step: "submitted", at: now, actor: "Vous · Journaliste" }],
        };
        set({ submissions: [sub, ...get().submissions] });
        return sub;
      },
      advance: (id) =>
        set({
          submissions: get().submissions.map((s) => {
            if (s.id !== id) return s;
            const next: MobileStep =
              s.step === "submitted"
                ? "editor"
                : s.step === "editor"
                  ? "chief"
                  : s.step === "chief"
                    ? "direction"
                    : s.step === "direction"
                      ? "published"
                      : "published";
            return {
              ...s,
              step: next,
              history: [
                ...s.history,
                { step: next, at: new Date().toISOString(), actor: actorFor(next) },
              ],
            };
          }),
        }),
      reset: () => set({ submissions: seed }),
    }),
    {
      name: "cmr-mobile",
    },
  ),
);

function actorFor(step: MobileStep): string {
  switch (step) {
    case "editor":
      return "Mathieu Lefèvre · Rédacteur";
    case "chief":
      return "Fatou Ndiaye · Chef d'édition";
    case "direction":
      return "Vincent Moreau · Direction";
    case "published":
      return "Automation · Publication";
    default:
      return "Vous · Journaliste";
  }
}

export const STEP_LABEL: Record<MobileStep, string> = {
  submitted: "Soumis",
  editor: "Rédacteur",
  chief: "Chef d'édition",
  direction: "Direction",
  published: "Publié",
};

export const STEP_COLOR: Record<MobileStep, string> = {
  submitted: "#22d3ee",
  editor: "#60a5fa",
  chief: "#a78bfa",
  direction: "#f472b6",
  published: "#10b981",
};
