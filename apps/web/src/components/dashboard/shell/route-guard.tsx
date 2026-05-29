"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { canAccessRoute } from "@/lib/rbac";
import { useEffectiveRole } from "@/lib/use-rbac";
import type { ReactNode } from "react";

/**
 * Garde RBAC client-side : si le rôle effectif n'a pas la permission requise
 * pour la route courante (cf. ROUTE_PERMISSIONS dans lib/rbac.ts), on rend un
 * carton "Accès refusé" plutôt que la page.
 *
 * Note : c'est une couche d'UX (le backend reste l'autorité). Un user qui
 * trafique son JWT côté navigateur ne pourra pas appeler les endpoints, mais
 * verra peut-être brièvement une page. Le guard évite ça sans alourdir le
 * layout.
 */
export function DashboardRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const role = useEffectiveRole();
  if (canAccessRoute(role, pathname)) {
    return <>{children}</>;
  }
  return (
    <div className="mx-auto max-w-md py-16">
      <GlassCard className="p-8 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-danger/15 to-warning/10 text-danger ring-1 ring-white/[0.08]">
          <ShieldAlert size={22} />
        </span>
        <p className="mt-4 text-base font-semibold text-text-primary">Accès refusé</p>
        <p className="mt-1 text-xs text-text-secondary">
          Votre rôle <code className="font-mono text-text-primary">{role}</code> n&apos;a
          pas accès à cette section. Contactez votre administrateur si vous pensez
          qu&apos;il s&apos;agit d&apos;une erreur.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-text-primary transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={12} />
          Retour au tableau de bord
        </Link>
      </GlassCard>
    </div>
  );
}
