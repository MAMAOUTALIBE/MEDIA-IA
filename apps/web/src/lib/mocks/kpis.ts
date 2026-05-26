import type { KpiMetric } from "@/types";

function spark(seed: number, points = 12, base = 50, amp = 20): number[] {
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(Math.round(base + (s / 233280) * amp));
  }
  return out;
}

export const dashboardKpis: KpiMetric[] = [
  {
    key: "contents",
    label: "Contenus publiés",
    value: 1248,
    delta: 12.5,
    trend: "up",
    formatter: "number",
    sparkline: spark(11),
  },
  {
    key: "audience",
    label: "Audience totale",
    value: 2_400_000,
    delta: 18.7,
    trend: "up",
    formatter: "compact",
    sparkline: spark(23),
  },
  {
    key: "video_views",
    label: "Vues vidéos",
    value: 5_700_000,
    delta: 23.1,
    trend: "up",
    formatter: "compact",
    sparkline: spark(37),
  },
  {
    key: "engagement",
    label: "Taux d'engagement",
    value: 4.8,
    delta: 8.3,
    trend: "up",
    formatter: "percent",
    sparkline: spark(53),
  },
];

export const landingSynthesisKpis = [
  {
    key: "time_saved",
    label: "Gain de temps",
    value: "Jusqu'à 60%",
    description: "Réduction du temps de publication grâce à l'automatisation IA.",
  },
  {
    key: "quality",
    label: "Qualité garantie",
    value: "98/100",
    description: "Score moyen de conformité éditoriale après vérification automatique.",
  },
  {
    key: "audience",
    label: "Audience augmentée",
    value: "+24%",
    description: "Plus d'engagement sur l'ensemble des canaux digitaux.",
  },
  {
    key: "costs",
    label: "Coûts optimisés",
    value: "-32%",
    description: "Centralisation des outils et réduction des opérations manuelles.",
  },
] as const;
