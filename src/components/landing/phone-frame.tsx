import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PhoneFrame({
  children,
  className,
  rotate = 0,
}: {
  children: ReactNode;
  className?: string;
  rotate?: number;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 rounded-[2.6rem] border border-white/[0.10] bg-black p-2 shadow-elevated ring-1 ring-white/[0.06]",
        className,
      )}
      style={{ width: 220, height: 460, transform: `rotate(${rotate}deg)` }}
    >
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
      <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-bg-base">
        {children}
      </div>
    </div>
  );
}
