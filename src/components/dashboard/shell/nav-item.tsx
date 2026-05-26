"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItemDef } from "./nav-items";

export function NavItem({
  item,
  collapsed,
}: {
  item: NavItemDef;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        isActive
          ? "bg-gradient-to-r from-accent-blue/[0.12] via-accent-violet/[0.10] to-transparent text-text-primary"
          : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
        collapsed && "justify-center",
      )}
      title={collapsed ? item.label : undefined}
    >
      {isActive && (
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-accent-blue to-accent-violet"
        />
      )}
      <Icon
        size={18}
        strokeWidth={1.8}
        className={cn(
          "shrink-0 transition-colors",
          isActive ? "text-accent-violet" : "text-text-secondary group-hover:text-text-primary",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badgeLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-danger ring-1 ring-danger/30">
              <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-danger" />
              {item.badgeLabel}
            </span>
          ) : item.badge !== undefined ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-violet/20 px-1.5 text-[10px] font-semibold text-accent-violet ring-1 ring-accent-violet/30">
              {item.badge}
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}
