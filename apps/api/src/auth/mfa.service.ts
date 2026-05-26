import { Injectable, UnauthorizedException } from "@nestjs/common";
import { TOTP, Secret } from "otpauth";
import * as QRCode from "qrcode";
import { randomBytes, createHash } from "crypto";
import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import { PrismaService } from "../prisma/prisma.service";

const ISSUER = process.env.MFA_ISSUER ?? "CMR · MEDIA-IA";
const BACKUP_CODE_COUNT = 10;
const ARGON2_OPTS = { memoryCost: 65536, timeCost: 3, parallelism: 4 } as const;

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  private buildTotp(secret: string, label: string): TOTP {
    return new TOTP({
      issuer: ISSUER,
      label,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    });
  }

  /**
   * Étape 1 : génère un secret TOTP + QR code dataURL.
   * Le secret est PROVISOIRE — `mfaEnabled` reste false jusqu'au premier verify réussi.
   */
  async setup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const secret = new Secret({ size: 20 }).base32;
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: false },
    });
    const totp = this.buildTotp(secret, user.email);
    const uri = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(uri, { width: 256 });
    return { secret, uri, qrDataUrl };
  }

  /**
   * Étape 2 : verify le 6-digit code → active MFA + génère 10 backup codes (one-time).
   * Retourne les backup codes EN CLAIR (à présenter à l'utilisateur — non-stockés en clair).
   */
  async activate(userId: string, code: string): Promise<{ ok: true; backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new UnauthorizedException("MFA setup required first");
    const totp = this.buildTotp(user.mfaSecret, user.email);
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) throw new UnauthorizedException("Code TOTP invalide");

    const backupCodes: string[] = [];
    const hashes: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const plain = randomBytes(5).toString("hex").toUpperCase(); // 10-char hex
      backupCodes.push(plain.match(/.{1,5}/g)!.join("-")); // XXXXX-XXXXX
      hashes.push(await argon2Hash(plain, ARGON2_OPTS));
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaEnabledAt: new Date(), mfaBackupCodes: hashes },
    });
    return { ok: true, backupCodes };
  }

  /**
   * Verify TOTP au login (étape 2 du login). Accepte aussi backup codes (one-time).
   */
  async verifyAtLogin(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled || !user.mfaSecret) return true; // MFA not enabled

    const cleaned = code.replace(/[-\s]/g, "").toUpperCase();
    // 1) TOTP
    if (/^\d{6}$/.test(cleaned)) {
      const totp = this.buildTotp(user.mfaSecret, user.email);
      const delta = totp.validate({ token: cleaned, window: 1 });
      if (delta !== null) return true;
    }
    // 2) Backup code
    if (/^[0-9A-F]{10}$/.test(cleaned)) {
      for (let i = 0; i < user.mfaBackupCodes.length; i++) {
        const ok = await argon2Verify(user.mfaBackupCodes[i]!, cleaned).catch(() => false);
        if (ok) {
          // burn the code (one-time)
          const remaining = [...user.mfaBackupCodes];
          remaining.splice(i, 1);
          await this.prisma.user.update({
            where: { id: userId },
            data: { mfaBackupCodes: remaining },
          });
          return true;
        }
      }
    }
    return false;
  }

  async disable(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [], mfaEnabledAt: null },
    });
    return { ok: true };
  }

  /**
   * Helper public utilitaire : hash SHA-256 pour les refresh tokens (rapide, indexable).
   */
  static sha256(input: string): string {
    return createHash("sha256").update(input).digest("hex");
  }
}
