"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

function AuthSessionBootstrapper() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return null;
}

function reportError(error: unknown, context: "query" | "mutation") {
  if (error instanceof ApiError) {
    // 401/403 are expected flow states (login redirect, RBAC) — don't pollute Sentry.
    if (error.status === 401 || error.status === 403) return;
    Sentry.captureException(error, {
      tags: {
        source: "api-client",
        rq_kind: context,
        status: String(error.status),
      },
      extra: {
        requestId: error.requestId,
        problem: error.problem,
      },
    });
    return;
  }
  if (error instanceof Error && error.name !== "AbortError") {
    Sentry.captureException(error, { tags: { rq_kind: context } });
  }
}

function smartRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
      return false; // do not retry validation/RBAC/not-found
    }
  }
  return failureCount < 2;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => reportError(error, "query"),
        }),
        mutationCache: new MutationCache({
          onError: (error) => reportError(error, "mutation"),
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: smartRetry,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionBootstrapper />
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
