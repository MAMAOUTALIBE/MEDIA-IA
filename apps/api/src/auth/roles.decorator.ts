import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "auth:roles";
export const EXACT_ROLES_KEY = "auth:exact-roles";

export type AppRole =
  | "journalist"
  | "editor"
  | "chief"
  | "direction"
  | "community_manager"
  | "admin"
  // Sprint 9 — non-human caller (n8n, scheduled jobs). Always grant access via
  // @ExactRoles to keep its scope explicit; @Roles uses rank promotion which
  // could accidentally let a service token reach admin endpoints.
  | "service_automation";

/**
 * Restreint un endpoint à une liste de rôles.
 * Exemple : `@Roles("admin")` ou `@Roles("chief", "direction")`.
 * Hiérarchie respectée par RolesGuard via `RANK`.
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Restreint un endpoint à une liste exacte de rôles, sans promotion hiérarchique.
 * Utile pour les capacités métier transverses comme community_manager + admin.
 */
export const ExactRoles = (...roles: AppRole[]) => SetMetadata(EXACT_ROLES_KEY, roles);

// Hiérarchie : un rôle de rang ≥ requis suffit.
// service_automation has rank 0 on purpose — it never satisfies @Roles, only
// @ExactRoles. This is the safest default for a non-human credential.
export const RANK: Record<AppRole, number> = {
  service_automation: 0,
  journalist: 1,
  community_manager: 1,
  editor: 2,
  chief: 3,
  direction: 4,
  admin: 5,
};
