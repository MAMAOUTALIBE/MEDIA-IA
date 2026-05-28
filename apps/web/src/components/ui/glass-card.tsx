import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "default" | "elevated" | "accent" | "subtle" | "premium";

const variantClass: Record<Variant, string> = {
  default:
    "bg-white/[0.035] border border-white/[0.07] shadow-card backdrop-blur-xl",
  elevated:
    "bg-white/[0.05] border border-white/[0.10] shadow-elevated backdrop-blur-2xl",
  accent:
    "bg-gradient-to-br from-accent-blue/[0.12] via-accent-violet/[0.08] to-transparent border border-white/[0.10] shadow-glow-violet backdrop-blur-xl",
  subtle:
    "bg-white/[0.02] border border-white/[0.05] backdrop-blur-md",
  // Premium = inner-highlight + layered shadow + readiness for hover lift.
  // Pairs perfectly with `interactive` to get the lift + glow on hover.
  premium:
    "bg-gradient-to-b from-white/[0.045] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl",
};

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  /** Adds a soft lift + violet halo on hover. Use for clickable cards. */
  interactive?: boolean;
  /** Adds an animated conic gradient border. Reserve for hero cards. */
  glow?: boolean;
}

export function GlassCard({
  className,
  variant = "default",
  interactive = false,
  glow = false,
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl",
        // The premium variant keeps the layered shadow even at rest; other
        // variants ship their own shadow utility.
        variant === "premium" && "shadow-[var(--shadow-premium)]",
        variantClass[variant],
        interactive && "lift-on-hover cursor-pointer",
        glow && "gradient-border",
        "transition-all duration-200",
        className,
      )}
      {...rest}
    />
  );
}

export function GlassCardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold tracking-tight text-text-primary">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function GlassCardBody({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...rest} />;
}
