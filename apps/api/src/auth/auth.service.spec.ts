import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { JwtService } from "@nestjs/jwt";
import { hash as argon2Hash } from "@node-rs/argon2";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Tests d'intégration avec une vraie connexion Prisma sur la base cmr_test.
 * Pré-requis : container `cmr-pg` démarré et migration appliquée.
 * Le test cible des comptes éphémères préfixés `test-`.
 */

const ARGON2_OPTS = { memoryCost: 65536, timeCost: 3, parallelism: 4 } as const;
const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!;

describe("AuthService (integration)", () => {
  let svc: AuthService;
  let jwt: JwtService;
  let prisma: PrismaService;
  const TEST_PWD = "Spec-Pwd-1234!";

  beforeAll(async () => {
    jwt = new JwtService({
      secret: "test-secret-for-vitest-min-32-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaa",
      signOptions: { expiresIn: 3600, algorithm: "HS512" },
    });
    prisma = new PrismaService({ datasources: { db: { url: TEST_DB_URL } } } as never);
    await prisma.$connect();
    svc = new AuthService(jwt, prisma);

    // Apply migrations against test DB by reusing the dev schema's structure.
    // We seed three accounts directly with raw upserts so the test is fast.
    const passwordHash = await argon2Hash(TEST_PWD, ARGON2_OPTS);
    for (const u of [
      { id: "test-admin", email: "test.admin@cmr.tv", name: "Test Admin", role: "admin" as const, active: true },
      { id: "test-journo", email: "test.journo@cmr.tv", name: "Test Journo", role: "journalist" as const, active: true },
      { id: "test-disabled", email: "test.disabled@cmr.tv", name: "Test Disabled", role: "journalist" as const, active: false },
    ]) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: { passwordHash, active: u.active },
        create: {
          ...u,
          passwordHash,
          initials: u.name.split(" ").map((p) => p[0]).join("").slice(0, 2),
          color: "#888888",
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { startsWith: "test-" } } });
    await prisma.$disconnect();
  });

  describe("login()", () => {
    it("réussit avec credentials valides", async () => {
      const r = await svc.login("test.admin@cmr.tv", TEST_PWD);
      expect(r.token).toBeTruthy();
      expect(r.user.email).toBe("test.admin@cmr.tv");
      expect(r.user.role).toBe("admin");
    });

    it("réussit avec email en majuscules (normalisation)", async () => {
      const r = await svc.login("TEST.ADMIN@cmr.tv", TEST_PWD);
      expect(r.user.id).toBe("test-admin");
    });

    it("rejette un mauvais mot de passe", async () => {
      await expect(svc.login("test.admin@cmr.tv", "wrong")).rejects.toThrow(
        /Identifiants invalides/,
      );
    });

    it("rejette un email inconnu (message générique anti-énumération)", async () => {
      await expect(svc.login("ghost@nowhere.com", TEST_PWD)).rejects.toThrow(
        /Identifiants invalides/,
      );
    });

    it("rejette un compte désactivé", async () => {
      await expect(svc.login("test.disabled@cmr.tv", TEST_PWD)).rejects.toThrow(
        /Compte désactivé/,
      );
    });
  });

  describe("verify()", () => {
    it("décode un JWT valide émis par login", async () => {
      const { token } = await svc.login("test.admin@cmr.tv", TEST_PWD);
      const payload = await svc.verify(token);
      expect(payload.sub).toBe("test-admin");
      expect(payload.role).toBe("admin");
      expect(payload.email).toBe("test.admin@cmr.tv");
    });

    it("rejette un token forgé", async () => {
      await expect(svc.verify("not.a.valid.jwt")).rejects.toThrow(/Token invalide/);
    });

    it("rejette un token signé avec une autre clé", async () => {
      const otherJwt = new JwtService({
        secret: "different-secret-min-32-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        signOptions: { expiresIn: 3600, algorithm: "HS512" },
      });
      const evil = await otherJwt.signAsync({ sub: "test-admin", email: "x", role: "admin", name: "x" });
      await expect(svc.verify(evil)).rejects.toThrow(/Token invalide/);
    });
  });
});
