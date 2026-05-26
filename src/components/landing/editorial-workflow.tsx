import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section";
import { FadeInOnScroll } from "./fade-in-on-scroll";
import { ArrowRight, CheckCircle2, User, FileEdit, ShieldCheck, Send, Compass } from "lucide-react";

const personas = [
  { icon: User, label: "Journaliste", description: "Crée le contenu", color: "#22d3ee" },
  { icon: FileEdit, label: "Rédacteur", description: "Vérifie et corrige", color: "#60a5fa" },
  { icon: ShieldCheck, label: "Chef d'édition", description: "Valide", color: "#a78bfa" },
  { icon: Compass, label: "Direction", description: "Approbation finale", color: "#f472b6" },
  { icon: Send, label: "Publication", description: "Automatique", color: "#10b981" },
];

const timeline = [
  { time: "10:15", label: "Soumis", color: "#22d3ee" },
  { time: "10:20", label: "Pris en charge", color: "#60a5fa" },
  { time: "10:45", label: "Validé", color: "#a78bfa" },
  { time: "11:00", label: "Approuvé", color: "#f472b6" },
  { time: "11:02", label: "Publié", color: "#10b981" },
];

export function EditorialWorkflow() {
  return (
    <section id="workflow" className="py-16">
      <Container>
        <FadeInOnScroll>
          <SectionHeader
            eyebrow="Workflow éditorial"
            title="Une chaîne de validation cadrée, suivie en temps réel"
            description="Chaque contenu suit un parcours à 4 niveaux orchestré par Camunda. Aucun contenu n'est publié sans validation explicite."
          />
        </FadeInOnScroll>

        <FadeInOnScroll delay={0.1}>
          <GlassCard className="p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center">
              {personas.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div key={p.label} className="contents">
                    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.025] p-4 text-center ring-1 ring-white/[0.06]">
                      <span
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white shadow-card"
                        style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}aa)` }}
                      >
                        <Icon size={20} />
                      </span>
                      <p className="text-sm font-semibold text-text-primary">{p.label}</p>
                      <p className="text-[11px] text-text-secondary">{p.description}</p>
                    </div>
                    {i < personas.length - 1 && (
                      <ArrowRight
                        size={18}
                        className="mx-auto rotate-90 text-text-muted lg:rotate-0"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-t border-white/[0.06] pt-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent-violet">
                Suivi en temps réel
              </p>
              <div className="relative">
                <div className="absolute left-2 right-2 top-3 h-px bg-white/[0.08]" aria-hidden />
                <div className="grid grid-cols-5 gap-2">
                  {timeline.map((t) => (
                    <div key={t.time} className="relative flex flex-col items-center">
                      <span
                        className="relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow-card"
                        style={{ background: t.color }}
                      >
                        <CheckCircle2 size={11} />
                      </span>
                      <p className="mt-2 text-xs font-semibold text-text-primary">{t.time}</p>
                      <p className="text-[10px] text-text-secondary">{t.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </FadeInOnScroll>
      </Container>
    </section>
  );
}
