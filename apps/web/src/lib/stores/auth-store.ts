"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { postApi, setAuthToken } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  team?: string;
  initials: string;
  color: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const r = await postApi<{ token: string; user: AuthUser }>("auth/login", {
            email,
            password,
          });
          setAuthToken(r.token);
          set({ user: r.user, token: r.token, loading: false, error: null });
          return true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Login failed";
          set({ loading: false, error: msg });
          return false;
        }
      },
      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null, error: null });
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
