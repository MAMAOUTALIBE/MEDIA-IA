import { Injectable, UnauthorizedException, Optional } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verify as argon2Verify } from "@node-rs/argon2";
import { PrismaService } from "../prisma/prisma.service";
import { MfaService } from "./mfa.service";
import { SessionsService } from "./sessions.service";
import { AuditService } from "../audit/audit.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
}

export type MfaChallengePayload = {
  type: "mfa_challenge";
  sub: string;
  iat: number;
  exp: number;
};

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60 * 8);
const MFA_CHALLENGE_TTL_SECONDS = 5 * 60; // 5 min

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly mfa: MfaService,
    private readonly sessions: SessionsService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  private async safeAudit(input: Parameters<AuditService["log"]>[0]) {
    try {
      await this.audit?.log(input);
    } catch {
      // never fail a login because of audit
    }
  }

  /**
   * Étape 1 du login : credentials.
   * - Si pas de MFA activé → délivre access JWT + refresh token directement.
   * - Si MFA activé → délivre un `mfa_challenge` short-lived (5 min, type=mfa_challenge)
   *   et le client doit POST /auth/mfa/verify pour échanger contre l'access token.
   */
  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" }, deletedAt: null },
    });
    if (!user || !user.passwordHash) {
      await this.safeAudit({
        action: "failed_login",
        target: normalizedEmail,
        severity: "warning",
        status: "failure",
        ip,
        userAgent,
        metadata: { reason: "unknown_email" },
      });
      throw new UnauthorizedException("Identifiants invalides");
    }
    if (!user.active) {
      await this.safeAudit({
        action: "failed_login",
        target: normalizedEmail,
        severity: "warning",
        status: "failure",
        actorId: user.id,
        ip,
        userAgent,
        metadata: { reason: "account_disabled" },
      });
      throw new UnauthorizedException("Compte désactivé");
    }
    const ok = await argon2Verify(user.passwordHash, password).catch(() => false);
    if (!ok) {
      await this.safeAudit({
        action: "failed_login",
        target: normalizedEmail,
        severity: "warning",
        status: "failure",
        actorId: user.id,
        ip,
        userAgent,
        metadata: { reason: "bad_password" },
      });
      throw new UnauthorizedException("Identifiants invalides");
    }

    if (user.mfaEnabled) {
      const challenge = await this.jwt.signAsync(
        { type: "mfa_challenge", sub: user.id },
        { expiresIn: MFA_CHALLENGE_TTL_SECONDS },
      );
      await this.safeAudit({
        action: "login",
        target: user.email,
        severity: "info",
        actorId: user.id,
        ip,
        userAgent,
        metadata: { step: "mfa_challenge_issued" },
      });
      return { mfaRequired: true, mfaChallenge: challenge };
    }
    await this.safeAudit({
      action: "login",
      target: user.email,
      severity: "info",
      actorId: user.id,
      ip,
      userAgent,
    });
    return this.completeLogin(user, ip, userAgent);
  }

  /**
   * Étape 2 du login si MFA : verify challenge + code TOTP/backup.
   */
  async mfaVerify(challenge: string, code: string, ip?: string, userAgent?: string) {
    let payload: MfaChallengePayload;
    try {
      payload = await this.jwt.verifyAsync<MfaChallengePayload>(challenge);
    } catch {
      throw new UnauthorizedException("Challenge MFA invalide ou expiré");
    }
    if (payload.type !== "mfa_challenge") {
      throw new UnauthorizedException("Type de token invalide");
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) throw new UnauthorizedException("Compte invalide");
    const ok = await this.mfa.verifyAtLogin(user.id, code);
    if (!ok) throw new UnauthorizedException("Code MFA invalide");
    return this.completeLogin(user, ip, userAgent);
  }

  private async completeLogin(
    user: { id: string; email: string; role: string; name: string; team: string | null; initials: string; color: string },
    ip?: string,
    userAgent?: string,
  ) {
    const access = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, name: user.name } satisfies JwtPayload,
    );
    const { refreshToken } = await this.sessions.issue(user.id, ip, userAgent);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
    return {
      token: access,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        team: user.team,
        initials: user.initials,
        color: user.color,
      },
    };
  }

  /**
   * Refresh : valide le refresh-token et émet un nouvel access JWT (refresh inchangé).
   * Rotation : optionnel (à activer en cas de soupçon — voir SessionsService.revoke).
   */
  async refresh(refreshToken: string) {
    const session = await this.sessions.validate(refreshToken);
    const u = session.user;
    const access = await this.jwt.signAsync(
      { sub: u.id, email: u.email, role: u.role, name: u.name } satisfies JwtPayload,
    );
    return { token: access, accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  async logout(refreshToken?: string, actorId?: string) {
    if (refreshToken) await this.sessions.revoke(refreshToken);
    await this.safeAudit({
      action: "logout",
      target: actorId ?? "anonymous",
      severity: "info",
      actorId: actorId ?? null,
    });
    return { ok: true };
  }

  async verify(token: string): Promise<JwtPayload> {
    try {
      const p = await this.jwt.verifyAsync<JwtPayload | MfaChallengePayload>(token);
      if ((p as MfaChallengePayload).type === "mfa_challenge") {
        throw new UnauthorizedException("MFA challenge token cannot be used as access token");
      }
      return p as JwtPayload;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("Token invalide ou expiré");
    }
  }

  async meFromPayload(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt) throw new UnauthorizedException("Compte supprimé");
    return user;
  }
}
