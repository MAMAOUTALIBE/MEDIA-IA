"use client";

import { toast } from "sonner";
import { ApiError } from "./api-client";

/**
 * Show a user-friendly toast for an API error.
 * - Uses RFC 7807 `detail`/`title` when available.
 * - Surfaces the X-Request-Id as a copy-paste fragment for support.
 * - Falls back to the error message for non-API errors.
 */
export function toastApiError(
  error: unknown,
  fallback = "Une erreur inattendue est survenue",
): void {
  if (error instanceof ApiError) {
    toast.error(error.displayMessage || fallback, {
      description: buildDescription(error),
    });
    return;
  }
  if (error instanceof Error) {
    toast.error(fallback, { description: error.message.slice(0, 220) });
    return;
  }
  toast.error(fallback);
}

function buildDescription(error: ApiError): string | undefined {
  const parts: string[] = [];
  if (error.problem?.errors) {
    const issues = Object.values(error.problem.errors).flat().slice(0, 3);
    if (issues.length) parts.push(issues.join(" · "));
  }
  if (error.requestId) parts.push(`req: ${error.requestId.slice(0, 8)}…`);
  return parts.join(" — ") || undefined;
}
