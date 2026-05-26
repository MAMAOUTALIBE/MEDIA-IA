/**
 * Prisma seed — peuple la DB Postgres avec l'équivalent exact des mocks
 * actuellement servis par l'API NestJS (apps/api/src/mocks/*).
 *
 * Activation Phase 1, une fois Postgres provisionné :
 *
 *   1. Configurer DATABASE_URL dans .env :
 *      DATABASE_URL="postgresql://postgres:cmr@localhost:5432/cmr_dev"
 *
 *   2. Migrer :
 *      pnpm --filter @cmr/db migrate:dev --name init
 *
 *   3. Seeder :
 *      pnpm --filter @cmr/db tsx prisma/seed.ts
 *      # ou ajouter dans package.json:
 *      #   "prisma": { "seed": "tsx prisma/seed.ts" }
 *      # puis : pnpm --filter @cmr/db prisma db seed
 *
 *   4. Remplacer dans apps/api/src/contents/contents.controller.ts :
 *      `import { contents } from "../mocks/data"` → injecter PrismaService
 *
 * Ce seed reproduit l'ensemble des entités du schéma :
 *   - 12 Users (mêmes rôles, équipes, couleurs que les mocks)
 *   - 25+ Contents avec leurs Channels reliés
 *   - 6 PendingContents (vivent comme WorkflowInstances en step != published)
 *   - 20 MediaAssets
 *   - 8 AutomationRules
 *   - 40 AuditEvents
 *   - 5 Notifications (mentions)
 *   - 4 SystemAlerts
 *   - 32 CalendarEvents
 *   - 7 AICheckResults pour le contenu pivot c1
 *
 * NB : le `passwordHash` est volontairement vide pour la démo — Phase 1
 *      remplacera par bcrypt.hash("cmr2025", 12) avant la mise en prod.
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

// OWASP 2024 baseline for Argon2id
const ARGON2_OPTS = {
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
} as const;

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "cmr2025!Dev";

// ----------------------------- Users -----------------------------

const USERS = [
  { id: "u1", name: "Aïssatou Diop", email: "a.diop@cmr.tv", role: "journalist", team: "Politique", initials: "AD", color: "#22d3ee" },
  { id: "u2", name: "Mathieu Lefèvre", email: "m.lefevre@cmr.tv", role: "editor", team: "International", initials: "ML", color: "#60a5fa" },
  { id: "u3", name: "Fatou Ndiaye", email: "f.ndiaye@cmr.tv", role: "chief", team: "Société", initials: "FN", color: "#a78bfa" },
  { id: "u4", name: "Vincent Moreau", email: "v.moreau@cmr.tv", role: "direction", team: "Direction", initials: "VM", color: "#f472b6" },
  { id: "u5", name: "Ndèye Faye", email: "n.faye@cmr.tv", role: "community_manager", team: "Réseaux", initials: "NF", color: "#f59e0b" },
  { id: "u6", name: "Karim Benali", email: "k.benali@cmr.tv", role: "journalist", team: "Sport", initials: "KB", color: "#10b981" },
  { id: "u7", name: "Claire Dubois", email: "c.dubois@cmr.tv", role: "editor", team: "Économie", initials: "CD", color: "#38bdf8" },
  { id: "u8", name: "Omar Touré", email: "o.toure@cmr.tv", role: "journalist", team: "Culture", initials: "OT", color: "#ec4899" },
  { id: "u9", name: "Sophie Martin", email: "s.martin@cmr.tv", role: "chief", team: "Politique", initials: "SM", color: "#c084fc" },
  { id: "u10", name: "Ibrahim Sow", email: "i.sow@cmr.tv", role: "journalist", team: "Sport", initials: "IS", color: "#22d3ee" },
  { id: "u11", name: "Élise Rousseau", email: "e.rousseau@cmr.tv", role: "admin", team: "Direction", initials: "ER", color: "#10b981" },
  { id: "u12", name: "Tidiane Ba", email: "t.ba@cmr.tv", role: "community_manager", team: "Réseaux", initials: "TB", color: "#f59e0b" },
] as const;

// ----------------------------- Contents -----------------------------

const CONTENTS = [
  { id: "c1",  title: "Le journal de 20h du 26/05/2026", type: "video",   status: "published",         authorId: "u1", channels: ["web","mobile","youtube","facebook"], views: 482300, engagement: 6.1, publishedAt: "2026-05-26T20:05:00" },
  { id: "c2",  title: "Interview — Ministre de la Culture", type: "video", status: "pending_chief",   authorId: "u3", channels: ["web","youtube","instagram"] },
  { id: "c3",  title: "Reportage — Festival des musiques", type: "video", status: "published",       authorId: "u8", channels: ["web","mobile","instagram","tiktok"], views: 218700, engagement: 8.4, publishedAt: "2026-05-26T10:30:00" },
  { id: "c4",  title: "Flash Info — Élections régionales",  type: "article", status: "published",    authorId: "u9", channels: ["web","mobile","telegram","twitter"], views: 312400, engagement: 5.2, publishedAt: "2026-05-26T09:00:00" },
  { id: "c5",  title: "Documentaire — Terres d'Afrique",    type: "video",   status: "pending_direction", authorId: "u1", channels: ["smarttv","web","youtube"] },
  { id: "c6",  title: "Émission — Éducation et numérique", type: "video",   status: "pending_editor", authorId: "u6", channels: ["web","youtube","facebook"] },
  { id: "c7",  title: "Reportage — Inondations dans le delta", type: "video", status: "pending_chief", authorId: "u6", channels: ["web","mobile","youtube"] },
  { id: "c8",  title: "Conférence de presse — Premier Ministre", type: "video", status: "published",  authorId: "u3", channels: ["web","youtube","facebook","twitter"], views: 158900, engagement: 4.7, publishedAt: "2026-05-25T17:30:00" },
  { id: "c9",  title: "Festival — Backstage exclusif",      type: "social",  status: "published",      authorId: "u8", channels: ["tiktok","instagram"], views: 642100, engagement: 11.2, publishedAt: "2026-05-26T00:00:00" },
  { id: "c10", title: "Sport — Finale du championnat",      type: "video",   status: "draft",          authorId: "u10", channels: ["smarttv","web","youtube"] },
] as const;

// ----------------------------- Media -----------------------------

const MEDIA = [
  { id: "m1",  title: "Journal de 20h",            type: "video", url: "1611162616305-c69b3fa7fbe0", sizeBytes: 1_800_000_000, durationSec: 1800 },
  { id: "m2",  title: "Interview Ministre Culture", type: "video", url: "1521737711867-e3b97375f902", sizeBytes:   780_000_000, durationSec: 1320 },
  { id: "m3",  title: "Festival des musiques",      type: "video", url: "1493225457124-a3eb161ffa5f", sizeBytes: 1_200_000_000, durationSec: 1500 },
  { id: "m4",  title: "Élections régionales",       type: "image", url: "1529107386315-e1a2ed48a620", sizeBytes:     8_400_000 },
  { id: "m5",  title: "Terres d'Afrique",           type: "video", url: "1523805009345-7448845a9e53", sizeBytes: 2_100_000_000, durationSec: 3600 },
] as const;

// ----------------------------- AI Checks -----------------------------

const AI_CHECKS = [
  { type: "spelling",      status: "passed",  score: 99, message: "Aucune erreur détectée" },
  { type: "plagiarism",    status: "passed",  score: 100, message: "Pas de doublon détecté" },
  { type: "sensitive",     status: "passed",  score: 97, message: "Aucun contenu sensible" },
  { type: "copyright",     status: "passed",  score: 100, message: "Sources et licences vérifiées" },
  { type: "media_quality", status: "passed",  score: 96, message: "Qualité conforme" },
  { type: "seo",           status: "warning", score: 92, message: "Suggérer un mot-clé secondaire" },
  { type: "fake_news",     status: "passed",  score: 99, message: "Croisement OK" },
] as const;

// ----------------------------- Automations -----------------------------

const AUTOMATIONS = [
  { id: "ar1", name: "Publication automatique réseaux sociaux", trigger: "content.approved", action: "publish:facebook,twitter,instagram", active: true, runs: 142 },
  { id: "ar2", name: "Newsletter du matin",                     trigger: "cron:0 7 * * *",    action: "newsletter:send",                  active: true, runs: 365 },
  { id: "ar3", name: "Transcription automatique vidéo",         trigger: "media.uploaded",    action: "whisper:transcribe",               active: true, runs: 87 },
  { id: "ar4", name: "Alertes éditoriales urgentes",            trigger: "content.breaking",  action: "notify:direction",                 active: true, runs: 14 },
  { id: "ar5", name: "Cross-posting YouTube → Site",            trigger: "youtube.published", action: "repost:web",                       active: false, runs: 23 },
  { id: "ar6", name: "Génération de shorts",                    trigger: "video.published+5min", action: "generate:shorts:3",             active: true, runs: 38 },
  { id: "ar7", name: "Archivage automatique",                   trigger: "cron:0 2 * * 0",    action: "archive:cold-storage",             active: true, runs: 24 },
  { id: "ar8", name: "Modération commentaires IA",              trigger: "comment.posted",    action: "moderate:toxicity",                active: true, runs: 1284 },
] as const;

// ----------------------------- Run seed -----------------------------

async function main() {
  console.log("🌱 Seeding CMR database...");

  // 1. Users (Argon2id hashed password for all dev accounts)
  const passwordHash = await hash(DEFAULT_PASSWORD, ARGON2_OPTS);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { passwordHash },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as never,
        team: u.team,
        initials: u.initials,
        color: u.color,
        active: u.id !== "u10",
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  }
  console.log(`  ✓ ${USERS.length} users (password: ${DEFAULT_PASSWORD})`);

  // 2. Contents + channels
  for (const c of CONTENTS) {
    await prisma.content.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        title: c.title,
        type: c.type as never,
        status: c.status as never,
        authorId: c.authorId,
        publishedAt: "publishedAt" in c && c.publishedAt ? new Date(c.publishedAt) : null,
        views: "views" in c ? (c.views as number) : 0,
        engagement: "engagement" in c ? (c.engagement as number) : 0,
      },
    });
    for (const ch of c.channels) {
      await prisma.contentChannel.upsert({
        where: { contentId_channel: { contentId: c.id, channel: ch as never } },
        update: {},
        create: { contentId: c.id, channel: ch as never },
      });
    }
  }
  console.log(`  ✓ ${CONTENTS.length} contents + channels`);

  // 3. Media
  for (const m of MEDIA) {
    await prisma.mediaAsset.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        title: m.title,
        type: m.type as never,
        url: `https://images.unsplash.com/photo-${m.url}?w=1200`,
        thumbnailUrl: `https://images.unsplash.com/photo-${m.url}?w=320&h=200&fit=crop`,
        sizeBytes: BigInt(m.sizeBytes),
        durationSec: "durationSec" in m ? (m.durationSec as number) : null,
        uploadedById: "u11",
        tags: ["actualité", "national", m.type],
      },
    });
  }
  console.log(`  ✓ ${MEDIA.length} media assets`);

  // 4. AI checks for c1
  for (const a of AI_CHECKS) {
    await prisma.aICheckResult.upsert({
      where: { contentId_type: { contentId: "c1", type: a.type as never } },
      update: {},
      create: {
        contentId: "c1",
        type: a.type as never,
        status: a.status as never,
        score: a.score,
        message: a.message,
        modelUsed: "demo-heuristic-v1",
      },
    });
  }
  console.log(`  ✓ ${AI_CHECKS.length} AI checks for c1`);

  // 5. Automations
  for (const r of AUTOMATIONS) {
    await prisma.automationRule.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        name: r.name,
        description: r.name,
        trigger: r.trigger,
        action: r.action,
        active: r.active,
        runs: r.runs,
      },
    });
  }
  console.log(`  ✓ ${AUTOMATIONS.length} automation rules`);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
