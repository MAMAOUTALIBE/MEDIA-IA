"use client";

import { useState } from "react";
import { useAutomations, useToggleAutomation } from "@/lib/queries";
import { API_ENABLED } from "@/lib/api-client";
import { GlassCard } from "@/components/ui/glass-card";
import { Switch } from "@/components/ui/switch";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Bell, Calendar, Globe, Link2, Video, Zap, Plus } from "lucide-react";
import type { AutomationRule } from "@/types";
import { formatRelative, formatNumber } from "@/lib/format";
import { toast } from "sonner";

const icons = {
  zap: Zap,
  bell: Bell,
  calendar: Calendar,
  link: Link2,
  video: Video,
  globe: Globe,
};

export default function AutomatisationsPage() {
  return (
    <PermissionGate permission="view.automations">
      <AutomatisationsContent />
    </PermissionGate>
  );
}

function AutomatisationsContent() {
  const { data, error, isError, refetch } = useAutomations();
  const toggleAutomation = useToggleAutomation();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  function isActive(rule: AutomationRule) {
    return overrides[rule.id] ?? rule.active;
  }

  function handleToggle(rule: AutomationRule, active: boolean) {
    setOverrides((prev) => ({ ...prev, [rule.id]: active }));
    if (!API_ENABLED) return;
    toggleAutomation.mutate(
      { id: rule.id, active },
      {
        onSuccess: () => {
          toast.success(active ? "Automatisation activée" : "Automatisation désactivée", {
            description: rule.name,
          });
        },
        onError: (err) => {
          setOverrides((prev) => ({ ...prev, [rule.id]: rule.active }));
          toast.error("Impossible de modifier la règle", {
            description: err instanceof Error ? err.message.slice(0, 120) : rule.name,
          });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Automatisations</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Règles n8n connectées au pipeline éditorial et au DAM.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95"
        >
          <Plus size={16} />
          Créer une règle
        </button>
      </div>

      {isError ? (
        <GlassCard>
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        </GlassCard>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((rule) => {
          const Icon = icons[rule.icon] ?? Zap;
          const active = isActive(rule);
          return (
            <GlassCard key={rule.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue/15 to-accent-violet/15 text-accent-violet ring-1 ring-white/10"
                  aria-hidden
                >
                  <Icon size={18} />
                </span>
                <Switch
                  checked={active}
                  disabled={toggleAutomation.isPending && toggleAutomation.variables?.id === rule.id}
                  onCheckedChange={(v) => handleToggle(rule, v)}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{rule.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{rule.description}</p>
              </div>
              <div className="space-y-1 rounded-xl bg-white/[0.025] p-3 text-[11px] ring-1 ring-white/[0.06]">
                <p className="text-text-muted">
                  <span className="font-semibold text-text-secondary">Déclencheur :</span> {rule.trigger}
                </p>
                <p className="text-text-muted">
                  <span className="font-semibold text-text-secondary">Action :</span> {rule.action}
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between text-[11px]">
                <span className="text-text-muted">
                  {formatNumber(rule.runs)} déclenchements
                </span>
                <span className="text-text-muted">
                  {active ? `Actif · dernier ${formatRelative(rule.lastRun)}` : "Désactivé"}
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      )}
    </div>
  );
}
