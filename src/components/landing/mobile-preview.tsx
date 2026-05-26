import Link from "next/link";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { PhoneFrame } from "./phone-frame";
import { MobileNewPublication } from "./mobile-screens/mobile-new-publication";
import { MobileMyContents } from "./mobile-screens/mobile-my-contents";
import { MobileTimelineDetail } from "./mobile-screens/mobile-timeline-detail";
import { FadeInOnScroll } from "./fade-in-on-scroll";
import { Smartphone, Video, Radio, Bell, ShieldCheck, WifiOff, ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/section";

const features = [
  { icon: Smartphone, label: "Saisie rapide", description: "Création de brouillons en quelques secondes" },
  { icon: Video, label: "Envoi vidéos terrain", description: "Upload direct depuis le terrain" },
  { icon: Radio, label: "Live streaming", description: "Diffusion en direct intégrée" },
  { icon: Bell, label: "Notifications", description: "Alerts push pour validations" },
  { icon: ShieldCheck, label: "Suivi des validations", description: "Statut en temps réel" },
  { icon: WifiOff, label: "Mode hors ligne", description: "Travailler sans connexion" },
];

export function MobilePreview() {
  return (
    <section className="py-16">
      <Container>
        <FadeInOnScroll>
          <SectionHeader
            eyebrow="Application mobile journaliste"
            title="Une rédaction toujours connectée au terrain"
            description="Vos journalistes envoient, valident et suivent leurs contenus en mobilité, avec une interface pensée pour l'urgence du direct."
          />
        </FadeInOnScroll>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <FadeInOnScroll delay={0.1}>
            <div className="flex items-end justify-center gap-3 sm:gap-5">
              <PhoneFrame rotate={-6} className="hidden sm:block">
                <MobileNewPublication />
              </PhoneFrame>
              <PhoneFrame rotate={0}>
                <MobileMyContents />
              </PhoneFrame>
              <PhoneFrame rotate={6} className="hidden sm:block">
                <MobileTimelineDetail />
              </PhoneFrame>
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.2}>
            <GlassCard className="p-5">
              <p className="mb-4 text-sm font-semibold text-text-primary">
                Fonctionnalités mobiles
              </p>
              <div className="grid grid-cols-2 gap-3">
                {features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.label}
                      className="rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.06]"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue/15 to-accent-violet/15 text-accent-violet ring-1 ring-white/10">
                        <Icon size={14} />
                      </span>
                      <p className="mt-2 text-xs font-semibold text-text-primary">{f.label}</p>
                      <p className="mt-0.5 text-[10px] text-text-secondary">
                        {f.description}
                      </p>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/mobile"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-text-primary transition hover:border-accent-violet/40 hover:bg-accent-violet/10"
              >
                Tester l&apos;app mobile en simulation
                <ArrowRight size={12} />
              </Link>
            </GlassCard>
          </FadeInOnScroll>
        </div>
      </Container>
    </section>
  );
}
