import Link from "next/link";
import { Compass } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-6 py-16 text-center"
    >
      <GlassCard className="w-full px-8 py-12">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-blue/15 via-accent-violet/10 to-transparent text-accent-violet ring-1 ring-white/[0.08]">
          <Compass size={22} aria-hidden />
        </span>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
          Erreur 404
        </p>
        <h1 className="mt-2 text-xl font-semibold text-text-primary">Page introuvable</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Le contenu que vous cherchez a peut-être été déplacé, archivé, ou n&apos;existe plus.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
          >
            Retour au tableau de bord
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
          >
            Voir la landing
          </Link>
        </div>
      </GlassCard>
    </main>
  );
}
