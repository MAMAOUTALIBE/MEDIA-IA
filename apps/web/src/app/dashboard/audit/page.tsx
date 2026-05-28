"use client";

import { useMemo, useState } from "react";
import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { PermissionGate } from "@/components/auth/permission-gate";
import { CardListSkeleton } from "@/components/ui/loading-skeletons";
import { useAuditEvents } from "@/lib/queries";
import { usersById } from "@/lib/mocks/users";
import { formatRelative, formatHour } from "@/lib/format";
import type { AuditAction, AuditSeverity } from "@/types";
import {
  ShieldCheck,
  LogIn,
  LogOut,
  XOctagon,
  Send,
  Check,
  X as XIcon,
  FileEdit,
  Plus,
  Trash2,
  Upload,
  UserPlus,
  UserCog,
  Zap,
  ZapOff,
  Download,
  Settings as SettingsIcon,
  KeyRound,
  Search,
  ScrollText,
  Server,
  Workflow,
  UserX,
  Trash,
  Key,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const actionMeta: Record<AuditAction, { icon: React.ComponentType<{ size?: number }>; label: string }> = {
  login: { icon: LogIn, label: "Connexion" },
  failed_login: { icon: XOctagon, label: "Échec de connexion" },
  logout: { icon: LogOut, label: "Déconnexion" },
  publish: { icon: Send, label: "Publication" },
  validate: { icon: Check, label: "Validation" },
  reject: { icon: XIcon, label: "Rejet" },
  create_content: { icon: Plus, label: "Création contenu" },
  update_content: { icon: FileEdit, label: "Mise à jour contenu" },
  delete_content: { icon: Trash2, label: "Suppression contenu" },
  upload_media: { icon: Upload, label: "Upload média" },
  invite_user: { icon: UserPlus, label: "Invitation utilisateur" },
  update_role: { icon: UserCog, label: "Modification de rôle" },
  enable_automation: { icon: Zap, label: "Automatisation activée" },
  disable_automation: { icon: ZapOff, label: "Automatisation désactivée" },
  export_data: { icon: Download, label: "Export de données" },
  settings_change: { icon: SettingsIcon, label: "Paramètres" },
  permission_change: { icon: KeyRound, label: "Permissions" },
  // Sprint 9 — n8n + GDPR
  automation_run: { icon: Workflow, label: "Exécution automation" },
  gdpr_delete_request: { icon: UserX, label: "Demande RGPD" },
  gdpr_delete_executed: { icon: Trash, label: "Suppression RGPD exécutée" },
  service_token_issued: { icon: Key, label: "Token de service émis" },
};

// Defensive default for any future audit action the API might emit before the
// front-end ships an entry above. Prevents a crash that would take the whole
// audit page down.
const fallbackMeta = { icon: Activity, label: "Action" };
function metaFor(action: AuditAction) {
  return actionMeta[action] ?? fallbackMeta;
}

const severityClass: Record<AuditSeverity, { color: string; bg: string; ring: string }> = {
  info: { color: "text-info", bg: "bg-info-soft", ring: "ring-info/20" },
  warning: { color: "text-warning", bg: "bg-warning-soft", ring: "ring-warning/30" },
  critical: { color: "text-danger", bg: "bg-danger-soft", ring: "ring-danger/30" },
};

type SeverityFilter = "all" | AuditSeverity;

export default function AuditPage() {
  return (
    <PermissionGate permission="view.audit">
      <AuditContent />
    </PermissionGate>
  );
}

function AuditContent() {
  const { data, error, isError, isLoading, refetch } = useAuditEvents();
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return (data ?? [])
      .filter((e) => (filter === "all" ? true : e.severity === filter))
      .filter((e) =>
        search
          ? `${e.target} ${metaFor(e.action).label}`.toLowerCase().includes(search.toLowerCase())
          : true,
      );
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      info: list.filter((e) => e.severity === "info").length,
      warning: list.filter((e) => e.severity === "warning").length,
      critical: list.filter((e) => e.severity === "critical").length,
      failures: list.filter((e) => e.status === "failure").length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Audit &amp; Conformité
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Journal d&apos;audit complet — actions utilisateurs, accès, modifications éditoriales et événements de sécurité.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiTile label="Événements (24h)" value={counts.total} color="#a78bfa" icon={ScrollText} />
        <KpiTile label="Information" value={counts.info} color="#38bdf8" icon={ShieldCheck} />
        <KpiTile label="Avertissements" value={counts.warning} color="#f59e0b" icon={ShieldCheck} />
        <KpiTile label="Critiques" value={counts.critical} color="#ef4444" icon={ShieldCheck} />
        <KpiTile label="Échecs auth" value={counts.failures} color="#ef4444" icon={XOctagon} />
      </div>

      <GlassCard className="overflow-hidden">
        <GlassCardHeader
          title="Journal d'événements"
          description="Conservation 365 jours · cosignature SHA-256 · export immuable disponible"
          action={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/[0.06]"
            >
              <Download size={12} />
              Exporter CSV
            </button>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as SeverityFilter)}>
            <TabsList className="h-9 border border-white/[0.06] bg-white/[0.03] p-0.5">
              <TabsTrigger value="all" className="h-8 px-3 text-xs">Tous ({counts.total})</TabsTrigger>
              <TabsTrigger value="info" className="h-8 px-3 text-xs">Info ({counts.info})</TabsTrigger>
              <TabsTrigger value="warning" className="h-8 px-3 text-xs">Avertissement ({counts.warning})</TabsTrigger>
              <TabsTrigger value="critical" className="h-8 px-3 text-xs">Critique ({counts.critical})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans la cible ou l'action…"
              className="h-9 w-72 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
            />
          </div>
        </div>

        {isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="p-5">
            <CardListSkeleton rows={8} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Aucun événement ne correspond"
            description="Modifiez votre recherche ou changez le filtre de sévérité."
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
        ) : (
          <ul className="relative divide-y divide-white/[0.05]">
            {rows.map((e) => {
              const actor = usersById[e.actorId];
              const meta = metaFor(e.action);
              const Icon = meta.icon;
              const sev = severityClass[e.severity];
              return (
                <li
                  key={e.id}
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-3.5"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
                      sev.bg,
                      sev.color,
                      sev.ring,
                    )}
                  >
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{meta.label}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          sev.bg,
                          sev.color,
                        )}
                      >
                        {e.severity === "info" ? "Info" : e.severity === "warning" ? "Avertissement" : "Critique"}
                      </span>
                      {e.status === "failure" && (
                        <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-danger ring-1 ring-danger/30">
                          Échec
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-primary">{e.target}</p>
                    {e.metadata && (
                      <p className="mt-1 text-[11px] text-text-secondary">{e.metadata}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        {actor ? (
                          <>
                            <InitialsAvatar
                              initials={actor.initials}
                              color={actor.color}
                              size={16}
                            />
                            <span>{actor.name}</span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Server size={11} className="text-text-muted" />
                            Anonyme / non authentifié
                          </span>
                        )}
                      </span>
                      <span>·</span>
                      <span className="font-mono">{e.ip}</span>
                      <span>·</span>
                      <span>{formatRelative(e.at)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 self-start text-[11px] font-mono tabular-nums text-text-muted">
                    {formatHour(e.at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

function KpiTile({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <GlassCard className="flex items-center gap-3 p-4">
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-card"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
      >
        <Icon size={16} />
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
        <p className="text-2xl font-bold text-text-primary tabular-nums">{value}</p>
      </div>
    </GlassCard>
  );
}
