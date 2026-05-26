export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

function intensityOf(count: number): HeatmapDay["intensity"] {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function build(): HeatmapDay[] {
  const baseDate = new Date("2026-05-26T00:00:00");
  const days: HeatmapDay[] = [];
  let seed = 137;
  for (let i = 364; i >= 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const day = d.getDay(); // 0 = Sun
    // Slightly less on weekends, slightly more recent (growing newsroom activity)
    const recencyBoost = (365 - i) / 365;
    const weekendDamp = day === 0 || day === 6 ? 0.6 : 1;
    const base = r * 12 * weekendDamp * (0.4 + 0.9 * recencyBoost);
    // Occasional spike (≈ 6%)
    const spike = r > 0.94 ? 6 + Math.floor(r * 8) : 0;
    const count = Math.max(0, Math.round(base + spike));
    days.push({
      date: d.toISOString().slice(0, 10),
      count,
      intensity: intensityOf(count),
    });
  }
  return days;
}

export const publicationHeatmap = build();

export const heatmapTotals = {
  total: publicationHeatmap.reduce((s, d) => s + d.count, 0),
  best: publicationHeatmap.reduce(
    (acc, d) => (d.count > acc.count ? d : acc),
    publicationHeatmap[0]!,
  ),
  averagePerDay:
    Math.round(
      (publicationHeatmap.reduce((s, d) => s + d.count, 0) / publicationHeatmap.length) * 10,
    ) / 10,
  activeDays: publicationHeatmap.filter((d) => d.count > 0).length,
};
