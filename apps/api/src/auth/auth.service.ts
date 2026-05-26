import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verify as argon2Verify } from "@node-rs/argon2";
import { PrismaService } from "../prisma/prisma.service";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  name: string;
}

/**
 * Auth Sprint 0 baseline (ADR-006) :
 *   - mots de passe hashés Argon2id (côté seed, paramètres OWASP)
 *   - vérification par @node-rs/argon2 (pur Rust, pas de native deps fragiles)
 *   - JWT HS512 signé avec JWT_SECRET (≥64 chars), exp 8h
 *   - aucune fallback en clair
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" }, deletedAt: null },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Identifiants invalides");
    }
    if (!user.active) {
      throw new UnauthorizedException("Compte désactivé");
    }
    const ok = await argon2Verify(user.passwordHash, password).catch(() => false);
    if (!ok) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = await this.jwt.signAsync(payload);
    return {
      token,
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

  async verify(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Token invalide ou expiré");
    }
  }

  async meFromPayload(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Compte supprimé");
    }
    return user;
  }
}
