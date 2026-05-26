import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { FadeInOnScroll } from "./fade-in-on-scroll";
import { Clock, ShieldCheck, TrendingUp, Wallet } from "lucide-react";

const items = [
  {
    icon: Clock,
    label: "Gain de temps",
    value: "Jusqu'à 60%",
    description: "Réduction du temps de publication grâce à l'automatisation IA.",
    color: "#60a5fa",
  },
  {
    icon: ShieldCheck,
    label: "Qualité garantie",
    value: "98/100",
    description: "Score moyen de conformité éditoriale après vérification IA.",
    color: "#a78bfa",
  },
  {
    icon: TrendingUp,
    label: "Audience augmentée",
    value: "+24%",
    description: "Plus d'engagement sur l'ensemble des canaux digitaux.",
    color: "#22d3ee",
  },
  {
    icon: Wallet,
    label: "Coûts optimisés",
    value: "-32%",
    description: "Centralisation des outils et opérations manuelles réduites.",
    color: "#10b981",
  },
];

export function KpiSynthesis() {
  return (
    <section id="kpi" className="border-t border-white/[0.04] bg-bg-elevated/30 py-16">
      <Container>
        <FadeInOnScroll>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-accent-violet">
            La puissance de l&apos;IA et de l&apos;automatisation
          </p>
          <h2 className="mt-4 text-center text-3xl font-bold text-text-primary sm:text-4xl">
            Au service de votre rédaction
          </h2>
        </FadeInOnScroll>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <FadeInOnScroll key={item.label} delay={i * 0.05}>
                <GlassCard className="flex h-full flex-col p-5">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-card"
                    style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}aa)` }}
                  >
                    <Icon size={18} />
                  </span>
                  <p className="mt-4 text-xs uppercase tracking-wider text-text-muted">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">{item.value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                    {item.description}
                  </p>
                </GlassCard>
              </FadeInOnScroll>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
