import type { ContentStatus } from "@/types";
import { STATUS } from "@/lib/constants";

export function StatusBadge({ status }: { status: ContentStatus }) {
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset"
      style={{ color: s.color, background: s.bg, borderColor: "transparent" }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}
