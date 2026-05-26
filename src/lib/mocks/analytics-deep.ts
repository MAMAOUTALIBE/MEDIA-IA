import { CHANNEL_ORDER, CHANNELS } from "@/lib/constants";
import type { ChannelKey } from "@/types";

export const engagementByDayOfWeek = [
  { day: "Lun", engagement: 4.2 },
  { day: "Mar", engagement: 4.5 },
  { day: "Mer", engagement: 4.7 },
  { day: "Jeu", engagement: 5.1 },
  { day: "Ven", engagement: 5.6 },
  { day: "Sam", engagement: 6.4 },
  { day: "Dim", engagement: 5.9 },
];

export const topContents = [
  { id: "tc1", title: "Le journal de 20h du 26/05", channel: "youtube" as ChannelKey, views: 482_300, engagement: 6.1 },
  { id: "tc2", title: "Backstage festival", channel: "tiktok" as ChannelKey, views: 642_100, engagement: 11.2 },
  { id: "tc3", title: "Flash Info — Élections", channel: "telegram" as ChannelKey, views: 312_400, engagement: 5.2 },
  { id: "tc4", title: "Reportage Festival musiques", channel: "instagram" as ChannelKey, views: 218_700, engagement: 8.4 },
  { id: "tc5", title: "Conférence PM", channel: "facebook" as ChannelKey, views: 158_900, engagement: 4.7 },
  { id: "tc6", title: "Documentaire Terres Afrique", channel: "smarttv" as ChannelKey, views: 142_500, engagement: 5.8 },
  { id: "tc7", title: "Portrait d'un champion", channel: "youtube" as ChannelKey, views: 87_500, engagement: 5.8 },
  { id: "tc8", title: "Édito vidéo", channel: "web" as ChannelKey, views: 41_200, engagement: 4.5 },
  { id: "tc9", title: "Sport — Arbitrage", channel: "twitter" as ChannelKey, views: 36_900, engagement: 3.1 },
  { id: "tc10", title: "Podcast Cyber-sécurité", channel: "web" as ChannelKey, views: 24_300, engagement: 3.8 },
];

export const topChannels = CHANNEL_ORDER.map((c, i) => ({
  channel: c,
  label: CHANNELS[c].label,
  color: CHANNELS[c].color,
  views: [1_580_000, 1_420_000, 920_000, 880_000, 540_000, 410_000, 280_000, 190_000, 140_000][i] ?? 100_000,
}));
