/**
 * @cmr/types — Source of truth for shared TypeScript types across the monorepo.
 *
 * Status: scaffold ready. Currently, types live in `apps/web/src/types/index.ts`
 * because the front was built first. The consolidation plan:
 *
 * 1. Move all types from `apps/web/src/types/index.ts` here.
 * 2. Update `apps/web` imports `@/types` → `@cmr/types`.
 * 3. When NestJS API is wired with Prisma, types here align with Prisma-generated
 *    types via a thin DTO layer.
 *
 * For now, this file mirrors the current frontend types so the package is usable
 * by the API and future workers without duplicating definitions.
 */

export type ChannelKey =
  | "web"
  | "mobile"
  | "youtube"
  | "facebook"
  | "instagram"
  | "twitter"
  | "tiktok"
  | "telegram"
  | "smarttv";

export type Role =
  | "journalist"
  | "editor"
  | "chief"
  | "direction"
  | "community_manager"
  | "admin";

export type ContentStatus =
  | "draft"
  | "pending_editor"
  | "pending_chief"
  | "pending_direction"
  | "published"
  | "rejected";

export type ContentType = "article" | "video" | "audio" | "social";

export type AICheckType =
  | "spelling"
  | "plagiarism"
  | "sensitive"
  | "copyright"
  | "media_quality"
  | "seo"
  | "fake_news";

export type AlertSeverity = "info" | "warning" | "error" | "success";
export type MediaType = "image" | "video" | "audio" | "document";

export type AuditAction =
  | "login"
  | "failed_login"
  | "logout"
  | "publish"
  | "validate"
  | "reject"
  | "create_content"
  | "update_content"
  | "delete_content"
  | "upload_media"
  | "invite_user"
  | "update_role"
  | "enable_automation"
  | "disable_automation"
  | "export_data"
  | "settings_change"
  | "permission_change"
  // Sprint 9 — n8n + GDPR
  | "automation_run"
  | "gdpr_delete_request"
  | "gdpr_delete_executed"
  | "service_token_issued";

export type AuditSeverity = "info" | "warning" | "critical";

export interface UserDTO {
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

export interface ContentDTO {
  id: string;
  title: string;
  excerpt: string;
  type: ContentType;
  status: ContentStatus;
  authorId: string;
  channels: ChannelKey[];
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  thumbnail?: string;
  views?: number;
  engagement?: number;
}

export interface AuditEventDTO {
  id: string;
  at: string;
  actorId: string;
  action: AuditAction;
  target: string;
  severity: AuditSeverity;
  ip: string;
  status: "success" | "failure";
  metadata?: string;
}
