"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { useUsers } from "@/lib/queries";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { ROLES } from "@/lib/constants";
import type { Role } from "@/types";
import { Plus, Search, MoreHorizontal, UserX2 } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { PermissionGate } from "@/components/auth/permission-gate";
import { TableSkeleton } from "@/components/ui/loading-skeletons";

type Filter = "all" | Role;

export default function UtilisateursPage() {
  return (
    <PermissionGate permission="view.users">
      <UtilisateursContent />
    </PermissionGate>
  );
}

function UtilisateursContent() {
  const { data, error, isError, isLoading, refetch } = useUsers();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const rows = (data ?? [])
    .filter((u) => (filter === "all" ? true : u.role === filter))
    .filter((u) =>
      search
        ? `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
        : true,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Utilisateurs</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Gestion des accès, rôles et équipes éditoriales.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95"
        >
          <Plus size={16} />
          Inviter
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-9 border border-white/[0.06] bg-white/[0.03] p-0.5">
            <TabsTrigger value="all" className="h-8 px-3 text-xs">Tous</TabsTrigger>
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <TabsTrigger key={r} value={r} className="h-8 px-3 text-xs">
                {ROLES[r].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur…"
            className="h-9 w-64 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
          />
        </div>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Équipe</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Dernière activité</th>
                <th className="px-4 py-3 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {rows.map((u) => (
                <tr key={u.id} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar initials={u.initials} color={u.color} size={32} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">{u.name}</p>
                        <p className="text-xs text-text-secondary">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: ROLES[u.role].color,
                        background: `${ROLES[u.role].color}1f`,
                      }}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: ROLES[u.role].color }} />
                      {ROLES[u.role].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{u.team}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        u.active ? "bg-success-soft text-success" : "bg-white/5 text-text-muted"
                      }`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${u.active ? "bg-success" : "bg-text-muted"}`} />
                      {u.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{formatRelative(u.lastActive)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
                      aria-label="Actions"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isError && <ApiErrorState error={error} onRetry={() => void refetch()} />}
          {!isError && !isLoading && rows.length === 0 && (
            <EmptyState
              icon={UserX2}
              title="Aucun utilisateur ne correspond"
              description="Modifiez le rôle filtré ou ajustez votre recherche pour voir d'autres membres."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/[0.06]"
                >
                  Réinitialiser
                </button>
              }
            />
          )}
          {!isError && isLoading && (
            <div className="p-4">
              <TableSkeleton rows={8} columns={5} />
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
