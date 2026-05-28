"use client";

import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { can, type Permission } from "@/lib/rbac";
import { useEffectiveRole } from "@/lib/use-rbac";

export function PermissionGate({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const role = useEffectiveRole();
  if (can(role, permission)) return children;

  return (
    <GlassCard>
      <EmptyState
        icon={LockKeyhole}
        title="Accès refusé"
        description="Votre rôle ne permet pas d'accéder à cette zone du dashboard."
      />
    </GlassCard>
  );
}
