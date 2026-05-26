/**
 * Client HTTP léger pour l'API NestJS.
 *
 * Stratégie de fallback :
 *  - Si `NEXT_PUBLIC_API_URL` n'est pas défini → on n'essaie pas l'API.
 *  - Si défini mais que l'appel échoue (réseau, 5xx, timeout) → null retourné,
 *    le hook appelant retombe sur les mocks locaux.
 *
 * Cette approche garantit que la démo reste 100% fonctionnelle même API down,
 * et permet une migration incrémentale endpoint par endpoint.
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

export async function tryApi<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T | null> {
  if (!API_URL) return null;
  const url = `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`[api] ${url} → HTTP ${res.status} · falling back to mock`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[api] ${url} timeout ${timeoutMs}ms · falling back to mock`);
    } else {
      console.warn(`[api] ${url} fetch error · falling back to mock`, err);
    }
    return null;
  } finally {
    clearTimeout(t);
  }
}
