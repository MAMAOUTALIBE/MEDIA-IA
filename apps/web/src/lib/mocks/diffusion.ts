import type { DiffusionStatus, ChannelKey } from "@/types";
import { contents } from "./contents";

const channels: ChannelKey[] = ["web", "mobile", "youtube", "facebook", "instagram", "twitter", "tiktok", "telegram", "smarttv"];

function statusFor(seed: number, included: boolean): "published" | "scheduled" | "failed" | "na" {
  if (!included) return "na";
  const r = seed % 100;
  if (r < 70) return "published";
  if (r < 88) return "scheduled";
  if (r < 95) return "failed";
  return "na";
}

export const diffusionMatrix: DiffusionStatus[] = contents.slice(0, 12).map((c, i) => {
  const byChannel: DiffusionStatus["byChannel"] = {};
  channels.forEach((ch, j) => {
    const included = c.channels.includes(ch);
    byChannel[ch] = statusFor((i + 1) * 17 + j * 11, included);
  });
  return {
    contentId: c.id,
    contentTitle: c.title,
    byChannel,
  };
});

export const diffusionQuickStats = {
  publishedToday: 38,
  scheduled: 12,
  failed: 2,
};
