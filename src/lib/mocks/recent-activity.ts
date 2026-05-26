import type { ActivityEvent } from "@/types";

export const recentActivity: ActivityEvent[] = [
  {
    id: "a1",
    type: "publication",
    actor: { name: "Aïssatou Diop", initials: "AD", color: "#22d3ee" },
    message: "Le journal de 20h du 26/05/2026 a été publié sur Site web, YouTube, Facebook",
    at: "2026-05-26T20:02:00",
  },
  {
    id: "a2",
    type: "validation",
    actor: { name: "Fatou Ndiaye", initials: "FN", color: "#a78bfa" },
    message: "Interview — Ministre de la Culture en cours de validation",
    at: "2026-05-26T10:35:00",
  },
  {
    id: "a3",
    type: "publication",
    actor: { name: "Omar Touré", initials: "OT", color: "#ec4899" },
    message: "Reportage — Festival des musiques publié sur Site web, Instagram",
    at: "2026-05-26T09:58:00",
  },
  {
    id: "a4",
    type: "alert",
    actor: { name: "Système IA", initials: "IA", color: "#f59e0b" },
    message: "Flash Info — Élections régionales publié sur Telegram, Twitter",
    at: "2026-05-26T08:55:00",
  },
  {
    id: "a5",
    type: "automation",
    actor: { name: "Automation", initials: "AU", color: "#10b981" },
    message: "Documentaire — Terres d'Afrique programmé pour ce soir 20:00",
    at: "2026-05-26T08:10:00",
  },
  {
    id: "a6",
    type: "comment",
    actor: { name: "Vincent Moreau", initials: "VM", color: "#f472b6" },
    message: "A commenté la tribune libre : « Revoir le second paragraphe »",
    at: "2026-05-26T10:18:00",
  },
  {
    id: "a7",
    type: "validation",
    actor: { name: "Sophie Martin", initials: "SM", color: "#c084fc" },
    message: "Validé le reportage Inondations dans le delta",
    at: "2026-05-26T10:25:00",
  },
  {
    id: "a8",
    type: "publication",
    actor: { name: "Ndèye Faye", initials: "NF", color: "#f59e0b" },
    message: "Format vertical diffusé sur TikTok et Instagram",
    at: "2026-05-26T00:05:00",
  },
  {
    id: "a9",
    type: "alert",
    actor: { name: "Système IA", initials: "IA", color: "#f59e0b" },
    message: "Vérification linguistique terminée — score 98/100",
    at: "2026-05-26T10:42:00",
  },
  {
    id: "a10",
    type: "automation",
    actor: { name: "Automation", initials: "AU", color: "#10b981" },
    message: "Newsletter du matin envoyée à 84 312 abonnés",
    at: "2026-05-26T07:00:00",
  },
];
