import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/shell/sidebar";
import { Topbar } from "@/components/dashboard/shell/topbar";
import { CommandPalette } from "@/components/dashboard/shell/command-palette";
import { AIAssistant } from "@/components/dashboard/shell/ai-assistant";
import { DashboardRouteGuard } from "@/components/dashboard/shell/route-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          aria-label="Contenu principal du dashboard"
          className="flex-1 px-4 py-6 lg:px-8 lg:py-8 focus:outline-none"
        >
          <DashboardRouteGuard>{children}</DashboardRouteGuard>
        </main>
      </div>
      <CommandPalette />
      <AIAssistant />
    </div>
  );
}
