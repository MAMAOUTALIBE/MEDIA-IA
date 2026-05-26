// CMR API — in-memory mock data (Phase H scaffolding)
//
// Until the Prisma migration is run on a real Postgres (Phase 1), the API serves
// these in-memory datasets. They mirror `apps/web/src/lib/mocks/*` so frontend
// and backend stay consistent during the swap. Single source of truth will move
// to `packages/db` once migrations are alive.

import type {
  ChannelKey,
  ContentDTO,
  ContentStatus,
  ContentType,
  Role,
  AuditEventDTO,
  AuditAction,
  AuditSeverity,
} from "@cmr/types";

// ----------------------------- Users -----------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  active: boolean;
  lastActive: string;
  initials: string;
  color: string;
}

export const users: User[] = [
  { id: "u1", name: "Aïssatou Diop", email: "a.diop@cmr.tv", role: "journalist", team: "Politique", active: true, lastActive: "2026-05-26T10:42:00", initials: "AD", color: "#22d3ee" },
  { id: "u2", name: "Mathieu Lefèvre", email: "m.lefevre@cmr.tv", role: "editor", team: "International", active: true, lastActive: "2026-05-26T10:55:00", initials: "ML", color: "#60a5fa" },
  { id: "u3", name: "Fatou Ndiaye", email: "f.ndiaye@cmr.tv", role: "chief", team: "Société", active: true, lastActive: "2026-05-26T11:01:00", initials: "FN", color: "#a78bfa" },
  { id: "u4", name: "Vincent Moreau", email: "v.moreau@cmr.tv", role: "direction", team: "Direction", active: true, lastActive: "2026-05-26T09:20:00", initials: "VM", color: "#f472b6" },
  { id: "u5", name: "Ndèye Faye", email: "n.faye@cmr.tv", role: "community_manager", team: "Réseaux", active: true, lastActive: "2026-05-26T10:30:00", initials: "NF", color: "#f59e0b" },
  { id: "u6", name: "Karim Benali", email: "k.benali@cmr.tv", role: "journalist", team: "Sport", active: true, lastActive: "2026-05-26T10:12:00", initials: "KB", color: "#10b981" },
  { id: "u7", name: "Claire Dubois", email: "c.dubois@cmr.tv", role: "editor", team: "Économie", active: true, lastActive: "2026-05-26T10:48:00", initials: "CD", color: "#38bdf8" },
  { id: "u8", name: "Omar Touré", email: "o.toure@cmr.tv", role: "journalist", team: "Culture", active: true, lastActive: "2026-05-26T09:58:00", initials: "OT", color: "#ec4899" },
  { id: "u9", name: "Sophie Martin", email: "s.martin@cmr.tv", role: "chief", team: "Politique", active: true, lastActive: "2026-05-26T10:35:00", initials: "SM", color: "#c084fc" },
  { id: "u10", name: "Ibrahim Sow", email: "i.sow@cmr.tv", role: "journalist", team: "Sport", active: false, lastActive: "2026-05-25T18:00:00", initials: "IS", color: "#22d3ee" },
  { id: "u11", name: "Élise Rousseau", email: "e.rousseau@cmr.tv", role: "admin", team: "Direction", active: true, lastActive: "2026-05-26T11:00:00", initials: "ER", color: "#10b981" },
  { id: "u12", name: "Tidiane Ba", email: "t.ba@cmr.tv", role: "community_manager", team: "Réseaux", active: true, lastActive: "2026-05-26T10:20:00", initials: "TB", color: "#f59e0b" },
];

export const usersById: Record<string, User> = Object.fromEntries(
  users.map((u) => [u.id, u]),
);

// ----------------------------- KPIs -----------------------------

export interface KpiMetric {
  key: string;
  label: string;
  value: number;
  delta: number;
  trend: "up" | "down";
  formatter: "compact" | "percent" | "number";
  sparkline: number[];
}

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
  { key: "contents", label: "Contenus publiés", value: 1248, delta: 12.5, trend: "up", formatter: "number", sparkline: spark(11) },
  { key: "audience", label: "Audience totale", value: 2_400_000, delta: 18.7, trend: "up", formatter: "compact", sparkline: spark(23) },
  { key: "video_views", label: "Vues vidéos", value: 5_700_000, delta: 23.1, trend: "up", formatter: "compact", sparkline: spark(37) },
  { key: "engagement", label: "Taux d'engagement", value: 4.8, delta: 8.3, trend: "up", formatter: "percent", sparkline: spark(53) },
];

// ----------------------------- Platform shares -----------------------------

export interface PlatformShare {
  channel: ChannelKey;
  share: number;
}

export const platformShares: PlatformShare[] = [
  { channel: "web", share: 28 },
  { channel: "youtube", share: 22 },
  { channel: "facebook", share: 14 },
  { channel: "mobile", share: 11 },
  { channel: "instagram", share: 9 },
  { channel: "tiktok", share: 6 },
  { channel: "twitter", share: 4 },
  { channel: "telegram", share: 3 },
  { channel: "smarttv", share: 3 },
];

// ----------------------------- Contents (abridged) -----------------------------

export const contents: ContentDTO[] = [
  {
    id: "c1",
    title: "Le journal de 20h du 26/05/2026",
    excerpt: "Synthèse des principales actualités économiques et politiques.",
    type: "video" as ContentType,
    status: "published" as ContentStatus,
    authorId: "u1",
    channels: ["web", "mobile", "youtube", "facebook"] as ChannelKey[],
    createdAt: "2026-05-26T19:30:00",
    updatedAt: "2026-05-26T20:05:00",
    views: 482_300,
    engagement: 6.1,
  },
  {
    id: "c2",
    title: "Interview — Ministre de la Culture",
    excerpt: "Entretien exclusif sur la politique culturelle 2026.",
    type: "video",
    status: "pending_chief",
    authorId: "u3",
    channels: ["web", "youtube", "instagram"],
    createdAt: "2026-05-26T10:00:00",
    updatedAt: "2026-05-26T10:35:00",
  },
  {
    id: "c3",
    title: "Reportage — Festival des musiques",
    excerpt: "Couverture complète de l'édition 2026 du festival national.",
    type: "video",
    status: "published",
    authorId: "u8",
    channels: ["web", "mobile", "instagram", "tiktok"],
    createdAt: "2026-05-26T09:00:00",
    updatedAt: "2026-05-26T10:30:00",
    views: 218_700,
    engagement: 8.4,
  },
  {
    id: "c4",
    title: "Flash Info — Élections régionales",
    excerpt: "Résultats provisoires des élections régionales en direct.",
    type: "article",
    status: "published",
    authorId: "u9",
    channels: ["web", "mobile", "telegram", "twitter"],
    createdAt: "2026-05-26T08:30:00",
    updatedAt: "2026-05-26T09:00:00",
    views: 312_400,
    engagement: 5.2,
  },
  {
    id: "c5",
    title: "Documentaire — Terres d'Afrique",
    excerpt: "Reportage long format programmé pour la prime time.",
    type: "video",
    status: "pending_direction",
    authorId: "u1",
    channels: ["smarttv", "web", "youtube"],
    createdAt: "2026-05-26T07:00:00",
    updatedAt: "2026-05-26T08:00:00",
    scheduledAt: "2026-05-26T20:00:00",
  },
];

// ----------------------------- System alerts -----------------------------

export type AlertSeverity = "info" | "warning" | "error" | "success";

export interface SystemAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  at: string;
}

export const systemAlerts: SystemAlert[] = [
  { id: "al1", severity: "warning", title: "Espace stockage vidéo", detail: "85% utilisé — pensez à archiver les rushes anciens du DAM.", at: "2026-05-26T10:50:00" },
  { id: "al2", severity: "warning", title: "3 workflows en retard", detail: "Trois contenus en attente de validation depuis plus de 2h.", at: "2026-05-26T10:40:00" },
  { id: "al3", severity: "error", title: "Échec de la vérification IA", detail: "Un contenu a échoué à la détection de doublons.", at: "2026-05-26T10:25:00" },
  { id: "al4", severity: "info", title: "Mise à jour planifiée", detail: "Maintenance dimanche 31 mai à 02:00, durée estimée 30 min.", at: "2026-05-26T09:15:00" },
];

// ----------------------------- Audit (abridged) -----------------------------

const baseAuditDate = new Date("2026-05-26T11:00:00");
const auditRows: Array<{
  hoursAgo: number;
  actorId: string;
  action: AuditAction;
  target: string;
  severity: AuditSeverity;
  status?: "success" | "failure";
}> = [
  { hoursAgo: 0.1, actorId: "u11", action: "settings_change", target: "Politique 2FA — durcie", severity: "warning" },
  { hoursAgo: 0.5, actorId: "u4", action: "publish", target: "Contenu c1 · Journal de 20h", severity: "info" },
  { hoursAgo: 0.8, actorId: "u3", action: "validate", target: "Contenu c2 · Interview Ministre", severity: "info" },
  { hoursAgo: 1.2, actorId: "u1", action: "update_content", target: "Contenu c2 — révision 2", severity: "info" },
  { hoursAgo: 2.1, actorId: "u11", action: "permission_change", target: "u10 — accès Diffusion révoqué", severity: "critical" },
  { hoursAgo: 3.0, actorId: "anonymous", action: "failed_login", target: "Tentative · admin@cmr.tv depuis IP étrangère", severity: "critical", status: "failure" },
  { hoursAgo: 4.5, actorId: "u11", action: "export_data", target: "Export Audit — 30 jours (CSV signé)", severity: "warning" },
  { hoursAgo: 6.0, actorId: "u9", action: "reject", target: "Brouillon c22 · Critique cinéma", severity: "warning" },
  { hoursAgo: 8.0, actorId: "u11", action: "invite_user", target: "j.thomas@cmr.tv — Journaliste Sport", severity: "info" },
  { hoursAgo: 11.0, actorId: "u3", action: "delete_content", target: "Contenu c14 · Sommet UA · brouillon", severity: "critical" },
];

export const auditEvents: AuditEventDTO[] = auditRows.map((r, i) => {
  const d = new Date(baseAuditDate);
  d.setMinutes(d.getMinutes() - Math.round(r.hoursAgo * 60));
  return {
    id: `audit-${String(i + 1).padStart(3, "0")}`,
    at: d.toISOString(),
    actorId: r.actorId,
    action: r.action,
    target: r.target,
    severity: r.severity,
    status: r.status ?? "success",
    ip: `10.${20 + (i % 50)}.${i % 255}.${(i * 7) % 255}`,
  };
});

// ----------------------------- Workflows -----------------------------

export interface WorkflowInstance {
  id: string;
  contentTitle: string;
  contentType: ContentType;
  currentStep: 1 | 2 | 3 | 4 | 5;
  author: { name: string; initials: string; color: string };
  pendingFor: string;
  channels: ChannelKey[];
  startedAt: string;
}

export const workflowInstances: WorkflowInstance[] = [
  { id: "w1", contentTitle: "Interview — Ministre de la Culture", contentType: "video", currentStep: 3, author: { name: "Aïssatou Diop", initials: "AD", color: "#22d3ee" }, pendingFor: "1h 12min", channels: ["web", "youtube", "instagram"], startedAt: "2026-05-26T09:20:00" },
  { id: "w2", contentTitle: "Reportage — Inondations dans le delta", contentType: "video", currentStep: 3, author: { name: "Karim Benali", initials: "KB", color: "#10b981" }, pendingFor: "2h 04min", channels: ["web", "mobile", "youtube"], startedAt: "2026-05-26T08:30:00" },
  { id: "w3", contentTitle: "Documentaire — Terres d'Afrique", contentType: "video", currentStep: 4, author: { name: "Aïssatou Diop", initials: "AD", color: "#22d3ee" }, pendingFor: "45min", channels: ["smarttv", "web", "youtube"], startedAt: "2026-05-26T07:45:00" },
];

// ----------------------------- Notifications -----------------------------

export interface Mention {
  id: string;
  actor: { name: string; initials: string; color: string };
  message: string;
  context: string;
  at: string;
  unread: boolean;
}

export const mentions: Mention[] = [
  { id: "n1", actor: { name: "Vincent Moreau", initials: "VM", color: "#f472b6" }, message: "vous a mentionné dans un commentaire", context: "« @vous merci de valider la tribune avant 18h. »", at: "2026-05-26T10:48:00", unread: true },
  { id: "n2", actor: { name: "Fatou Ndiaye", initials: "FN", color: "#a78bfa" }, message: "vous a assigné comme validateur", context: "Reportage — Inondations · étape Chef d'édition", at: "2026-05-26T10:21:00", unread: true },
  { id: "n3", actor: { name: "Ndèye Faye", initials: "NF", color: "#f59e0b" }, message: "a répondu à votre commentaire", context: "« Bien noté, je prépare la version verticale. »", at: "2026-05-26T09:42:00", unread: true },
  { id: "n4", actor: { name: "Aïssatou Diop", initials: "AD", color: "#22d3ee" }, message: "vous a partagé un brouillon", context: "Interview — Ministre de la Culture · révision 2", at: "2026-05-26T09:05:00", unread: false },
  { id: "n5", actor: { name: "Sophie Martin", initials: "SM", color: "#c084fc" }, message: "a demandé votre avis éditorial", context: "Politique — Tribune libre · sensibilité éditoriale", at: "2026-05-26T08:30:00", unread: false },
];
