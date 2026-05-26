import { Container } from "@/components/ui/container";
import { Inbox, ShieldCheck, CheckCircle2, Zap, Send, BarChart3 } from "lucide-react";
import { FadeInOnScroll } from "./fade-in-on-scroll";

const steps = [
  { icon: Inbox, label: "Collecter", description: "Tous vos contenus en un seul endroit", color: "#60a5fa" },
  { icon: ShieldCheck, label: "Vérifier", description: "IA et contrôles automatiques", color: "#22d3ee" },
  { icon: CheckCircle2, label: "Valider", description: "Workflows éditoriaux personnalisés", color: "#10b981" },
  { icon: Zap, label: "Automatiser", description: "Règles et actions automatiques", color: "#f59e0b" },
  { icon: Send, label: "Publier", description: "Sur tous vos canaux en un clic", color: "#f472b6" },
  { icon: BarChart3, label: "Analyser", description: "Mesurer, comprendre, optimiser", color: "#a78bfa" },
];

export function ProcessStrip() {
  return (
    <section className="border-y border-white/[0.04] bg-bg-elevated/40 py-14">
      <Container>
        <FadeInOnScroll>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-accent-violet">
            Une solution complète pour votre chaîne TV
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="glass flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition hover:bg-white/[0.06]"
                >
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-card"
                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}aa)` }}
                    aria-hidden
                  >
                    <Icon size={20} />
                  </span>
                  <p className="text-sm font-semibold text-text-primary">{s.label}</p>
                  <p className="text-[11px] leading-snug text-text-secondary">{s.description}</p>
                </div>
              );
            })}
          </div>
        </FadeInOnScroll>
      </Container>
    </section>
  );
}
