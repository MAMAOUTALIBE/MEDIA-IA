import Link from "next/link";
import { Container } from "@/components/ui/container";
import { GradientText } from "@/components/ui/gradient-text";
import { Sparkle } from "@/components/ui/sparkle";
import {
  ShieldCheck,
  Zap,
  Send,
  BarChart3,
  Lock,
  ArrowRight,
  Play,
} from "lucide-react";
import { FadeInOnScroll } from "./fade-in-on-scroll";

const features = [
  {
    icon: ShieldCheck,
    title: "Vérification & Validation",
    description: "Contrôles automatiques et workflows éditoriaux avancés.",
  },
  {
    icon: Zap,
    title: "Automatisation",
    description: "Publication programmée et actions automatiques intelligentes.",
  },
  {
    icon: Send,
    title: "Diffusion Omnicanale",
    description: "Site web, apps, réseaux sociaux, TV connectée, newsletters.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Performance",
    description: "Tableaux de bord temps réel et rapports détaillés.",
  },
  {
    icon: Lock,
    title: "Sécurité & Traçabilité",
    description: "Gestion des accès, journal d'audit et sauvegardes sécurisées.",
  },
];

export function Hero() {
  return (
    <section id="solution" className="aurora-bg relative overflow-hidden pb-24 pt-20">
      <Sparkle count={50} seed={11} />
      {/* Soft top-vignette to anchor the headline against the aurora. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <FadeInOnScroll>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-accent-violet shadow-[0_0_24px_-8px_rgba(139,92,246,0.6)] backdrop-blur">
              <span className="pulse-dot text-accent-violet" />
              Plateforme nouvelle génération
              <span className="text-text-muted">·</span>
              <span className="text-text-secondary">v0.1 beta</span>
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.02] tracking-[-0.02em] text-text-primary sm:text-5xl lg:text-[3.6rem]">
              La plateforme intelligente de{" "}
              <GradientText>gestion et de diffusion</GradientText>
              <br />
              de contenus média.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              CMR centralise toute la chaîne de production éditoriale et diffuse
              vos contenus sur tous les canaux digitaux — avec une IA native qui
              vérifie, valide et automatise à chaque étape.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* Primary CTA — layered: solid gradient + outer glow + inner highlight + arrow nudge. */}
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-5 py-3 text-sm font-semibold text-white shadow-glow-violet transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_44px_-8px_rgba(139,92,246,0.8)] focus-visible:-translate-y-0.5"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.18] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <span className="relative">Découvrir le dashboard</span>
                <ArrowRight
                  size={16}
                  className="relative transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              {/* Secondary — ghost glass with subtle play accent. */}
              <button
                type="button"
                className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-medium text-text-primary backdrop-blur transition-all duration-200 hover:border-white/[0.16] hover:bg-white/[0.06]"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-accent-violet ring-1 ring-white/15 transition group-hover:bg-accent-violet/30 group-hover:text-white">
                  <Play size={9} fill="currentColor" aria-hidden />
                </span>
                Voir la démo
                <span className="text-text-muted">2 min</span>
              </button>
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.15}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-md">
              {features.map((f, i) => {
                const Icon = f.icon;
                // Stagger the icon tints across the grid to break monotony.
                const palette = [
                  "from-accent-blue/20 to-accent-violet/10 text-accent-blue",
                  "from-accent-violet/25 to-accent-cyan/10 text-accent-violet",
                  "from-accent-cyan/25 to-accent-blue/10 text-accent-cyan",
                  "from-accent-violet/20 to-accent-blue/10 text-accent-violet",
                  "from-accent-blue/20 to-accent-cyan/10 text-accent-blue",
                ];
                return (
                  <div
                    key={f.title}
                    className="lift-on-hover group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl"
                  >
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${palette[i % palette.length]} ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-110`}
                    >
                      <Icon size={16} aria-hidden />
                    </span>
                    <p className="mt-3 text-sm font-semibold tracking-tight text-text-primary">
                      {f.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      {f.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </FadeInOnScroll>
        </div>
      </Container>
    </section>
  );
}
