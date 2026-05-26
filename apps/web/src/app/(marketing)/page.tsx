import { Hero } from "@/components/landing/hero";
import { ProcessStrip } from "@/components/landing/process-strip";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { MobilePreview } from "@/components/landing/mobile-preview";
import { EditorialWorkflow } from "@/components/landing/editorial-workflow";
import { AIChecks } from "@/components/landing/ai-checks";
import { OmnichannelDiffusion } from "@/components/landing/omnichannel-diffusion";
import { KpiSynthesis } from "@/components/landing/kpi-synthesis";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProcessStrip />
      <DashboardPreview />
      <MobilePreview />
      <EditorialWorkflow />
      <AIChecks />
      <OmnichannelDiffusion />
      <KpiSynthesis />
    </>
  );
}
