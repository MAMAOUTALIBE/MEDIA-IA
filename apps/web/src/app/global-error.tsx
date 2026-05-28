"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Last-resort boundary for errors that escape the root layout (e.g. during
 * provider initialization). Renders its own <html>/<body> because the root
 * layout did not get a chance to mount.
 */
export default function GlobalError({
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
    <html lang="fr" className="dark h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-[#07080f] text-white">
        <main
          role="alert"
          aria-live="assertive"
          aria-label="Erreur critique de l'application"
          className="mx-auto max-w-md px-6 py-16 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">
            Erreur critique
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Quelque chose s&apos;est cassé</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            L&apos;application a rencontré une erreur inattendue. L&apos;équipe technique a été
            notifiée automatiquement.
          </p>
          {error.digest ? (
            <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-white/40">
              digest : {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.05] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080f]"
          >
            Recharger l&apos;application
          </button>
        </main>
      </body>
    </html>
  );
}
