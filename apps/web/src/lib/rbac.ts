import type { PendingContent, Role } from "@/types";

export type Permission =
  | "view.dashboard"
  | "view.contents"
  | "view.media"
  | "view.live"
  | "view.calendar"
  | "view.workflows"
  | "view.automations"
  | "view.diffusion"
  | "view.analytics"
  | "view.users"
  | "view.audit"
  | "view.settings"
  | "content.create"
  | "content.validate.editor"
  | "content.validate.chief"
  | "content.validate.direction"
  | "media.upload"
  | "workflow.advance"
  | "automation.manage"
  | "user.invite"
  | "audit.export";

const allRoles = [
  "journalist",
  "editor",
  "chief",
  "direction",
  "community_manager",
  "admin",
] as const satisfies readonly Role[];

const editorialDesk = ["editor", "chief", "direction", "admin"] as const satisfies readonly Role[];
const seniorEditorial = ["chief", "direction", "admin"] as const satisfies readonly Role[];
const digitalDesk = [
  "editor",
  "chief",
  "direction",
  "community_manager",
  "admin",
] as const satisfies readonly Role[];

export const PERMISSION_ROLES = {
  "view.dashboard": allRoles,
  "view.contents": allRoles,
  "view.media": allRoles,
  "view.live": allRoles,
  "view.calendar": allRoles,
  "view.workflows": editorialDesk,
  "view.automations": ["admin"],
  "view.diffusion": digitalDesk,
  "view.analytics": ["chief", "direction", "community_manager", "admin"],
  "view.users": ["admin"],
  "view.audit": ["admin"],
  "view.settings": allRoles,
  "content.create": allRoles,
  "content.validate.editor": editorialDesk,
  "content.validate.chief": seniorEditorial,
  "content.validate.direction": ["direction", "admin"],
  "media.upload": digitalDesk,
  "workflow.advance": editorialDesk,
  "automation.manage": ["admin"],
  "user.invite": ["admin"],
  "audit.export": ["admin"],
} as const satisfies Record<Permission, readonly Role[]>;

export const ROUTE_PERMISSIONS = {
  "/dashboard": "view.dashboard",
  "/dashboard/contenus": "view.contents",
  "/dashboard/medias": "view.media",
  "/dashboard/live": "view.live",
  "/dashboard/calendrier": "view.calendar",
  "/dashboard/workflows": "view.workflows",
  "/dashboard/automatisations": "view.automations",
  "/dashboard/diffusion": "view.diffusion",
  "/dashboard/analytics": "view.analytics",
  "/dashboard/utilisateurs": "view.users",
  "/dashboard/audit": "view.audit",
  "/dashboard/parametres": "view.settings",
} as const satisfies Record<string, Permission>;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && allRoles.includes(value as Role);
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSION_ROLES[permission] as readonly Role[]).includes(role);
}

export function permissionForRoute(pathname: string): Permission | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const match = Object.entries(ROUTE_PERMISSIONS)
    .sort(([a], [b]) => b.length - a.length)
    .find(([route]) => normalized === route || normalized.startsWith(`${route}/`));
  return match?.[1] ?? null;
}

export function canAccessRoute(role: Role | null | undefined, pathname: string): boolean {
  const permission = permissionForRoute(pathname);
  return permission ? can(role, permission) : true;
}

export function permissionForPendingStep(step: PendingContent["step"]): Permission {
  return `content.validate.${step}` as Permission;
}

export function canValidatePending(role: Role | null | undefined, pending: Pick<PendingContent, "step">) {
  return can(role, permissionForPendingStep(pending.step));
}
