"use client";

import { useUIStore } from "@/lib/stores/ui-store";
import { navItems } from "./nav-items";
import { NavItem } from "./nav-item";
import { Logo } from "@/components/ui/logo";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChevronLeft, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-bg-card/90 text-text-primary backdrop-blur-xl lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu size={18} />
      </button>

      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-sidebar/80 backdrop-blur-2xl transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
        aria-label="Navigation principale"
      >
        <div className={cn("flex items-center px-4 py-5", collapsed ? "justify-center" : "justify-between")}>
          <Logo size={32} withWordmark={!collapsed} />
          {!collapsed && (
            <button
              type="button"
              onClick={toggle}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
              aria-label="Replier la navigation"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="mx-auto mb-2 inline-flex h-8 w-8 rotate-180 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
            aria-label="Déplier la navigation"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>
        {!collapsed && (
          <div className="border-t border-white/[0.06] p-3">
            <div className="rounded-xl bg-gradient-to-br from-accent-blue/10 via-accent-violet/10 to-transparent p-3 ring-1 ring-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
                Production
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Bus Kafka stable · Camunda OK
              </p>
            </div>
          </div>
        )}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 border-r border-white/10 bg-sidebar/95 p-0 backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between px-4 py-5">
            <Logo size={32} withWordmark />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
              aria-label="Fermer le menu"
            >
              <X size={16} />
            </button>
          </div>
          <nav className="space-y-1 px-3 pb-4">
            {navItems.map((item) => (
              <div key={item.href} onClick={() => setMobileOpen(false)}>
                <NavItem item={item} collapsed={false} />
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
