import type { MediaAsset } from "@/types";

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=400&fit=crop&auto=format`;
const photoThumb = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=320&h=200&fit=crop&auto=format`;

const ids = [
  "1611162616305-c69b3fa7fbe0",
  "1521737711867-e3b97375f902",
  "1493225457124-a3eb161ffa5f",
  "1529107386315-e1a2ed48a620",
  "1523805009345-7448845a9e53",
  "1503676260728-1c00da094a0b",
  "1547036967-23d11aacaee0",
  "1568992687947-868a62a9f521",
  "1514525253161-7a46d19cd819",
  "1517649763962-0c623066013b",
  "1554224155-6726b3ff858f",
  "1493612276216-ee3925520721",
  "1502082553048-f009c37129b9",
  "1521295121783-8a321d551ad2",
  "1513519245088-0e12902e5a38",
  "1517502884422-41eaead166d4",
  "1497366216548-37526070297c",
  "1559526324-4b87b5e36e44",
  "1517457373958-b7bdd4587205",
  "1446776877081-d282a0f896e2",
];

const titles = [
  "Journal de 20h",
  "Interview Ministre Culture",
  "Festival des musiques",
  "Élections régionales",
  "Terres d'Afrique",
  "Éducation et numérique",
  "Inondations delta",
  "Conférence PM",
  "Backstage festival",
  "Finale championnat",
  "Croissance 2026",
  "Cyber-sécurité",
  "Bulletin météo",
  "Sommet UA",
  "Vernissage Dakar",
  "Presse arbitrage",
  "Logement étudiant",
  "Marchés financiers",
  "Centre culturel",
  "Satellite national",
];

const types = ["video", "video", "video", "image", "video", "video", "video", "video", "video", "video", "image", "audio", "video", "image", "image", "image", "image", "image", "image", "video"] as const;
const sizes = ["1.8 GB", "780 MB", "1.2 GB", "8.4 MB", "2.1 GB", "1.6 GB", "910 MB", "1.4 GB", "120 MB", "3.2 GB", "6.1 MB", "84 MB", "420 MB", "5.4 MB", "9.1 MB", "4.6 MB", "7.8 MB", "11 MB", "6.7 MB", "1.7 GB"];

export const mediaAssets: MediaAsset[] = ids.map((id, i) => ({
  id: `m${i + 1}`,
  title: titles[i] ?? `Asset ${i + 1}`,
  type: types[i] ?? "image",
  url: photo(id),
  thumbnail: photoThumb(id),
  size: sizes[i] ?? "—",
  duration: types[i] === "video" ? 120 + (i * 23) : undefined,
  uploadedAt: `2026-05-${String(20 + (i % 6)).padStart(2, "0")}T${String(8 + (i % 10)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00`,
  uploadedBy: `Équipe ${["Politique", "Culture", "Sport", "Société", "International", "Économie"][i % 6]}`,
  tags: ["actualité", "national", types[i] ?? "image"],
}));
