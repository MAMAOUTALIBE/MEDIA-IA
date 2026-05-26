import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "auth:roles";

export type AppRole =
  | "journalist"
  | "editor"
  | "chief"
  | "direction"
  | "community_manager"
  | "admin";

/**
 * Restreint un endpoint à une liste de rôles.
 * Exemple : `@Roles("admin")` ou `@Roles("chief", "direction")`.
 * Hiérarchie respectée par RolesGuard via `RANK`.
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

// Hiérarchie : un rôle de rang ≥ requis suffit
export const RANK: Record<AppRole, number> = {
  journalist: 1,
  community_manager: 1,
  editor: 2,
  chief: 3,
  direction: 4,
  admin: 5,
};
