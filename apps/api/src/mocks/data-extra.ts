// Extended in-memory mocks for Phase O — datasets remaining for /activity,
// /media, /automations, /calendar, /analytics, /diffusion, /audience, /ai/checks,
// /contents/pending.

import type { ChannelKey, ContentType } from "@cmr/types";

// ----------------------------- Recent activity -----------------------------

export type ActivityType = "publication" | "validation" | "comment" | "automation" | "alert";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  actor: { name: string; initials: string; color: string };
  message: string;
  at: string;
}

export const recentActivity: ActivityEvent[] = [
  { id: "a1", type: "publication", actor: { name: "Aïssatou Diop", initials: "AD", color: "#22d3ee" }, message: "Le journal de 20h du 26/05/2026 a été publié sur Site web, YouTube, Facebook", at: "2026-05-26T20:02:00" },
  { id: "a2", type: "validation", actor: { name: "Fatou Ndiaye", initials: "FN", color: "#a78bfa" }, message: "Interview — Ministre de la Culture en cours de validation", at: "2026-05-26T10:35:00" },
  { id: "a3", type: "publication", actor: { name: "Omar Touré", initials: "OT", color: "#ec4899" }, message: "Reportage — Festival des musiques publié sur Site web, Instagram", at: "2026-05-26T09:58:00" },
  { id: "a4", type: "alert", actor: { name: "Système IA", initials: "IA", color: "#f59e0b" }, message: "Flash Info — Élections régionales publié sur Telegram, Twitter", at: "2026-05-26T08:55:00" },
  { id: "a5", type: "automation", actor: { name: "Automation", initials: "AU", color: "#10b981" }, message: "Documentaire — Terres d'Afrique programmé pour ce soir 20:00", at: "2026-05-26T08:10:00" },
  { id: "a6", type: "comment", actor: { name: "Vincent Moreau", initials: "VM", color: "#f472b6" }, message: "A commenté la tribune libre : « Revoir le second paragraphe »", at: "2026-05-26T10:18:00" },
  { id: "a7", type: "validation", actor: { name: "Sophie Martin", initials: "SM", color: "#c084fc" }, message: "Validé le reportage Inondations dans le delta", at: "2026-05-26T10:25:00" },
  { id: "a8", type: "publication", actor: { name: "Ndèye Faye", initials: "NF", color: "#f59e0b" }, message: "Format vertical diffusé sur TikTok et Instagram", at: "2026-05-26T00:05:00" },
  { id: "a9", type: "alert", actor: { name: "Système IA", initials: "IA", color: "#f59e0b" }, message: "Vérification linguistique terminée — score 98/100", at: "2026-05-26T10:42:00" },
  { id: "a10", type: "automation", actor: { name: "Automation", initials: "AU", color: "#10b981" }, message: "Newsletter du matin envoyée à 84 312 abonnés", at: "2026-05-26T07:00:00" },
];

// ----------------------------- Pending contents (validation queue) -----------------------------

export interface PendingContent {
  id: string;
  contentId: string;
  title: string;
  author: { name: string; initials: string; color: string };
  step: "editor" | "chief" | "direction";
  submittedAt: string;
  type: ContentType;
  thumbnail?: string;
}

export const pendingContents: PendingContent[] = [
  { id: "p1", contentId: "c2", title: "Ouverture du nouveau centre culturel à Dakar", author: { name: "Aïssatou Diop", initials: "AD", color: "#22d3ee" }, step: "editor", submittedAt: "2026-05-26T10:32:00", type: "article", thumbnail: "1517457373958-b7bdd4587205" },
  { id: "p2", contentId: "c2b", title: "Interview — Ministre de la Culture", author: { name: "Karim Benali", initials: "KB", color: "#10b981" }, step: "chief", submittedAt: "2026-05-26T10:34:00", type: "video", thumbnail: "1521737711867-e3b97375f902" },
  { id: "p3", contentId: "c2c", title: "Émission — Éducation et numérique", author: { name: "Mathieu Lefèvre", initials: "ML", color: "#60a5fa" }, step: "editor", submittedAt: "2026-05-26T10:43:00", type: "video", thumbnail: "1503676260728-1c00da094a0b" },
  { id: "p4", contentId: "c2d", title: "Reportage — Inondations dans le delta", author: { name: "Karim Benali", initials: "KB", color: "#10b981" }, step: "chief", submittedAt: "2026-05-26T10:14:00", type: "video", thumbnail: "1547036967-23d11aacaee0" },
  { id: "p5", contentId: "c2e", title: "Tech — Lancement satellite national", author: { name: "Sophie Martin", initials: "SM", color: "#c084fc" }, step: "direction", submittedAt: "2026-05-26T10:55:00", type: "video", thumbnail: "1446776877081-d282a0f896e2" },
  { id: "p6", contentId: "c2f", title: "Société — Logement étudiant", author: { name: "Omar Touré", initials: "OT", color: "#ec4899" }, step: "chief", submittedAt: "2026-05-26T10:21:00", type: "article", thumbnail: "1497366216548-37526070297c" },
];

// ----------------------------- AI checks -----------------------------

export const aiCheckResults = [
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

// ----------------------------- Audience time series -----------------------------

export interface TimeSeriesPoint { date: string; views: number; users: number; }

function buildSeries(days: number, seed = 91): TimeSeriesPoint[] {
  let s = seed;
  const out: TimeSeriesPoint[] = [];
  const baseDate = new Date("2026-05-26T00:00:00");
  for (let i = days - 1; i >= 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const r1 = s / 233280;
    s = (s * 9301 + 49297) % 233280;
    const r2 = s / 233280;
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const trend = 1 + (days - i) * 0.012;
    const views = Math.round((620_000 + r1 * 220_000) * trend);
    const users = Math.round(views * (0.32 + r2 * 0.12));
    out.push({ date: d.toISOString().slice(0, 10), views, users });
  }
  return out;
}

export const audience7d = buildSeries(7, 191);
export const audience30d = buildSeries(30, 211);
export const audience90d = buildSeries(90, 511);

// ----------------------------- Media (DAM) -----------------------------

const photoIds = [
  "1611162616305-c69b3fa7fbe0", "1521737711867-e3b97375f902", "1493225457124-a3eb161ffa5f",
  "1529107386315-e1a2ed48a620", "1523805009345-7448845a9e53", "1503676260728-1c00da094a0b",
  "1547036967-23d11aacaee0", "1568992687947-868a62a9f521", "1514525253161-7a46d19cd819",
  "1517649763962-0c623066013b", "1554224155-6726b3ff858f", "1493612276216-ee3925520721",
  "1502082553048-f009c37129b9", "1521295121783-8a321d551ad2", "1513519245088-0e12902e5a38",
  "1517502884422-41eaead166d4", "1497366216548-37526070297c", "1559526324-4b87b5e36e44",
  "1517457373958-b7bdd4587205", "1446776877081-d282a0f896e2",
];

const titles = [
  "Journal de 20h", "Interview Ministre Culture", "Festival des musiques", "Élections régionales",
  "Terres d'Afrique", "Éducation et numérique", "Inondations delta", "Conférence PM",
  "Backstage festival", "Finale championnat", "Croissance 2026", "Cyber-sécurité",
  "Bulletin météo", "Sommet UA", "Vernissage Dakar", "Presse arbitrage",
  "Logement étudiant", "Marchés financiers", "Centre culturel", "Satellite national",
];

const mediaTypes = ["video","video","video","image","video","video","video","video","video","video","image","audio","video","image","image","image","image","image","image","video"] as const;
const sizes = ["1.8 GB","780 MB","1.2 GB","8.4 MB","2.1 GB","1.6 GB","910 MB","1.4 GB","120 MB","3.2 GB","6.1 MB","84 MB","420 MB","5.4 MB","9.1 MB","4.6 MB","7.8 MB","11 MB","6.7 MB","1.7 GB"];

export const mediaAssets = photoIds.map((id, i) => ({
  id: `m${i + 1}`,
  title: titles[i] ?? `Asset ${i + 1}`,
  type: mediaTypes[i],
  url: `https://images.unsplash.com/photo-${id}?w=600&h=400&fit=crop&auto=format`,
  thumbnail: `https://images.unsplash.com/photo-${id}?w=320&h=200&fit=crop&auto=format`,
  size: sizes[i] ?? "—",
  duration: mediaTypes[i] === "video" ? 120 + (i * 23) : undefined,
  uploadedAt: `2026-05-${String(20 + (i % 6)).padStart(2, "0")}T${String(8 + (i % 10)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00`,
  uploadedBy: `Équipe ${["Politique","Culture","Sport","Société","International","Économie"][i % 6]}`,
  tags: ["actualité", "national", mediaTypes[i]],
}));

// ----------------------------- Automations -----------------------------

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  active: boolean;
  runs: number;
  lastRun: string;
  icon: "zap" | "bell" | "calendar" | "link" | "video" | "globe";
}

export const automationRules: AutomationRule[] = [
  { id: "ar1", name: "Publication automatique réseaux sociaux", description: "Quand un contenu est approuvé, publier sur Facebook, X et Instagram.", trigger: "Contenu approuvé", action: "Publier sur Facebook + X + Instagram", active: true, runs: 142, lastRun: "2026-05-26T10:55:00", icon: "zap" },
  { id: "ar2", name: "Newsletter du matin", description: "Chaque jour à 7h, envoyer la newsletter aux abonnés.", trigger: "Tous les jours à 7h", action: "Envoyer newsletter (84 312 abonnés)", active: true, runs: 365, lastRun: "2026-05-26T07:00:00", icon: "calendar" },
  { id: "ar3", name: "Transcription automatique vidéo", description: "À l'upload d'une vidéo, lancer Whisper.", trigger: "Vidéo uploadée", action: "Transcription + sous-titres FR", active: true, runs: 87, lastRun: "2026-05-26T10:32:00", icon: "video" },
  { id: "ar4", name: "Alertes éditoriales urgentes", description: "Si Breaking News, notifier la direction.", trigger: "Statut Breaking News", action: "Notifier direction (push + SMS)", active: true, runs: 14, lastRun: "2026-05-26T08:30:00", icon: "bell" },
  { id: "ar5", name: "Cross-posting YouTube → Site", description: "Republier auto les vidéos YouTube validées.", trigger: "Vidéo YouTube publiée", action: "Création article + intégration", active: false, runs: 23, lastRun: "2026-05-22T18:30:00", icon: "link" },
  { id: "ar6", name: "Génération de shorts", description: "Découper les vidéos longues en formats courts.", trigger: "Vidéo > 5 minutes publiée", action: "Génération 3 shorts verticaux", active: true, runs: 38, lastRun: "2026-05-26T09:58:00", icon: "video" },
  { id: "ar7", name: "Archivage automatique", description: "Archiver les médias non utilisés depuis 90 jours.", trigger: "Tous les dimanches à 2h", action: "Déplacer vers archives", active: true, runs: 24, lastRun: "2026-05-25T02:00:00", icon: "globe" },
  { id: "ar8", name: "Modération commentaires IA", description: "Modérer les commentaires toxiques.", trigger: "Nouveau commentaire", action: "Masquer + alerter modérateur", active: true, runs: 1284, lastRun: "2026-05-26T10:58:00", icon: "bell" },
];

// ----------------------------- Calendar events -----------------------------

const calChannels: ChannelKey[] = ["web", "mobile", "youtube", "facebook", "instagram", "twitter", "tiktok", "telegram", "smarttv"];
const calTypes: ContentType[] = ["article", "video", "social", "audio"];
const calTitles = ["Journal de 20h","Magazine politique","Interview exclusive","Documentaire","Reportage terrain","Édito vidéo","Bulletin météo","Émission de débat","Coulisses festival","Tribune libre","Podcast Tech & Société","Critique cinéma","Analyse économique","Sport en direct","Format social vertical"];

function buildEvents() {
  const events: { id: string; title: string; date: string; channel: ChannelKey; contentType: ContentType }[] = [];
  const baseDate = new Date("2026-05-01T00:00:00");
  let seed = 17;
  for (let i = 0; i < 32; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r1 = seed / 233280;
    seed = (seed * 9301 + 49297) % 233280;
    const r2 = seed / 233280;
    const day = Math.floor(r1 * 31) + 1;
    const date = new Date(baseDate);
    date.setDate(day);
    date.setHours(6 + Math.floor(r2 * 16), 0, 0, 0);
    events.push({
      id: `cal${i}`,
      title: calTitles[i % calTitles.length] ?? "Publication",
      date: date.toISOString(),
      channel: calChannels[i % calChannels.length]!,
      contentType: calTypes[i % calTypes.length]!,
    });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export const calendarEvents = buildEvents();

// ----------------------------- Analytics deep -----------------------------

export const engagementByDayOfWeek = [
  { day: "Lun", engagement: 4.2 }, { day: "Mar", engagement: 4.5 },
  { day: "Mer", engagement: 4.7 }, { day: "Jeu", engagement: 5.1 },
  { day: "Ven", engagement: 5.6 }, { day: "Sam", engagement: 6.4 },
  { day: "Dim", engagement: 5.9 },
];

export const topContents = [
  { id: "tc1", title: "Le journal de 20h du 26/05", channel: "youtube" as ChannelKey, views: 482_300, engagement: 6.1 },
  { id: "tc2", title: "Backstage festival", channel: "tiktok" as ChannelKey, views: 642_100, engagement: 11.2 },
  { id: "tc3", title: "Flash Info — Élections", channel: "telegram" as ChannelKey, views: 312_400, engagement: 5.2 },
  { id: "tc4", title: "Reportage Festival musiques", channel: "instagram" as ChannelKey, views: 218_700, engagement: 8.4 },
  { id: "tc5", title: "Conférence PM", channel: "facebook" as ChannelKey, views: 158_900, engagement: 4.7 },
  { id: "tc6", title: "Documentaire Terres Afrique", channel: "smarttv" as ChannelKey, views: 142_500, engagement: 5.8 },
  { id: "tc7", title: "Portrait d'un champion", channel: "youtube" as ChannelKey, views: 87_500, engagement: 5.8 },
  { id: "tc8", title: "Édito vidéo", channel: "web" as ChannelKey, views: 41_200, engagement: 4.5 },
  { id: "tc9", title: "Sport — Arbitrage", channel: "twitter" as ChannelKey, views: 36_900, engagement: 3.1 },
  { id: "tc10", title: "Podcast Cyber-sécurité", channel: "web" as ChannelKey, views: 24_300, engagement: 3.8 },
];

export const topChannels = [
  { channel: "web", label: "Site Web", color: "#60a5fa", views: 1_580_000 },
  { channel: "youtube", label: "YouTube", color: "#ef4444", views: 1_420_000 },
  { channel: "facebook", label: "Facebook", color: "#1877f2", views: 920_000 },
  { channel: "mobile", label: "Mobile Apps", color: "#22d3ee", views: 880_000 },
  { channel: "instagram", label: "Instagram", color: "#ec4899", views: 540_000 },
  { channel: "tiktok", label: "TikTok", color: "#a78bfa", views: 410_000 },
  { channel: "twitter", label: "X / Twitter", color: "#94a3b8", views: 280_000 },
  { channel: "telegram", label: "Telegram", color: "#38bdf8", views: 190_000 },
  { channel: "smarttv", label: "Smart TV", color: "#f59e0b", views: 140_000 },
];

// ----------------------------- Diffusion matrix -----------------------------

export const diffusionMatrix = [
  { contentId: "c1", contentTitle: "Le journal de 20h du 26/05/2026", byChannel: { web: "published", mobile: "published", youtube: "published", facebook: "published", instagram: "na", twitter: "na", tiktok: "na", telegram: "na", smarttv: "na" } },
  { contentId: "c2", contentTitle: "Interview — Ministre de la Culture", byChannel: { web: "scheduled", mobile: "na", youtube: "scheduled", facebook: "na", instagram: "scheduled", twitter: "na", tiktok: "na", telegram: "na", smarttv: "na" } },
  { contentId: "c3", contentTitle: "Reportage — Festival des musiques", byChannel: { web: "published", mobile: "published", youtube: "na", facebook: "na", instagram: "published", twitter: "na", tiktok: "published", telegram: "na", smarttv: "na" } },
  { contentId: "c4", contentTitle: "Flash Info — Élections régionales", byChannel: { web: "published", mobile: "published", youtube: "na", facebook: "na", instagram: "na", twitter: "published", tiktok: "na", telegram: "published", smarttv: "na" } },
  { contentId: "c5", contentTitle: "Documentaire — Terres d'Afrique", byChannel: { web: "scheduled", mobile: "na", youtube: "scheduled", facebook: "na", instagram: "na", twitter: "na", tiktok: "na", telegram: "na", smarttv: "scheduled" } },
  { contentId: "c6", contentTitle: "Émission — Éducation et numérique", byChannel: { web: "scheduled", mobile: "na", youtube: "scheduled", facebook: "scheduled", instagram: "na", twitter: "na", tiktok: "na", telegram: "na", smarttv: "na" } },
  { contentId: "c7", contentTitle: "Reportage — Inondations dans le delta", byChannel: { web: "scheduled", mobile: "scheduled", youtube: "scheduled", facebook: "na", instagram: "na", twitter: "na", tiktok: "na", telegram: "na", smarttv: "na" } },
  { contentId: "c8", contentTitle: "Conférence de presse — Premier Ministre", byChannel: { web: "published", mobile: "na", youtube: "published", facebook: "published", instagram: "na", twitter: "published", tiktok: "na", telegram: "na", smarttv: "na" } },
];

export const diffusionStats = {
  publishedToday: 38,
  scheduled: 12,
  failed: 2,
};
