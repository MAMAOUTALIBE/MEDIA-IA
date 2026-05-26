import type { SystemAlert } from "@/types";

export const systemAlerts: SystemAlert[] = [
  {
    id: "al1",
    severity: "warning",
    title: "Espace stockage vidéo",
    detail: "85% utilisé — pensez à archiver les rushes anciens du DAM.",
    at: "2026-05-26T10:50:00",
  },
  {
    id: "al2",
    severity: "warning",
    title: "3 workflows en retard",
    detail: "Trois contenus en attente de validation depuis plus de 2h.",
    at: "2026-05-26T10:40:00",
  },
  {
    id: "al3",
    severity: "error",
    title: "Échec de la vérification IA",
    detail: "Un contenu a échoué à la détection de doublons et a été remis en attente.",
    at: "2026-05-26T10:25:00",
  },
  {
    id: "al4",
    severity: "info",
    title: "Mise à jour planifiée",
    detail: "Maintenance prévue dimanche 31 mai à 02:00, durée estimée 30 min.",
    at: "2026-05-26T09:15:00",
  },
];
