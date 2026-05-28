"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/lib/api-client";

function describeError(error: unknown): { description: string; requestId: string | null } {
  if (error instanceof ApiError) {
    return {
      description: error.displayMessage.slice(0, 220),
      requestId: error.requestId,
    };
  }
  if (error instanceof Error) {
    return { description: error.message.slice(0, 220), requestId: null };
  }
  return { description: "La source API n'a pas pu être chargée.", requestId: null };
}

export function ApiErrorState({
  error,
  onRetry,
  title = "Données API indisponibles",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const { description, requestId } = describeError(error);
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={
        <span className="space-y-1.5">
          <span className="block">{description}</span>
          {requestId ? (
            <span className="block font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
              request-id : {requestId}
            </span>
          ) : null}
        </span>
      }
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            aria-label="Réessayer le chargement des données"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
          >
            <RefreshCw size={12} />
            Réessayer
          </button>
        ) : undefined
      }
    />
  );
}
