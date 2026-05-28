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

type TryApiOptions = {
  timeoutMs?: number;
  strictWhenAuthenticated?: boolean;
};

type RefreshResponse = {
  token?: string;
  accessTokenExpiresIn?: number;
};

let refreshPromise: Promise<string | null> | null = null;
let lastFailedRefreshAt = 0;
const REFRESH_FAILURE_COOLDOWN_MS = 30_000;
let authTokenChangeListener: ((token: string | null) => void) | null = null;

/**
 * RFC 7807 Problem Details payload returned by the API.
 * `errors` maps a field/section name → list of human-readable issues.
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  timestamp?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly problem: ProblemDetails | null;
  readonly requestId: string | null;

  constructor(
    message: string,
    status: number,
    body: string,
    problem: ProblemDetails | null = null,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.problem = problem;
    this.requestId = requestId;
  }

  /** Human-friendly message — prefers the API's `detail`/`title` over the verbose default. */
  get displayMessage(): string {
    return this.problem?.detail ?? this.problem?.title ?? this.message;
  }
}

async function parseProblem(res: Response): Promise<{ problem: ProblemDetails | null; body: string }> {
  const text = await res.text().catch(() => "");
  if (!text) return { problem: null, body: "" };
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/problem+json") || contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(text) as ProblemDetails;
      if (typeof parsed?.status === "number" || typeof parsed?.title === "string") {
        return { problem: parsed, body: text };
      }
    } catch {
      /* fall through */
    }
  }
  return { problem: null, body: text };
}

async function buildApiError(method: string, url: string, res: Response): Promise<ApiError> {
  const { problem, body } = await parseProblem(res);
  const requestId = res.headers.get("x-request-id") ?? problem?.requestId ?? null;
  const summary =
    problem?.detail ?? problem?.title ?? `${method} ${url} → HTTP ${res.status}`;
  return new ApiError(summary, res.status, body, problem, requestId);
}

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
  authTokenChangeListener?.(token);
}

export function onAuthTokenChange(listener: (token: string | null) => void) {
  authTokenChangeListener = listener;
  return () => {
    if (authTokenChangeListener === listener) {
      authTokenChangeListener = null;
    }
  };
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

function normalizeTryApiOptions(options?: number | TryApiOptions): Required<TryApiOptions> {
  if (typeof options === "number") {
    return { timeoutMs: options, strictWhenAuthenticated: false };
  }
  return {
    timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    strictWhenAuthenticated: options?.strictWhenAuthenticated ?? false,
  };
}

function shouldRefreshAccessToken(path: string, status: number, hasAuthToken: boolean) {
  if (status !== 401 || !hasAuthToken) return false;
  const normalizedPath = path.replace(/^\//, "");
  if (["auth/login", "auth/mfa/verify", "auth/refresh"].includes(normalizedPath)) return false;
  // Cooldown: if refresh just failed (no cookie / expired session), don't keep
  // hammering /auth/refresh on every subsequent 401 — that bursts through the
  // throttler and forces the entire UI to fall back to mocks for a full minute.
  // The user already needs to log in again; one failure is enough to know.
  if (lastFailedRefreshAt && Date.now() - lastFailedRefreshAt < REFRESH_FAILURE_COOLDOWN_MS) {
    return false;
  }
  return true;
}

async function requestRefreshAuthToken(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string | null> {
  if (!API_URL) return null;
  const url = `${API_URL.replace(/\/$/, "")}/auth/refresh`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) {
      lastFailedRefreshAt = Date.now();
      return null;
    }
    const body = (await res.json()) as RefreshResponse;
    if (!body.token) {
      lastFailedRefreshAt = Date.now();
      return null;
    }
    lastFailedRefreshAt = 0;
    setAuthToken(body.token);
    return body.token;
  } catch {
    lastFailedRefreshAt = Date.now();
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function refreshAuthToken(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string | null> {
  refreshPromise ??= requestRefreshAuthToken(timeoutMs).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function tryApi<T>(
  path: string,
  options?: number | TryApiOptions,
): Promise<T | null> {
  if (!API_URL) return null;
  const { timeoutMs, strictWhenAuthenticated } = normalizeTryApiOptions(options);
  const url = `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const hasAuthToken = Boolean(getAuthToken());
  try {
    let res = await fetch(url, {
      signal: controller.signal,
      credentials: "include",
      headers: buildHeaders(),
    });
    if (shouldRefreshAccessToken(path, res.status, hasAuthToken) && (await refreshAuthToken())) {
      res = await fetch(url, {
        signal: controller.signal,
        credentials: "include",
        headers: buildHeaders(),
      });
    }
    if (!res.ok) {
      if (strictWhenAuthenticated && hasAuthToken) {
        throw await buildApiError("GET", url, res);
      }
      console.warn(`[api] GET ${url} → HTTP ${res.status} · falling back to mock`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    if (strictWhenAuthenticated && hasAuthToken) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new ApiError(`GET ${url} timeout ${timeoutMs}ms`, 0, "");
      }
      throw err;
    }
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

export async function getApi<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  if (!API_URL) {
    throw new Error("API non configurée (NEXT_PUBLIC_API_URL manquant)");
  }
  const url = `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const hasAuthToken = Boolean(getAuthToken());
  try {
    let res = await fetch(url, {
      signal: controller.signal,
      credentials: "include",
      headers: buildHeaders(),
    });
    if (shouldRefreshAccessToken(path, res.status, hasAuthToken) && (await refreshAuthToken())) {
      res = await fetch(url, {
        signal: controller.signal,
        credentials: "include",
        headers: buildHeaders(),
      });
    }
    if (!res.ok) {
      throw await buildApiError("GET", url, res);
    }
    return (await res.json()) as T;
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
  const hasAuthToken = Boolean(getAuthToken());
  try {
    const request = () =>
      fetch(url, {
        method,
        signal: controller.signal,
        credentials: "include",
        headers: buildHeaders({ "Content-Type": "application/json" }),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    let res = await request();
    if (shouldRefreshAccessToken(path, res.status, hasAuthToken) && (await refreshAuthToken())) {
      res = await request();
    }
    if (!res.ok) {
      throw await buildApiError(method, url, res);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}
