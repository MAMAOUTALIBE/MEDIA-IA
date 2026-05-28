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
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
        // Spring-y easing on the whole row gives a more "intentional" feel
        // than the default ease-out, which can read as floaty.
        "transition-[background,color,transform] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]",
        isActive
          ? "text-text-primary"
          : "text-text-secondary hover:translate-x-0.5 hover:text-text-primary",
        collapsed && "justify-center",
      )}
      title={collapsed ? item.label : undefined}
    >
      {/* Active state — layered surface so the gradient bar reads against any
          parent background, and an inner ring picks up the violet accent. */}
      {isActive && (
        <>
          <span
            aria-hidden
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent-violet/[0.18] via-accent-blue/[0.10] to-transparent ring-1 ring-inset ring-white/[0.06]"
          />
          <span
            aria-hidden
            className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-accent-blue via-accent-violet to-accent-cyan shadow-[0_0_12px_2px_rgba(139,92,246,0.6)]"
          />
        </>
      )}
      {/* Hover wash under the row — pre-fades in so the row doesn't feel inert. */}
      {!isActive && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-xl bg-white/[0.04] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      )}
      <Icon
        size={18}
        strokeWidth={1.8}
        className={cn(
          "relative shrink-0 transition-colors",
          isActive
            ? "text-accent-violet [filter:drop-shadow(0_0_6px_rgba(139,92,246,0.6))]"
            : "text-text-secondary group-hover:text-text-primary",
        )}
        aria-hidden
      />
      {!collapsed && (
        <>
          <span className="relative flex-1 truncate">{item.label}</span>
          {item.badgeLabel ? (
            <span className="relative inline-flex items-center gap-1 rounded-full bg-danger/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-danger ring-1 ring-danger/30">
              <span className="pulse-dot text-danger" />
              {item.badgeLabel}
            </span>
          ) : item.badge !== undefined ? (
            <span className="relative inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-violet/20 px-1.5 text-[10px] font-semibold text-accent-violet ring-1 ring-accent-violet/30">
              {item.badge}
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}
