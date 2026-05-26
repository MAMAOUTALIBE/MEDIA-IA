import { KpiRow } from "@/components/dashboard/home/kpi-row";
import { AudienceChart } from "@/components/dashboard/home/audience-chart";
import { PlatformDonut } from "@/components/dashboard/home/platform-donut";
import { PendingContentsList } from "@/components/dashboard/home/pending-contents-list";
import { RecentActivityFeed } from "@/components/dashboard/home/recent-activity-feed";
import { SystemAlertsPanel } from "@/components/dashboard/home/system-alerts-panel";
import { LiveBanner } from "@/components/dashboard/home/live-banner";
import { BreakingNewsTicker } from "@/components/dashboard/home/breaking-news-ticker";

export const metadata = {
  title: "Tableau de bord — CMR",
};

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Synthèse temps réel de la production éditoriale et de la diffusion.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-text-secondary">
          Aujourd&apos;hui · {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
        </span>
      </div>

      <BreakingNewsTicker />

      <LiveBanner />

      <KpiRow />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AudienceChart />
        </div>
        <div className="lg:col-span-4">
          <PlatformDonut />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PendingContentsList />
        </div>
        <div className="lg:col-span-5">
          <RecentActivityFeed />
        </div>
      </div>

      <SystemAlertsPanel />
    </div>
  );
}
