"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getApi,
  onAuthTokenChange,
  postApi,
  refreshAuthToken,
  setAuthToken,
} from "@/lib/api-client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  team?: string;
  initials: string;
  color: string;
}

// Decode the `exp` claim from a JWT without verifying the signature. Used to
// short-circuit /auth/me round-trips when we already know the token is good.
// Treats unparseable / signature-less tokens as expired (forces re-fetch).
function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".");
    if (!payload) return true;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof json?.exp !== "number") return true;
    return Date.now() / 1000 >= json.exp - 30; // 30s safety margin
  } catch {
    return true;
  }
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      loading: false,
      error: null,
      bootstrap: async () => {
        const state = useAuthStore.getState();
        let token = state.token;
        if (!token) {
          token = await refreshAuthToken();
          if (!token) {
            setAuthToken(null);
            set({ hydrated: true });
            return;
          }
        }
        setAuthToken(token);
        // Fast path: if the token isn't obviously expired and we still hold a
        // persisted user, trust it and skip /auth/me. Saves one round-trip per
        // page nav and avoids burning through the throttle bucket when users
        // page-hop quickly. /auth/me still runs on cold start (no user yet).
        if (state.user && !isTokenExpired(token)) {
          set({ hydrated: true, error: null });
          return;
        }
        try {
          const user = await getApi<AuthUser>("auth/me");
          set({ user, hydrated: true, error: null });
        } catch {
          setAuthToken(null);
          set({ user: null, token: null, hydrated: true });
        }
      },
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const r = await postApi<{ token: string; user: AuthUser }>(
            "auth/login",
            { email, password },
            "POST",
            10_000,
          );
          setAuthToken(r.token);
          set({ user: r.user, token: r.token, hydrated: true, loading: false, error: null });
          return true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Login failed";
          set({ loading: false, error: msg });
          return false;
        }
      },
      logout: async () => {
        try {
          await postApi("auth/logout", undefined, "POST");
        } catch {
          // Local logout must still clear the session if the API is unreachable.
        }
        setAuthToken(null);
        set({ user: null, token: null, hydrated: true, error: null });
      },
    }),
    {
      name: "cmr-auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        // Keep localStorage token mirror in sync after rehydration
        if (state?.token) setAuthToken(state.token);
      },
    },
  ),
);

onAuthTokenChange((token) => {
  if (token) {
    useAuthStore.setState({ token, hydrated: true });
  } else {
    useAuthStore.setState({ user: null, token: null });
  }
});
