"use client";

import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { useWorkflows, useAdvanceWorkflow } from "@/lib/queries";
import { API_ENABLED } from "@/lib/api-client";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { WORKFLOW_STEPS } from "@/lib/constants";
import { ArrowRight, GitMerge, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { CardListSkeleton } from "@/components/ui/loading-skeletons";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { PermissionGate } from "@/components/auth/permission-gate";
import { toast } from "sonner";

const stepColors = ["#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#10b981"];

export default function WorkflowsPage() {
  return (
    <PermissionGate permission="view.workflows">
      <WorkflowsContent />
    </PermissionGate>
  );
}

function WorkflowsContent() {
  const { data, error, isError, isLoading, refetch } = useWorkflows();
  const advance = useAdvanceWorkflow();
  const instances = data?.instances ?? [];
  const counts = data?.counts ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  function handleAdvance(wfId: string, title: string) {
    if (!API_ENABLED) {
      toast.error("API désactivée — impossible de faire avancer en mode mock pur");
      return;
    }
    advance.mutate(
      { id: wfId, comment: "Validation via UI", decision: "approve" },
      {
        onSuccess: (r: { fromStep?: string; toStep?: string }) => {
          toast.success(`« ${title} » avance ${r?.fromStep ?? "—"} → ${r?.toStep ?? "—"}`, {
            description: "Broadcast WebSocket envoyé · Signature SHA-256 archivée",
          });
        },
        onError: (err) => {
          toast.error("Échec validation", {
            description: err instanceof Error ? err.message.slice(0, 100) : "?",
          });
        },
      },
    );
  }

  function handleReject(wfId: string, title: string) {
    if (!API_ENABLED) {
      toast.error("API désactivée — impossible de rejeter en mode mock pur");
      return;
    }
    const reason = window.prompt(
      `Raison du rejet pour « ${title} » ?\n\nLe journaliste sera notifié.`,
      "À retravailler",
    );
    if (!reason) return;
    advance.mutate(
      { id: wfId, comment: reason, decision: "reject" },
      {
        onSuccess: () => {
          toast.error(`« ${title} » rejeté`, {
            description: `Raison : ${reason}`,
          });
        },
        onError: (err) => {
          toast.error("Échec rejet", {
            description: err instanceof Error ? err.message.slice(0, 100) : "?",
          });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Workflows éditoriaux</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pipeline de validation à 4 niveaux orchestré par Camunda BPMN.
        </p>
      </div>

      <GlassCard className="p-6">
        <p className="mb-5 text-xs uppercase tracking-wider text-text-muted">
          Pipeline de validation
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-1">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step.key} className="flex flex-1 items-center gap-3">
              <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center">
                <span
                  className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${stepColors[i]}, ${stepColors[i]}aa)` }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                  <p className="text-[11px] text-text-secondary">{step.description}</p>
                </div>
                <span className="mx-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                  {counts[(i + 1) as 1 | 2 | 3 | 4 | 5] ?? 0} en cours
                </span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <ArrowRight size={20} className="hidden shrink-0 text-text-muted md:block" />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <GlassCardHeader
          title="Instances en cours"
          description={`${instances.length} workflow${instances.length > 1 ? "s" : ""} actif${instances.length > 1 ? "s" : ""}`}
        />
        {isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="p-5">
            <CardListSkeleton rows={5} />
          </div>
        ) : instances.length === 0 ? (
          <EmptyState
            icon={GitMerge}
            title="Aucun workflow en cours"
            description="Tous les contenus actuellement en validation seront listés ici en temps réel."
          />
        ) : (
        <ul className="divide-y divide-white/[0.05]">
          {instances.map((wf) => (
            <li key={wf.id} className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <div className="flex items-center gap-3">
                <InitialsAvatar initials={wf.author.initials} color={wf.author.color} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{wf.contentTitle}</p>
                  <p className="text-[11px] text-text-secondary">
                    par {wf.author.name} · en attente depuis {wf.pendingFor}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={cn(
                      "h-1.5 w-10 rounded-full transition-colors",
                      step < wf.currentStep
                        ? "bg-gradient-to-r from-accent-blue to-accent-violet"
                        : step === wf.currentStep
                          ? "bg-accent-violet/80 animate-pulse"
                          : "bg-white/[0.06]",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {wf.channels.map((ch) => (
                    <ChannelIcon key={ch} channel={ch} size={14} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleReject(wf.id, wf.contentTitle)}
                  disabled={advance.isPending || wf.currentStep >= 5}
                  className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-40"
                  title="Rejeter cette instance"
                >
                  Rejeter
                </button>
                <button
                  type="button"
                  onClick={() => handleAdvance(wf.id, wf.contentTitle)}
                  disabled={advance.isPending || wf.currentStep >= 5}
                  className="inline-flex items-center gap-1 rounded-lg border border-accent-violet/30 bg-accent-violet/10 px-2.5 py-1 text-[11px] font-semibold text-accent-violet transition hover:bg-accent-violet/20 disabled:opacity-40"
                  title="Valider et avancer cette instance"
                >
                  {advance.isPending && advance.variables?.id === wf.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <ChevronRight size={11} />
                  )}
                  Valider
                </button>
              </div>
            </li>
          ))}
        </ul>
        )}
      </GlassCard>
    </div>
  );
}
