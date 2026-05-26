import type { TimeSeriesPoint } from "@/types";

function build(days: number, seed = 91): TimeSeriesPoint[] {
  let s = seed;
  const out: TimeSeriesPoint[] = [];
  const baseDate = new Date("2026-05-26T00:00:00");
  for (let i = days - 1; i >= 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const r1 = s / 233280;
    s = (s * 9301 + 49297) % 233280;
    const r2 = s / 233280;
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const trend = 1 + (days - i) * 0.012;
    const views = Math.round((620_000 + r1 * 220_000) * trend);
    const users = Math.round(views * (0.32 + r2 * 0.12));
    out.push({
      date: d.toISOString().slice(0, 10),
      views,
      users,
    });
  }
  return out;
}

export const audience7d = build(7, 191);
export const audience30d = build(30, 211);
export const audience90d = build(90, 511);

export const audienceByRange = {
  "7d": audience7d,
  "30d": audience30d,
  "90d": audience90d,
} as const;

export type AudienceRange = keyof typeof audienceByRange;
