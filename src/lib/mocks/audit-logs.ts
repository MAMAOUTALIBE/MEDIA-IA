import type { AuditEvent, AuditAction, AuditSeverity } from "@/types";

interface Row {
  hours: number;
  minutes?: number;
  actorId: string;
  action: AuditAction;
  target: string;
  severity: AuditSeverity;
  status?: "success" | "failure";
  ip?: string;
  metadata?: string;
}

const rows: Row[] = [
  { hours: 0, minutes: 4, actorId: "u11", action: "settings_change", target: "Politique 2FA — durcie", severity: "warning", metadata: "TOTP obligatoire pour tous les rôles éditoriaux" },
  { hours: 0, minutes: 22, actorId: "u4", action: "publish", target: "Contenu c1 · Journal de 20h", severity: "info" },
  { hours: 0, minutes: 38, actorId: "u3", action: "validate", target: "Contenu c2 · Interview Ministre Culture", severity: "info" },
  { hours: 0, minutes: 51, actorId: "u9", action: "reject", target: "Contenu c14 · Sommet UA — sources insuffisantes", severity: "warning", metadata: "Renvoyé au journaliste avec 3 commentaires" },
  { hours: 1, minutes: 12, actorId: "u1", action: "update_content", target: "Contenu c2 · Interview Ministre Culture", severity: "info" },
  { hours: 1, minutes: 32, actorId: "u5", action: "publish", target: "Contenu c9 · Backstage festival (TikTok+Instagram)", severity: "info" },
  { hours: 1, minutes: 47, actorId: "u8", action: "upload_media", target: "Asset m15 · Vernissage Dakar (image 9.1 Mo)", severity: "info" },
  { hours: 2, minutes: 5, actorId: "u11", action: "permission_change", target: "u10 (Ibrahim Sow) — accès Diffusion révoqué", severity: "critical", metadata: "Action liée à incident sécurité #INC-2026-058" },
  { hours: 2, minutes: 18, actorId: "u2", action: "create_content", target: "Brouillon · International — Sommet UA", severity: "info" },
  { hours: 2, minutes: 41, actorId: "u11", action: "invite_user", target: "j.thomas@cmr.tv — rôle Journaliste · équipe Sport", severity: "info" },
  { hours: 3, minutes: 2, actorId: "anonymous", action: "failed_login", target: "Tentative · admin@cmr.tv depuis IP étrangère", severity: "critical", status: "failure", ip: "185.220.101.45", metadata: "3 tentatives sur 5 min — IP placée en bloc temporaire" },
  { hours: 3, minutes: 25, actorId: "u1", action: "login", target: "Connexion depuis Mac · Safari · Dakar", severity: "info" },
  { hours: 3, minutes: 30, actorId: "u11", action: "enable_automation", target: "Règle ar3 · Transcription automatique vidéo", severity: "info" },
  { hours: 3, minutes: 58, actorId: "u4", action: "validate", target: "Contenu c5 · Documentaire — Terres d'Afrique", severity: "info" },
  { hours: 4, minutes: 11, actorId: "u7", action: "publish", target: "Contenu c12 · Podcast Cyber-sécurité (épisode 14)", severity: "info" },
  { hours: 4, minutes: 27, actorId: "u11", action: "settings_change", target: "Rotation des clés API · canal YouTube", severity: "warning" },
  { hours: 4, minutes: 44, actorId: "u3", action: "validate", target: "Contenu c8 · Conférence Premier Ministre", severity: "info" },
  { hours: 5, minutes: 1, actorId: "u2", action: "update_content", target: "Brouillon · International — Sommet UA (révision 2)", severity: "info" },
  { hours: 5, minutes: 19, actorId: "u11", action: "update_role", target: "u9 (Sophie Martin) — promue Chef d'édition Politique", severity: "warning" },
  { hours: 5, minutes: 33, actorId: "u6", action: "upload_media", target: "Asset m20 · Satellite national (vidéo 1.7 Go)", severity: "info" },
  { hours: 5, minutes: 52, actorId: "u8", action: "publish", target: "Contenu c3 · Reportage Festival des musiques", severity: "info" },
  { hours: 6, minutes: 10, actorId: "u11", action: "export_data", target: "Export Audit — 30 jours (CSV signé)", severity: "warning", metadata: "Export trace dans le coffre conformité" },
  { hours: 6, minutes: 28, actorId: "u9", action: "validate", target: "Contenu c17 · Société — Logement étudiant", severity: "info" },
  { hours: 6, minutes: 50, actorId: "u11", action: "disable_automation", target: "Règle ar5 · Cross-posting YouTube → Site", severity: "info" },
  { hours: 7, minutes: 5, actorId: "u3", action: "reject", target: "Brouillon c22 · Critique cinéma — angle non aligné", severity: "warning" },
  { hours: 7, minutes: 22, actorId: "anonymous", action: "failed_login", target: "Tentative · e.rousseau@cmr.tv (mot de passe incorrect)", severity: "warning", status: "failure", ip: "41.214.12.8" },
  { hours: 7, minutes: 41, actorId: "u11", action: "login", target: "Connexion depuis MacBook Pro · Safari · Dakar", severity: "info" },
  { hours: 8, minutes: 4, actorId: "u4", action: "publish", target: "Contenu c24 · Édito vidéo hebdomadaire", severity: "info" },
  { hours: 8, minutes: 27, actorId: "u11", action: "permission_change", target: "Groupe « Réseaux » — accès lecture étendu à Analytics", severity: "info" },
  { hours: 9, minutes: 0, actorId: "u2", action: "create_content", target: "Brouillon · International — Reportage zone conflit", severity: "warning", metadata: "Marqué « sensible » — escalade direction" },
  { hours: 9, minutes: 18, actorId: "u11", action: "settings_change", target: "Bus Kafka · topic content-validated · ajout consommateur", severity: "warning" },
  { hours: 9, minutes: 41, actorId: "u5", action: "publish", target: "Contenu c9 · Backstage festival (TikTok)", severity: "info" },
  { hours: 10, minutes: 12, actorId: "u11", action: "export_data", target: "Export Analytics 90j (PDF cosigné)", severity: "info" },
  { hours: 10, minutes: 30, actorId: "u8", action: "create_content", target: "Brouillon · Vernissage Dakar (format social)", severity: "info" },
  { hours: 11, minutes: 5, actorId: "u3", action: "delete_content", target: "Contenu c14 · Sommet UA · brouillon rejeté supprimé", severity: "critical", metadata: "Conservation 30 jours en archive avant purge" },
  { hours: 11, minutes: 28, actorId: "u11", action: "invite_user", target: "p.duval@cmr.tv — rôle Community Manager", severity: "info" },
  { hours: 11, minutes: 47, actorId: "u4", action: "settings_change", target: "Branding · charte couleurs · publication 2026.2", severity: "info" },
  { hours: 12, minutes: 9, actorId: "u11", action: "permission_change", target: "Rôle « Stagiaire » créé — accès lecture seule", severity: "info" },
  { hours: 12, minutes: 32, actorId: "u7", action: "update_content", target: "Contenu c18 · Marchés financiers (mise à jour graphiques)", severity: "info" },
  { hours: 13, minutes: 0, actorId: "u11", action: "logout", target: "Déconnexion manuelle · session 04h12", severity: "info" },
];

const baseDate = new Date("2026-05-26T11:00:00");

export const auditEvents: AuditEvent[] = rows.map((r, i) => {
  const d = new Date(baseDate);
  d.setMinutes(d.getMinutes() - (r.hours * 60 + (r.minutes ?? 0)));
  return {
    id: `audit-${String(i + 1).padStart(3, "0")}`,
    at: d.toISOString(),
    actorId: r.actorId,
    action: r.action,
    target: r.target,
    severity: r.severity,
    status: r.status ?? "success",
    ip: r.ip ?? `10.${20 + (i % 50)}.${i % 255}.${(i * 7) % 255}`,
    metadata: r.metadata,
  };
});
