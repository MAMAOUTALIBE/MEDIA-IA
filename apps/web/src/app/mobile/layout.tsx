"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { ArrowLeft, FileText, PlusCircle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileStore } from "@/lib/stores/mobile-store";

const tabs = [
  { href: "/mobile/contenus", label: "Contenus", icon: FileText },
  { href: "/mobile/publish", label: "Publier", icon: PlusCircle },
];

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const submissions = useMobileStore((s) => s.submissions);
  const pendingCount = submissions.filter((s) => s.step !== "published").length;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-bg-base">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-bg-base/85 px-4 backdrop-blur-2xl">
        {pathname.startsWith("/mobile/contenus/") &&
        pathname !== "/mobile/contenus" ? (
          <Link
            href="/mobile/contenus"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
            aria-label="Retour"
          >
            <ArrowLeft size={16} />
          </Link>
        ) : (
          <Logo size={26} withWordmark />
        )}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-text-secondary transition hover:bg-white/[0.06]"
          >
            Mode bureau
          </Link>
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-white/[0.06]"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {pendingCount > 0 && (
              <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-md border-t border-white/[0.06] bg-bg-card/95 backdrop-blur-2xl">
          <div className="grid grid-cols-2 gap-1 p-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active =
                t.href === "/mobile/contenus"
                  ? pathname.startsWith("/mobile/contenus")
                  : pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium transition",
                    active
                      ? "bg-gradient-to-br from-accent-blue/15 to-accent-violet/15 text-text-primary ring-1 ring-accent-violet/30"
                      : "text-text-secondary hover:bg-white/[0.04]",
                  )}
                >
                  <Icon size={18} className={active ? "text-accent-violet" : ""} />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
