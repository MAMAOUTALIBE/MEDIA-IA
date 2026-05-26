import type { AICheckResult } from "@/types";

export const aiCheckResults: AICheckResult[] = [
  { type: "spelling", status: "passed", score: 99, message: "Aucune erreur détectée" },
  { type: "plagiarism", status: "passed", score: 100, message: "Pas de doublon détecté" },
  { type: "sensitive", status: "passed", score: 97, message: "Aucun contenu sensible" },
  { type: "copyright", status: "passed", score: 100, message: "Sources et licences vérifiées" },
  { type: "media_quality", status: "passed", score: 96, message: "Qualité conforme aux standards" },
  { type: "seo", status: "warning", score: 92, message: "Suggérer un mot-clé secondaire" },
  { type: "fake_news", status: "passed", score: 99, message: "Croisement OK avec sources de confiance" },
];

export const aiGlobalScore = 98;

export const aiRecommendations = [
  "Ajouter un mot-clé SEO secondaire",
  "Optimiser la longueur du titre (62 → 56 caractères)",
  "Ajouter une image de couverture au format 16:9",
];
