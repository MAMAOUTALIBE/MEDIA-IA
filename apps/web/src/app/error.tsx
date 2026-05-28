"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { GlassCard } from "@/components/ui/glass-card";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main
      id="main-content"
      role="alert"
      className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-6 py-16 text-center"
    >
      <GlassCard className="w-full px-8 py-10">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/15 via-rose-500/10 to-transparent text-amber-300 ring-1 ring-white/[0.08]">
          <AlertTriangle size={22} aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-text-primary">
          Cette section n&apos;a pas pu être chargée
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {error.message || "Une erreur inattendue s'est produite. Réessayez dans un instant."}
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
            digest : {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
        >
          <RefreshCw size={14} aria-hidden />
          Réessayer
        </button>
      </GlassCard>
    </main>
  );
}
