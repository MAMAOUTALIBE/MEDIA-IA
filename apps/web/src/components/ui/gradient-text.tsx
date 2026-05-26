import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function GradientText({
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("gradient-text", className)} {...rest} />;
}
