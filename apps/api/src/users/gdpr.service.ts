import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

/**
 * GDPR "right to be forgotten" implementation.
 *
 * Important: we do NOT physically wipe rows that the audit chain depends on
 * for cryptographic integrity (AuditEvent.actorId, ContentChannel, etc.).
 * Instead, we:
 *   1. Persist a UserDeletionRequest with a snapshot of what's being purged.
 *   2. Pseudonymise the User row (email/name/initials/color replaced with
 *      deterministic placeholders, passwordHash + MFA secrets nulled).
 *   3. Sever active sessions + revoke refresh tokens.
 *   4. Soft-delete contents authored by the user (`deletedAt` set) so they
 *      drop from feeds but the audit trail remains anchored.
 *   5. Hard-delete notifications + comments authored by the user — these
 *      contain personal expression and aren't load-bearing for audit.
 *   6. Log a `gdpr_delete_executed` event in the audit chain.
 *
 * This implements ANSSI / CNIL guidance: "anonymisation when full erasure
 * would break the integrity of an immutable audit log".
 */
@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async requestDeletion(opts: {
    targetUserId: string;
    requestedByUserId: string;
    reason?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const target = await this.prisma.user.findUnique({ where: { id: opts.targetUserId } });
    if (!target) throw new NotFoundException(`User ${opts.targetUserId} not found`);

    const request = await this.prisma.userDeletionRequest.create({
      data: {
        targetUserId: opts.targetUserId,
        requestedById: opts.requestedByUserId,
        reason: opts.reason,
        status: "pending",
      },
    });

    await this.audit.log({
      actorId: opts.requestedByUserId,
      action: "gdpr_delete_request" as never,
      target: opts.targetUserId,
      severity: "warning",
      status: "success",
      ip: opts.ip,
      userAgent: opts.userAgent,
      metadata: { requestId: request.id, reason: opts.reason ?? null },
    });

    return request;
  }

  /**
   * Execute a pending request. Should be invoked by a separate admin with a
   * different account than the requester (4-eyes principle) — enforced at the
   * controller layer via @Roles + a runtime check on the request row.
   */
  async executeDeletion(opts: {
    requestId: string;
    executedByUserId: string;
    ip?: string;
    userAgent?: string;
  }) {
    const request = await this.prisma.userDeletionRequest.findUnique({
      where: { id: opts.requestId },
    });
    if (!request) throw new NotFoundException(`Deletion request ${opts.requestId} not found`);
    if (request.status !== "pending" && request.status !== "confirmed") {
      throw new ConflictException(`Request is ${request.status}, cannot execute`);
    }
    if (request.requestedById === opts.executedByUserId) {
      throw new BadRequestException(
        "Four-eyes principle: requester and executor must differ",
      );
    }

    const target = await this.prisma.user.findUnique({ where: { id: request.targetUserId } });
    if (!target) throw new NotFoundException(`Target user ${request.targetUserId} no longer exists`);

    const summary = await this.prisma.$transaction(async (tx) => {
      // 1. Revoke all sessions (sever active sign-ins).
      const sessions = await tx.session.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // 2. Hard-delete user-generated personal expression that isn't audit-load-bearing.
      const notifications = await tx.notification.deleteMany({ where: { userId: target.id } });
      const comments = await tx.comment.deleteMany({ where: { authorId: target.id } });

      // 3. Soft-delete authored contents so feeds stop showing them; the
      //    workflow + audit chain stays anchored.
      const contents = await tx.content.updateMany({
        where: { authorId: target.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // 4. Pseudonymise the user record. Email kept as a deterministic
      //    placeholder so unique constraints aren't violated.
      const placeholder = `redacted-${target.id}@gdpr.cmr.local`;
      await tx.user.update({
        where: { id: target.id },
        data: {
          email: placeholder,
          name: "(supprimé)",
          initials: "··",
          color: "#444444",
          team: null,
          passwordHash: null,
          mfaSecret: null,
          mfaEnabled: false,
          mfaBackupCodes: [],
          mfaEnabledAt: null,
          active: false,
          deletedAt: new Date(),
        },
      });

      // 5. Mark the request executed with a snapshot.
      const counts = {
        sessions: sessions.count,
        notifications: notifications.count,
        comments: comments.count,
        contents: contents.count,
      };
      await tx.userDeletionRequest.update({
        where: { id: request.id },
        data: {
          status: "executed",
          executedAt: new Date(),
          summary: counts,
        },
      });
      return counts;
    });

    await this.audit.log({
      actorId: opts.executedByUserId,
      action: "gdpr_delete_executed" as never,
      target: target.id,
      severity: "critical",
      status: "success",
      ip: opts.ip,
      userAgent: opts.userAgent,
      metadata: { requestId: request.id, summary },
    });

    this.logger.warn(`GDPR purge executed: user=${target.id}, request=${request.id}`);
    return { requestId: request.id, summary };
  }

  async listPending() {
    return this.prisma.userDeletionRequest.findMany({
      where: { status: { in: ["pending", "confirmed"] } },
      orderBy: { requestedAt: "desc" },
    });
  }

  async cancel(requestId: string, byUserId: string) {
    const request = await this.prisma.userDeletionRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Deletion request ${requestId} not found`);
    if (request.status === "executed") {
      throw new ConflictException("Cannot cancel an already-executed deletion");
    }
    await this.prisma.userDeletionRequest.update({
      where: { id: requestId },
      data: { status: "cancelled", executedAt: null },
    });
    await this.audit.log({
      actorId: byUserId,
      action: "permission_change" as never,
      target: request.targetUserId,
      severity: "info",
      status: "success",
      metadata: { event: "gdpr_request_cancelled", requestId },
    });
  }
}
