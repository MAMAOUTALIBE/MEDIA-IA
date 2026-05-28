"use client";

import { currentUser as mockUser } from "@/lib/mocks/users";
import { can, isRole, type Permission } from "@/lib/rbac";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Role } from "@/types";

export function useEffectiveRole(): Role {
  const authRole = useAuthStore((s) => s.user?.role);
  return isRole(authRole) ? authRole : mockUser.role;
}

export function useCan(permission: Permission): boolean {
  const role = useEffectiveRole();
  return can(role, permission);
}
