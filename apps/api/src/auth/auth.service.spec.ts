import { describe, expect, it, beforeAll } from "vitest";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let svc: AuthService;
  let jwt: JwtService;

  beforeAll(() => {
    jwt = new JwtService({
      secret: "test-secret-for-vitest-only",
      signOptions: { expiresIn: 3600 },
    });
    svc = new AuthService(jwt);
  });

  describe("login()", () => {
    it("réussit avec credentials valides", async () => {
      const r = await svc.login("e.rousseau@cmr.tv", "cmr2025");
      expect(r.token).toBeTruthy();
      expect(r.user.email).toBe("e.rousseau@cmr.tv");
      expect(r.user.role).toBe("admin");
    });

    it("rejette un mauvais mot de passe", async () => {
      await expect(svc.login("e.rousseau@cmr.tv", "wrong")).rejects.toThrow(
        /Mot de passe invalide/,
      );
    });

    it("rejette un email inconnu", async () => {
      await expect(svc.login("ghost@nowhere.com", "cmr2025")).rejects.toThrow(
        /Compte introuvable/,
      );
    });

    it("rejette un compte désactivé (u10 Ibrahim Sow)", async () => {
      await expect(svc.login("i.sow@cmr.tv", "cmr2025")).rejects.toThrow(
        /Compte désactivé/,
      );
    });
  });

  describe("verify()", () => {
    it("décode un JWT valide émis par login", async () => {
      const { token } = await svc.login("e.rousseau@cmr.tv", "cmr2025");
      const payload = await svc.verify(token);
      expect(payload.sub).toBe("u11");
      expect(payload.role).toBe("admin");
      expect(payload.email).toBe("e.rousseau@cmr.tv");
    });

    it("rejette un token forgé", async () => {
      await expect(svc.verify("not.a.valid.jwt")).rejects.toThrow(
        /Token invalide/,
      );
    });
  });
});
