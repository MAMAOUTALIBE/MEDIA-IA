import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

const TAGGING_LOCK_TTL_MINUTES = 2;

@Injectable()
export class ContentsService {
  private readonly logger = new Logger(ContentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Atomically claim a draft for tagging. Only one caller wins the race —
   * subsequent claims within the TTL get 409. Once the TTL elapses, the lock
   * is considered stale and reclaimable (covers crashes that left a lock).
   *
   * Logged to the audit chain so a hanging n8n worker leaves a trace.
   */
  async claimForTagging(
    contentId: string,
    opts: { ip?: string | null; userAgent?: string | null } = {},
  ) {
    const ttlMinutes = TAGGING_LOCK_TTL_MINUTES;
    // Single round-trip atomic UPDATE: the WHERE clause is the lock guard.
    // Returns rows affected; 0 = somebody else holds a fresh lock.
    const affected = await this.prisma.$executeRaw`
      UPDATE "Content"
      SET "taggingStartedAt" = NOW()
      WHERE "id" = ${contentId}
        AND "status" = 'draft'::"ContentStatus"
        AND "deletedAt" IS NULL
        AND (
          "taggingStartedAt" IS NULL
          OR "taggingStartedAt" < NOW() - (${ttlMinutes}::int * INTERVAL '1 minute')
        )
    `;

    if (affected === 0) {
      // Diagnose the precise reason so the n8n worker can decide whether to
      // skip silently (already locked) or alert (gone).
      const existing = await this.prisma.content.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          status: true,
          taggingStartedAt: true,
          deletedAt: true,
        },
      });
      if (!existing || existing.deletedAt) {
        throw new NotFoundException(`Content ${contentId} not found`);
      }
      if (existing.status !== "draft") {
        throw new ConflictException(
          `Content ${contentId} is not a draft (status=${existing.status})`,
        );
      }
      throw new ConflictException(
        `Content ${contentId} is being tagged by another run (locked at ${existing.taggingStartedAt?.toISOString()})`,
      );
    }

    await this.audit.log({
      action: "automation_run",
      target: `content:${contentId}`,
      severity: "info",
      status: "success",
      ip: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
      metadata: {
        event: "tagging_claimed",
        ttlMinutes,
      },
    });

    const claimedAt = new Date();
    return {
      contentId,
      claimedAt: claimedAt.toISOString(),
      expiresAt: new Date(
        claimedAt.getTime() + ttlMinutes * 60_000,
      ).toISOString(),
      ttlSeconds: ttlMinutes * 60,
    };
  }

  /**
   * Pose tags + summary sur un Content. Restreint à service_automation
   * via @ExactRoles sur le controller. Idempotent : si le content a déjà
   * des tags non vides ET que l'appel veut en poser, on n'écrase pas —
   * garde-fou défensif contre une race avec un éditeur humain.
   *
   * Libère atomiquement le lock posé par claimForTagging dans le même UPDATE
   * pour qu'un crash entre les deux ne laisse pas un lock orphelin (le TTL
   * de 2 min couvre déjà ce cas, mais autant éviter le délai inutile).
   */
  async applyAutoTags(
    id: string,
    dto: { tags?: string[]; summary?: string },
  ) {
    const existing = await this.prisma.content.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Content ${id} not found`);
    }
    if (existing.tags?.length && dto.tags?.length) {
      // Human editor or earlier run already tagged — drop the lock and bail.
      if (existing.taggingStartedAt) {
        await this.prisma.content.update({
          where: { id },
          data: { taggingStartedAt: null },
        });
      }
      return existing;
    }
    const data: Prisma.ContentUpdateInput = {
      taggingStartedAt: null,
    };
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.summary !== undefined) data.summary = dto.summary;
    return this.prisma.content.update({
      where: { id },
      data,
    });
  }
}
