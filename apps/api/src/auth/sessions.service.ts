import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MfaService } from "./mfa.service";

const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une session — génère un refresh-token opaque (256 bits) en clair (renvoyé au client)
   * + stocke uniquement son hash SHA-256 en DB (jamais le token en clair).
   */
  async issue(userId: string, ip?: string, userAgent?: string) {
    const plain = randomBytes(48).toString("base64url");
    const refreshTokenHash = MfaService.sha256(plain);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    const session = await this.prisma.session.create({
      data: { userId, refreshTokenHash, ip, userAgent, expiresAt, lastUsedAt: new Date() },
    });
    return { refreshToken: plain, sessionId: session.id, expiresAt };
  }

  /**
   * Vérifie un refresh-token : trouve par hash, vérifie expiration et non-révocation.
   * Si OK, met à jour `lastUsedAt`.
   */
  async validate(refreshToken: string) {
    const hash = MfaService.sha256(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException("Session inconnue");
    if (session.revokedAt) throw new UnauthorizedException("Session révoquée");
    if (session.expiresAt < new Date()) throw new UnauthorizedException("Session expirée");
    if (!session.user.active || session.user.deletedAt) {
      throw new UnauthorizedException("Compte désactivé");
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
    return session;
  }

  /**
   * Révoque une session (logout).
   */
  async revoke(refreshToken: string) {
    const hash = MfaService.sha256(refreshToken);
    await this.prisma.session
      .updateMany({
        where: { refreshTokenHash: hash, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => null);
    return { ok: true };
  }

  /**
   * Révoque toutes les sessions actives d'un utilisateur (password change, breach).
   */
  async revokeAllForUser(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}
