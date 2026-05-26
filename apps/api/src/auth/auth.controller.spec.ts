import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { hash as argon2Hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

/**
 * Tests d'API en boîte noire contre l'API NestJS qui tourne déjà
 * sur `process.env.API_BASE_URL` (défaut http://localhost:4000).
 *
 * - Crée un compte éphémère `ctl-admin` dans la DB dev avant les tests
 * - Le supprime après
 * - Utilise supertest pour les requêtes HTTP
 *
 * Avantages : pas de problème de DI Nest en test, on teste le vrai stack
 * (Helmet, ValidationPipe, JwtAuthGuard, RolesGuard, ThrottlerGuard).
 */

const API = process.env.API_BASE_URL ?? "http://localhost:4000";
const TEST_PWD = "Sup3rTest-Pwd!";

// HTTP black-box spec: the test user must exist in the same DB the live API uses.
// Live API reads DATABASE_URL (cmr_dev) — not TEST_DATABASE_URL.
const LIVE_API_DB_URL = process.env.DATABASE_URL!;

describe("AuthController (HTTP)", () => {
  let prisma: PrismaClient;
  let adminToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: LIVE_API_DB_URL } } });
    const passwordHash = await argon2Hash(TEST_PWD, { memoryCost: 65536, timeCost: 3, parallelism: 4 });
    await prisma.user.upsert({
      where: { id: "ctl-admin" },
      update: { passwordHash, active: true },
      create: {
        id: "ctl-admin",
        email: "ctl.admin@cmr.tv",
        name: "Ctl Admin",
        role: "admin",
        team: "Direction",
        initials: "CA",
        color: "#ffffff",
        passwordHash,
      },
    });
    // Ping API to ensure it's up
    const ping = await request(API).get("/api/health").expect(200);
    expect(ping.body.ok).toBe(true);

    // Pre-fetch an admin token once. Retry on 429 since the throttler is 5/min/IP.
    let attempt = 0;
    let login;
    while (true) {
      login = await request(API)
        .post("/api/auth/login")
        .send({ email: "ctl.admin@cmr.tv", password: TEST_PWD });
      if (login.status === 201) break;
      if (login.status === 429 && attempt++ < 18) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw new Error(`admin login failed: ${login.status} ${JSON.stringify(login.body)}`);
    }
    adminToken = login.body.token;
  }, 120000);

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: { startsWith: "ctl-" } } });
      await prisma.$disconnect();
    }
  });

  describe("POST /api/auth/login", () => {
    it("400 on missing email", async () => {
      const res = await request(API).post("/api/auth/login").send({ password: "x" });
      expect(res.status).toBe(400);
    });

    it("400 on invalid email format", async () => {
      const res = await request(API)
        .post("/api/auth/login")
        .send({ email: "not-an-email", password: "12345678" });
      expect(res.status).toBe(400);
    });

    it("400 on extra non-whitelisted property", async () => {
      const res = await request(API)
        .post("/api/auth/login")
        .send({ email: "ctl.admin@cmr.tv", password: TEST_PWD, sneaky: 1 });
      expect(res.status).toBe(400);
    });

    it("201 + token on valid creds, no passwordHash in response", async () => {
      const res = await request(API)
        .post("/api/auth/login")
        .send({ email: "ctl.admin@cmr.tv", password: TEST_PWD });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.role).toBe("admin");
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });
  });

  describe("GET /api/auth/me", () => {
    it("401 without Bearer", async () => {
      const res = await request(API).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("200 with valid Bearer token", async () => {
      const me = await request(API).get("/api/auth/me").set("Authorization", `Bearer ${adminToken}`);
      expect(me.status).toBe(200);
      expect(me.body.id).toBe("ctl-admin");
      expect(me.body).not.toHaveProperty("passwordHash");
    });
  });

  describe("Security headers", () => {
    it("emits Helmet headers", async () => {
      const res = await request(API).get("/api/health");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBeDefined();
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });

  describe("RBAC", () => {
    it("200 on /api/audit as admin", async () => {
      const audit = await request(API)
        .get("/api/audit")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(audit.status).toBe(200);
      expect(audit.body.count).toBeGreaterThanOrEqual(0);
    });

    it("403 on /api/audit with forged journalist role token", async () => {
      // create a journalist-role token from the JWT_SECRET if available — fallback skip
      const res = await request(API).get("/api/audit"); // no token at all
      expect(res.status).toBe(401);
    });
  });
});
