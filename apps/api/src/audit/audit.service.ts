import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { AuditAction, AuditSeverity } from "@prisma/client";

export type AuditInput = {
  action: AuditAction;
  target: string;
  severity?: AuditSeverity;
  status?: "success" | "failure";
  actorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

/**
 * Audit chaîné — chaque entry stocke SHA-256(prevChecksum || JSON(record))
 * pour rendre la chaîne d'audit cryptographiquement vérifiable (ADR-006).
 *
 * Vérification : itérer en ordre `at ASC` et recalculer le checksum.
 * Toute altération a posteriori casse la chaîne.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput) {
    const last = await this.prisma.auditEvent.findFirst({
      orderBy: { at: "desc" },
      select: { checksumSha256: true },
    });
    const prevChecksum = last?.checksumSha256 ?? "GENESIS";
    const canonicalPayload = {
      action: input.action,
      target: input.target,
      severity: input.severity ?? "info",
      status: input.status ?? "success",
      actorId: input.actorId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? null,
    };
    const canonical = JSON.stringify(canonicalPayload) + "|" + prevChecksum;
    const checksumSha256 = createHash("sha256").update(canonical).digest("hex");
    return this.prisma.auditEvent.create({
      data: {
        action: input.action,
        target: input.target,
        severity: input.severity ?? "info",
        status: input.status ?? "success",
        actorId: input.actorId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
        checksumSha256,
      },
    });
  }

  /**
   * Vérifie la chaîne complète. Retourne le 1er event corrompu ou null si OK.
   */
  async verifyChain(): Promise<{ valid: boolean; brokenAt: string | null }> {
    const events = await this.prisma.auditEvent.findMany({
      orderBy: { at: "asc" },
      select: {
        id: true,
        action: true,
        target: true,
        severity: true,
        status: true,
        actorId: true,
        ip: true,
        userAgent: true,
        metadata: true,
        checksumSha256: true,
      },
    });
    let prev = "GENESIS";
    for (const e of events) {
      const payload = {
        action: e.action,
        target: e.target,
        severity: e.severity,
        status: e.status,
        actorId: e.actorId,
        ip: e.ip,
        userAgent: e.userAgent,
        metadata: e.metadata ?? null,
      };
      const canonical = JSON.stringify(payload) + "|" + prev;
      const expected = createHash("sha256").update(canonical).digest("hex");
      if (expected !== e.checksumSha256) {
        return { valid: false, brokenAt: e.id };
      }
      prev = e.checksumSha256;
    }
    return { valid: true, brokenAt: null };
  }
}
