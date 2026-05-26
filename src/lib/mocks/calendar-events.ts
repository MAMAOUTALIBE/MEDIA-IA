import type { CalendarEvent, ChannelKey, ContentType } from "@/types";

const channels: ChannelKey[] = ["web", "mobile", "youtube", "facebook", "instagram", "twitter", "tiktok", "telegram", "smarttv"];
const types: ContentType[] = ["article", "video", "social", "audio"];
const titles = [
  "Journal de 20h",
  "Magazine politique",
  "Interview exclusive",
  "Documentaire",
  "Reportage terrain",
  "Édito vidéo",
  "Bulletin météo",
  "Émission de débat",
  "Coulisses festival",
  "Tribune libre",
  "Podcast Tech & Société",
  "Critique cinéma",
  "Analyse économique",
  "Sport en direct",
  "Format social vertical",
];

function buildEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const baseDate = new Date("2026-05-01T00:00:00");
  let seed = 17;
  for (let i = 0; i < 32; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r1 = seed / 233280;
    seed = (seed * 9301 + 49297) % 233280;
    const r2 = seed / 233280;
    seed = (seed * 9301 + 49297) % 233280;
    const r3 = seed / 233280;
    const day = Math.floor(r1 * 31) + 1;
    const date = new Date(baseDate);
    date.setDate(day);
    const hour = 6 + Math.floor(r2 * 16);
    date.setHours(hour, Math.floor(r3 * 60), 0, 0);
    events.push({
      id: `cal${i}`,
      title: titles[i % titles.length] ?? "Publication",
      date: date.toISOString(),
      channel: channels[i % channels.length] ?? "web",
      contentType: types[i % types.length] ?? "article",
    });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export const calendarEvents: CalendarEvent[] = buildEvents();
