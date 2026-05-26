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
    <section id="solution" className="relative mesh-bg overflow-hidden pb-20 pt-16">
      <Sparkle count={50} seed={11} />
      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <FadeInOnScroll>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-accent-violet backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent-violet" />
              Plateforme nouvelle génération
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-5xl lg:text-[3.4rem]">
              La plateforme intelligente de{" "}
              <GradientText>gestion et de diffusion</GradientText>
              <br />
              de contenus média.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              CMR centralise toute la chaîne de production éditoriale et diffuse
              vos contenus sur tous les canaux digitaux — avec une IA native qui
              vérifie, valide et automatise à chaque étape.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-5 py-3 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95"
              >
                Découvrir le dashboard
                <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-medium text-text-primary backdrop-blur transition hover:bg-white/[0.06]"
              >
                <Play size={14} />
                Voir la démo (2 min)
              </button>
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.15}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-md">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="glass rounded-2xl p-4 transition hover:bg-white/[0.06]"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue/15 to-accent-violet/15 text-accent-violet ring-1 ring-white/10">
                      <Icon size={16} />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-text-primary">{f.title}</p>
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
