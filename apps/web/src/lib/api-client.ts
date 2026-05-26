/**
 * Client HTTP léger pour l'API NestJS.
 *
 * - GET : `tryApi()` retourne null en cas d'erreur → hook fallback sur mock
 * - POST/PATCH : `postApi()` propage l'erreur (les mutations ne peuvent pas
 *   faire de fallback silencieux côté UX)
 *
 * Si un JWT est stocké dans localStorage (`cmr-auth-token`), il est attaché
 * en `Authorization: Bearer ...` automatiquement.
 */

export const API_URL: string | null =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : null;

export const SOCKET_URL: string | null =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SOCKET_URL
    ? process.env.NEXT_PUBLIC_SOCKET_URL
    : null;

export const API_ENABLED = API_URL !== null;

const DEFAULT_TIMEOUT_MS = 3000;

const AUTH_TOKEN_KEY = "cmr-auth-token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function tryApi<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T | null> {
  if (!API_URL) return null;
  const url = `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: buildHeaders(),
    });
    if (!res.ok) {
      console.warn(`[api] GET ${url} → HTTP ${res.status} · falling back to mock`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[api] GET ${url} timeout ${timeoutMs}ms · falling back to mock`);
    } else {
      console.warn(`[api] GET ${url} fetch error · falling back to mock`, err);
    }
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function postApi<T>(
  path: string,
  body?: unknown,
  method: "POST" | "PATCH" | "DELETE" = "POST",
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  if (!API_URL) {
    throw new Error("API non configurée (NEXT_PUBLIC_API_URL manquant)");
  }
  const url = `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: buildHeaders({ "Content-Type": "application/json" }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${method} ${url} → HTTP ${res.status} ${text}`.trim());
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}
