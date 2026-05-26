"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { useSystemAlerts } from "@/lib/queries";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { AlertSeverity } from "@/types";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const meta: Record<AlertSeverity, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string; label: string }> = {
  info: { icon: Info, color: "text-info", bg: "bg-info-soft ring-info/20", label: "Info" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning-soft ring-warning/20", label: "Avertissement" },
  error: { icon: AlertCircle, color: "text-danger", bg: "bg-danger-soft ring-danger/20", label: "Erreur" },
  success: { icon: CheckCircle2, color: "text-success", bg: "bg-success-soft ring-success/20", label: "Succès" },
};

export function SystemAlertsPanel() {
  const { data } = useSystemAlerts();
  const alerts = data ?? [];
  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Alertes système</h3>
          <p className="text-xs text-text-secondary">Surveillance temps réel de l&apos;infrastructure</p>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
          {alerts.length} actives
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {alerts.map((a) => {
          const m = meta[a.severity];
          const Icon = m.icon;
          return (
            <div
              key={a.id}
              className={cn(
                "flex gap-3 rounded-xl p-3 ring-1",
                m.bg,
              )}
            >
              <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5", m.color)}>
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{a.detail}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">
                  {formatRelative(a.at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
