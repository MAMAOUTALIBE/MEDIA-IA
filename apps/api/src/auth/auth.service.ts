import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { users } from "../mocks/data";

/**
 * Auth simplifié pour la démo :
 *   - mots de passe en clair (un seul mot de passe partagé `cmr2025`)
 *   - JWT signé avec un secret env, expire en 8h
 * À remplacer Phase 1 par bcrypt + table User en DB.
 */
const SHARED_PASSWORD = "cmr2025";

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    if (password !== SHARED_PASSWORD) {
      throw new UnauthorizedException("Mot de passe invalide");
    }
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new UnauthorizedException("Compte introuvable");
    if (!user.active) throw new UnauthorizedException("Compte désactivé");

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

  meFromPayload(payload: JwtPayload) {
    const user = users.find((u) => u.id === payload.sub);
    if (!user) throw new UnauthorizedException("Compte supprimé");
    return user;
  }
}
