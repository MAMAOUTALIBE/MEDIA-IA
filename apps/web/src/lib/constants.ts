import type { ChannelKey, Role, ContentStatus, AICheckType } from "@/types";

export const CHANNELS: Record<ChannelKey, { label: string; color: string; bg: string }> = {
  web: { label: "Site Web", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  mobile: { label: "Mobile Apps", color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
  youtube: { label: "YouTube", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  facebook: { label: "Facebook", color: "#1877f2", bg: "rgba(24,119,242,0.12)" },
  instagram: { label: "Instagram", color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  twitter: { label: "X / Twitter", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  tiktok: { label: "TikTok", color: "#a78bfa", bg: "rgba(167,139,250,0.14)" },
  telegram: { label: "Telegram", color: "#38bdf8", bg: "rgba(56,189,248,0.14)" },
  smarttv: { label: "Smart TV", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
};

export const CHANNEL_ORDER: ChannelKey[] = [
  "web",
  "mobile",
  "youtube",
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "telegram",
  "smarttv",
];

export const ROLES: Record<Role, { label: string; color: string }> = {
  journalist: { label: "Journaliste", color: "#22d3ee" },
  editor: { label: "Rédacteur", color: "#60a5fa" },
  chief: { label: "Chef d'édition", color: "#a78bfa" },
  direction: { label: "Direction éditoriale", color: "#f472b6" },
  community_manager: { label: "Community Manager", color: "#f59e0b" },
  admin: { label: "Administrateur", color: "#10b981" },
};

export const STATUS: Record<ContentStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Brouillon", color: "#9ca3af", bg: "rgba(156,163,175,0.16)" },
  pending_editor: { label: "Chez le rédacteur", color: "#60a5fa", bg: "rgba(96,165,250,0.16)" },
  pending_chief: { label: "Chef d'édition", color: "#a78bfa", bg: "rgba(167,139,250,0.18)" },
  pending_direction: { label: "Direction", color: "#f472b6", bg: "rgba(244,114,182,0.18)" },
  published: { label: "Publié", color: "#10b981", bg: "rgba(16,185,129,0.18)" },
  rejected: { label: "Rejeté", color: "#ef4444", bg: "rgba(239,68,68,0.18)" },
};

export const AI_CHECKS: Record<AICheckType, { label: string; description: string }> = {
  spelling: { label: "Orthographe & Grammaire", description: "Analyse linguistique automatique" },
  plagiarism: { label: "Doublons & Plagiat", description: "Croisement sur le corpus éditorial" },
  sensitive: { label: "Contenu sensible", description: "Détection de contenu inapproprié" },
  copyright: { label: "Droits d'auteur", description: "Vérification des sources et licences" },
  media_quality: { label: "Qualité média", description: "Résolution, bruit, recadrage" },
  seo: { label: "SEO & Lisibilité", description: "Lisibilité, mots-clés, structure" },
  fake_news: { label: "Détection fake news", description: "Croisement avec sources de confiance" },
};

export const WORKFLOW_STEPS = [
  { key: "journalist", label: "Journaliste", description: "Création du contenu" },
  { key: "editor", label: "Rédacteur", description: "Vérification et correction" },
  { key: "chief", label: "Chef d'édition", description: "Validation éditoriale" },
  { key: "direction", label: "Direction", description: "Approbation finale" },
  { key: "publish", label: "Publication", description: "Diffusion automatique" },
] as const;
