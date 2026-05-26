import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section";
import { FadeInOnScroll } from "./fade-in-on-scroll";
import { CheckCircle2, Sparkles } from "lucide-react";
import { aiCheckResults, aiGlobalScore, aiRecommendations } from "@/lib/mocks/ai-checks";
import { AI_CHECKS } from "@/lib/constants";

export function AIChecks() {
  return (
    <section id="ia" className="bg-bg-elevated/30 py-16">
      <Container>
        <FadeInOnScroll>
          <SectionHeader
            eyebrow="Vérifications automatiques (IA)"
            title="Une IA qui contrôle chaque contenu avant publication"
            description="7 contrôles automatiques sont exécutés en parallèle. Un score global oriente la décision éditoriale."
          />
        </FadeInOnScroll>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <FadeInOnScroll>
            <GlassCard className="p-6">
              <ul className="space-y-3">
                {aiCheckResults.map((r) => {
                  const meta = AI_CHECKS[r.type];
                  return (
                    <li
                      key={r.type}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success ring-1 ring-success/30">
                          <CheckCircle2 size={14} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{meta.label}</p>
                          <p className="text-[11px] text-text-secondary">{meta.description}</p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          r.status === "warning"
                            ? "bg-warning-soft text-warning"
                            : "bg-success-soft text-success"
                        }`}
                      >
                        {r.score}/100
                      </span>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.15}>
            <GlassCard variant="accent" className="flex h-full flex-col gap-5 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-violet">
                  Score global
                </p>
                <div className="mt-3 flex items-end gap-3">
                  <p className="bg-gradient-to-br from-white to-accent-violet bg-clip-text text-6xl font-bold text-transparent">
                    {aiGlobalScore}
                  </p>
                  <p className="mb-3 text-2xl font-semibold text-text-secondary">/100</p>
                </div>
                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                  Excellent
                </p>
              </div>
              <div>
                <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <Sparkles size={12} className="text-accent-violet" />
                  Recommandations
                </p>
                <ul className="space-y-2">
                  {aiRecommendations.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-violet" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          </FadeInOnScroll>
        </div>
      </Container>
    </section>
  );
}
