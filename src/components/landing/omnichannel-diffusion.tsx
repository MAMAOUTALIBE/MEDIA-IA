import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/components/ui/section";
import { FadeInOnScroll } from "./fade-in-on-scroll";
import { CHANNEL_ORDER, CHANNELS } from "@/lib/constants";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { Layers, Sparkles, Clock } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Publication simultanée",
    description: "Diffusez en un clic sur tous les canaux digitaux configurés.",
  },
  {
    icon: Sparkles,
    title: "Formats adaptés automatiquement",
    description: "Adaptation auto des formats, ratios et métadonnées par canal.",
  },
  {
    icon: Clock,
    title: "Programmation intelligente",
    description: "Heures optimales prédites par l'IA en fonction de votre audience.",
  },
];

export function OmnichannelDiffusion() {
  return (
    <section id="diffusion" className="py-16">
      <Container>
        <FadeInOnScroll>
          <SectionHeader
            eyebrow="Diffusion omnicanale"
            title="Tous vos canaux digitaux pilotés depuis un même cockpit"
            description="9 plateformes connectées nativement avec adaptation automatique des formats et programmation intelligente."
          />
        </FadeInOnScroll>

        <FadeInOnScroll>
          <GlassCard className="p-6 lg:p-8">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
              {CHANNEL_ORDER.map((c) => (
                <div
                  key={c}
                  className="group flex flex-col items-center gap-2 rounded-2xl bg-white/[0.025] p-3 ring-1 ring-white/[0.06] transition hover:scale-105 hover:bg-white/[0.05]"
                >
                  <ChannelIcon channel={c} size={22} decorated />
                  <p className="text-center text-[11px] font-medium text-text-primary">
                    {CHANNELS[c].label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="rounded-2xl bg-white/[0.025] p-5 ring-1 ring-white/[0.06]"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue/15 to-accent-violet/15 text-accent-violet ring-1 ring-white/10">
                      <Icon size={18} />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-text-primary">{f.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </FadeInOnScroll>
      </Container>
    </section>
  );
}
