import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "default" | "elevated" | "accent" | "subtle";

const variantClass: Record<Variant, string> = {
  default:
    "bg-white/[0.035] border border-white/[0.07] shadow-card backdrop-blur-xl",
  elevated:
    "bg-white/[0.05] border border-white/[0.10] shadow-elevated backdrop-blur-2xl",
  accent:
    "bg-gradient-to-br from-accent-blue/[0.12] via-accent-violet/[0.08] to-transparent border border-white/[0.10] shadow-glow-violet backdrop-blur-xl",
  subtle:
    "bg-white/[0.02] border border-white/[0.05] backdrop-blur-md",
};

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function GlassCard({ className, variant = "default", ...rest }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        "transition-all duration-200",
        variantClass[variant],
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
        <h3 className="truncate text-sm font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
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
