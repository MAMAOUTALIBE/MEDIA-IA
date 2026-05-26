"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Lock, ShieldCheck, Loader2 } from "lucide-react";

export function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState("e.rousseau@cmr.tv");
  const [password, setPassword] = useState("cmr2025");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border border-white/[0.10] bg-bg-card/95 p-0 backdrop-blur-2xl">
        <DialogHeader className="border-b border-white/[0.06] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet text-white shadow-glow-violet">
              <Lock size={18} />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-text-primary">Connexion CMR</DialogTitle>
              <DialogDescription className="!mt-0.5 text-[11px] !text-text-secondary">
                Démo · JWT 8h · mot de passe partagé `cmr2025`
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-danger/15 px-3 py-2 text-xs text-danger ring-1 ring-danger/30">
              {error.length > 200 ? error.slice(0, 200) + "…" : error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2.5 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Connexion…
              </>
            ) : (
              <>
                <ShieldCheck size={14} />
                Se connecter
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-text-muted">
            Comptes test : <code className="text-text-secondary">e.rousseau@cmr.tv</code>,{" "}
            <code className="text-text-secondary">v.moreau@cmr.tv</code>, ou tout email de la
            table users — mot de passe <code className="text-text-secondary">cmr2025</code>.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
