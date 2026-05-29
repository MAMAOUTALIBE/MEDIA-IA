import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Content, ContentType, ChannelKey } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

const TAGGING_LOCK_TTL_MINUTES = 2;

const RANK: Record<string, number> = {
  journalist: 1,
  community_manager: 1,
  editor: 2,
  chief: 3,
  direction: 4,
  admin: 5,
};

function isEditorOrAbove(role: string): boolean {
  return (RANK[role] ?? 0) >= RANK.editor;
}

@Injectable()
export class ContentsService {
  private readonly logger = new Logger(ContentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Sprint A — Atomically claim a draft for tagging. Only one caller wins the
   * race — subsequent claims within the TTL get 409. Once the TTL elapses, the
   * lock is considered stale and reclaimable.
   */
  async claimForTagging(
    contentId: string,
    opts: { ip?: string | null; userAgent?: string | null } = {},
  ) {
    const ttlMinutes = TAGGING_LOCK_TTL_MINUTES;
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
      const existing = await this.prisma.content.findUnique({
        where: { id: contentId },
        select: { id: true, status: true, taggingStartedAt: true, deletedAt: true },
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
      metadata: { event: "tagging_claimed", ttlMinutes },
    });

    const claimedAt = new Date();
    return {
      contentId,
      claimedAt: claimedAt.toISOString(),
      expiresAt: new Date(claimedAt.getTime() + ttlMinutes * 60_000).toISOString(),
      ttlSeconds: ttlMinutes * 60,
    };
  }

  /**
   * Sprint 9 — n8n auto-tagging. Pose tags + summary, libère le lock.
   * Idempotent : si des tags humains existent déjà, on n'écrase pas.
   */
  async applyAutoTags(
    id: string,
    dto: { tags?: string[]; summary?: string },
  ) {
    const existing = await this.prisma.content.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Content ${id} not found`);
    if (existing.tags?.length && dto.tags?.length) {
      if (existing.taggingStartedAt) {
        await this.prisma.content.update({
          where: { id },
          data: { taggingStartedAt: null },
        });
      }
      return existing;
    }
    const data: Prisma.ContentUpdateInput = { taggingStartedAt: null };
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.summary !== undefined) data.summary = dto.summary;
    return this.prisma.content.update({ where: { id }, data });
  }

  // =========================================================================
  // Sprint RBAC — Ownership-aware CRUD pour journalistes
  // =========================================================================

  /**
   * Crée un brouillon. Le `authorId` est forcé depuis le JWT — un journaliste
   * ne peut pas créer un draft au nom de quelqu'un d'autre.
   *
   * Les channels passés en DTO sont créés via la relation ContentChannel.
   */
  async createDraft(
    authorId: string,
    dto: {
      title: string;
      body?: string;
      excerpt?: string;
      type: ContentType;
      channels?: ChannelKey[];
    },
    opts: { ip?: string | null; userAgent?: string | null } = {},
  ) {
    const created = await this.prisma.content.create({
      data: {
        title: dto.title,
        body: dto.body,
        excerpt: dto.excerpt,
        type: dto.type,
        status: "draft",
        authorId,
        ...(dto.channels?.length
          ? { channels: { create: dto.channels.map((channel) => ({ channel })) } }
          : {}),
      },
      include: { channels: { select: { channel: true } } },
    });
    await this.audit.log({
      action: "create_content",
      target: created.id,
      severity: "info",
      status: "success",
      actorId: authorId,
      ip: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
      metadata: { title: created.title, type: created.type },
    });
    return created;
  }

  /**
   * Édite un brouillon. Ownership : seul le journaliste auteur du draft OU un
   * rôle ≥ editor peut le modifier. Statut figé en `draft` (après soumission,
   * le contenu n'est plus éditable hors workflow).
   */
  async updateDraft(
    id: string,
    actorId: string,
    actorRole: string,
    dto: {
      title?: string;
      body?: string;
      excerpt?: string;
      channels?: ChannelKey[];
    },
  ) {
    const existing = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Content ${id} not found`);
    }
    this.assertCanWrite(existing, actorId, actorRole);
    if (existing.status !== "draft") {
      throw new ConflictException(
        `Content ${id} is not a draft (status=${existing.status}); use the workflow API to advance.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.channels !== undefined) {
        await tx.contentChannel.deleteMany({ where: { contentId: id } });
      }
      return tx.content.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.body !== undefined && { body: dto.body }),
          ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
          ...(dto.channels?.length
            ? { channels: { create: dto.channels.map((channel) => ({ channel })) } }
            : {}),
        },
        include: { channels: { select: { channel: true } } },
      });
    });
  }

  /**
   * Soumet le brouillon à la chaîne de validation. Crée la WorkflowInstance
   * initiale au step `submitted` et passe le content en `pending_editor`.
   * Seul le journaliste auteur (ou éditeur+) peut soumettre.
   */
  async submitForValidation(
    id: string,
    actorId: string,
    actorRole: string,
    opts: { ip?: string | null; userAgent?: string | null } = {},
  ) {
    const existing = await this.prisma.content.findUnique({
      where: { id },
      include: { workflowInstance: true },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Content ${id} not found`);
    }
    this.assertCanWrite(existing, actorId, actorRole);
    if (existing.status !== "draft") {
      throw new ConflictException(
        `Content ${id} is not a draft (status=${existing.status}); can't resubmit.`,
      );
    }
    if (existing.workflowInstance && !existing.workflowInstance.completedAt) {
      throw new ConflictException(
        `Content ${id} is already in workflow (instance=${existing.workflowInstance.id})`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.create({
        data: {
          contentId: id,
          submittedById: actorId,
          currentStep: "submitted",
        },
      });
      const updated = await tx.content.update({
        where: { id },
        data: { status: "pending_editor" },
      });
      return { instance, content: updated };
    });

    await this.audit.log({
      action: "update_content",
      target: id,
      severity: "info",
      status: "success",
      actorId,
      ip: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
      metadata: { event: "submitted_for_validation", workflowInstanceId: result.instance.id },
    });
    return result;
  }

  /**
   * Soft-delete. Réservé aux éditeurs+ via le décorateur Controller, mais on
   * vérifie aussi côté service pour la profondeur.
   */
  async softDelete(
    id: string,
    actorId: string,
    actorRole: string,
    opts: { ip?: string | null; userAgent?: string | null } = {},
  ) {
    if (!isEditorOrAbove(actorRole)) {
      throw new ForbiddenException(`Rôle '${actorRole}' insuffisant pour supprimer un contenu`);
    }
    const existing = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Content ${id} not found`);
    }
    const updated = await this.prisma.content.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      action: "delete_content",
      target: id,
      severity: "warning",
      status: "success",
      actorId,
      ip: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
    });
    return updated;
  }

  /**
   * Filtre la liste des contenus en fonction du rôle.
   * - editor+ : tout (sauf soft-deleted)
   * - journalist / community_manager : leurs propres drafts + tous les
   *   contenus publiés (qu'ils ont droit de consulter pour le contexte
   *   rédactionnel)
   */
  buildListFilter(
    actorId: string,
    actorRole: string,
  ): Prisma.ContentWhereInput {
    if (isEditorOrAbove(actorRole)) {
      return { deletedAt: null };
    }
    return {
      deletedAt: null,
      OR: [{ authorId: actorId }, { status: "published" }],
    };
  }

  // -------------------------------------------------------------------------
  // Helpers privés
  // -------------------------------------------------------------------------

  private assertCanWrite(
    content: Pick<Content, "authorId">,
    actorId: string,
    actorRole: string,
  ): void {
    if (content.authorId === actorId) return;
    if (isEditorOrAbove(actorRole)) return;
    throw new ForbiddenException(
      `Vous n'êtes ni auteur de ce contenu ni éditeur+`,
    );
  }
}
