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

export type ActivityType =
  | "publication"
  | "validation"
  | "comment"
  | "automation"
  | "alert";

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

export interface Content {
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

export interface KpiMetric {
  key: string;
  label: string;
  value: number;
  delta: number;
  trend: "up" | "down";
  formatter: "compact" | "percent" | "number";
  sparkline: number[];
}

export interface TimeSeriesPoint {
  date: string;
  views: number;
  users: number;
}

export interface PlatformShare {
  channel: ChannelKey;
  share: number;
}

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  actor: { name: string; initials: string; color: string };
  message: string;
  at: string;
}

export interface SystemAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  at: string;
}

export interface AICheckResult {
  type: AICheckType;
  status: "passed" | "warning" | "failed";
  score: number;
  message?: string;
}

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

export interface MediaAsset {
  id: string;
  title: string;
  type: MediaType;
  url: string;
  thumbnail: string;
  duration?: number;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  tags: string[];
}

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

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  channel: ChannelKey;
  contentType: ContentType;
}

export interface DiffusionStatus {
  contentId: string;
  contentTitle: string;
  byChannel: Partial<Record<ChannelKey, "published" | "scheduled" | "failed" | "na">>;
}

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
  | "permission_change";

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditEvent {
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
