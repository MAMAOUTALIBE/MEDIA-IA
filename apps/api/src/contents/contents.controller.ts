import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsOptional, IsString, MaxLength } from "class-validator";
import type { Request } from "express";
import { ExactRoles, Roles } from "../auth/roles.decorator";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { ContentsService } from "./contents.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";
import { UpdateContentTagsDto } from "./dto/update-content-tags.dto";

class ValidateDto {
  @IsOptional() @IsString() @MaxLength(2000)
  comment?: string;
}
class RejectDto {
  @IsOptional() @IsString() @MaxLength(2000)
  reason?: string;
}

@ApiTags("contents")
@Controller("contents")
export class ContentsController {
  constructor(
    private readonly notifications: NotificationsGateway,
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowsService,
    private readonly contentsService: ContentsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Read endpoints
  // ---------------------------------------------------------------------------

  /**
   * Liste filtrée. Comportement RBAC :
   * - editor+ : voit tout (sauf soft-deleted)
   * - journalist / community_manager : voit ses propres contenus + tous les
   *   contenus publiés (lecture seule pour les autres)
   */
  /**
   * Recherche sémantique via pgvector + OpenAI embeddings. Si l'embedding
   * upstream est indispo, on tombe sur la recherche keyword classique.
   * Mêmes règles d'ownership que GET / : un journaliste voit ses drafts
   * + les publiés, un editor+ voit tout.
   */
  @Get("search")
  async search(
    @Req() req: Request,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
  ) {
    if (!req.user) throw new UnauthorizedException();
    if (!q || q.trim().length < 2) {
      return { count: 0, items: [], mode: "empty" };
    }
    const lim = Math.min(Number(limit ?? 20) || 20, 50);
    const semantic = await this.contentsService.searchSemantic(
      q,
      req.user.sub,
      req.user.role,
      { limit: lim },
    );
    if (semantic.length > 0) {
      return {
        count: semantic.length,
        items: semantic.map((c) => ({
          id: c.id,
          title: c.title,
          excerpt: c.excerpt,
          type: c.type,
          status: c.status,
          authorId: c.authorId,
          createdAt: c.createdAt,
          tags: c.tags,
          summary: c.summary,
          distance: c.distance,
        })),
        mode: "semantic" as const,
      };
    }
    // Fallback keyword
    const baseWhere = this.contentsService.buildListFilter(req.user.sub, req.user.role);
    const rows = await this.prisma.content.findMany({
      where: {
        ...baseWhere,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { excerpt: { contains: q, mode: "insensitive" } },
          { body: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: lim,
    });
    return {
      count: rows.length,
      items: rows,
      mode: "keyword" as const,
    };
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("q") q?: string,
  ) {
    if (!req.user) throw new UnauthorizedException();
    const baseWhere = this.contentsService.buildListFilter(req.user.sub, req.user.role);
    const rows = await this.prisma.content.findMany({
      where: {
        ...baseWhere,
        ...(status ? { status: status as never } : {}),
        ...(type ? { type: type as never } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { excerpt: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { channels: { select: { channel: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return {
      count: rows.length,
      items: rows.map((c) => ({
        ...c,
        channels: c.channels.map((ch) => ch.channel),
      })),
    };
  }

  @Get("pending")
  async pending() {
    const items = await this.workflows.listPending();
    return { count: items.length, items };
  }

  @Get(":id")
  async one(@Param("id") id: string, @Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    const c = await this.prisma.content.findFirst({
      where: { id, deletedAt: null },
      include: {
        channels: { select: { channel: true } },
        aiChecks: true,
        author: { select: { id: true, name: true, initials: true, color: true, role: true } },
        workflowInstance: {
          include: {
            actions: {
              include: { actor: { select: { id: true, name: true, role: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });
    if (!c) throw new NotFoundException(`Content ${id} not found`);
    // Enforce ownership-aware read : un journaliste ne peut pas voir le draft
    // d'un autre journaliste. Les contenus publiés restent visibles à tous.
    const rank = ranks[req.user.role] ?? 0;
    const isEditorOrAbove = rank >= ranks.editor;
    if (!isEditorOrAbove && c.authorId !== req.user.sub && c.status !== "published") {
      throw new NotFoundException(`Content ${id} not found`);
    }
    return { ...c, channels: c.channels.map((ch) => ch.channel) };
  }

  // ---------------------------------------------------------------------------
  // Sprint RBAC — Write endpoints pour journalistes (ownership-aware)
  // ---------------------------------------------------------------------------

  /**
   * Création d'un brouillon par n'importe quel rôle ≥ journalist. L'auteur
   * est forcé au sub du JWT (pas de spoofing possible).
   */
  @Roles("journalist")
  @Post()
  @ApiOperation({ summary: "Crée un brouillon dont l'auteur est le user courant" })
  @ApiResponse({ status: 201, description: "Brouillon créé" })
  async create(@Body() dto: CreateContentDto, @Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    return this.contentsService.createDraft(req.user.sub, dto, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  /**
   * Édition. Le journaliste peut modifier UNIQUEMENT son propre brouillon.
   * Un éditeur+ peut modifier n'importe quel brouillon (pour corriger).
   * Refusé une fois le statut > draft.
   */
  @Roles("journalist")
  @Patch(":id")
  @ApiOperation({ summary: "Met à jour un brouillon (auteur ou éditeur+) ; status doit être draft" })
  @ApiResponse({ status: 200, description: "Brouillon mis à jour" })
  @ApiResponse({ status: 403, description: "Pas auteur et pas éditeur+" })
  @ApiResponse({ status: 409, description: "Statut ≠ draft, soumettre via /submit" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateContentDto,
    @Req() req: Request,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.contentsService.updateDraft(id, req.user.sub, req.user.role, dto);
  }

  /**
   * Soumission à la chaîne de validation. Le content passe de `draft` à
   * `pending_editor` et une `WorkflowInstance` est créée.
   */
  @Roles("journalist")
  @Post(":id/submit")
  @HttpCode(200)
  @ApiOperation({ summary: "Soumet un brouillon à la chaîne de validation 4 niveaux" })
  @ApiResponse({ status: 200, description: "Soumis. WorkflowInstance créée." })
  @ApiResponse({ status: 409, description: "Pas un draft OU déjà soumis" })
  async submit(@Param("id") id: string, @Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    const result = await this.contentsService.submitForValidation(
      id,
      req.user.sub,
      req.user.role,
      { ip: req.ip, userAgent: req.headers["user-agent"] },
    );
    this.notifications.broadcast("content.submitted", {
      contentId: id,
      workflowInstanceId: result.instance.id,
      at: new Date().toISOString(),
    });
    return result;
  }

  /**
   * Soft-delete. Réservé aux éditeurs+. Un journaliste ne peut JAMAIS
   * supprimer un contenu, même son propre draft — pour conserver l'audit.
   */
  @Roles("editor")
  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Soft-delete (deletedAt). Réservé editor+, audit-loggé." })
  @ApiResponse({ status: 204, description: "Supprimé" })
  async remove(@Param("id") id: string, @Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    await this.contentsService.softDelete(id, req.user.sub, req.user.role, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  // ---------------------------------------------------------------------------
  // Existing : validate / reject (workflow step transitions)
  // ---------------------------------------------------------------------------

  @Roles("editor")
  @Post(":id/validate")
  async validate(@Param("id") id: string, @Body() body: ValidateDto, @Req() req: Request) {
    if (!req.user) throw new Error("guard misconfigured");
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { contentId: id },
    });
    if (!instance) throw new NotFoundException(`Workflow for content ${id} not found`);
    const result = await this.workflows.advance(
      instance.id,
      req.user.sub,
      req.user.role,
      "approve",
      body.comment,
      req.ip,
      req.headers["user-agent"],
    );
    this.notifications.broadcast("content.validated", {
      contentId: id,
      workflowInstanceId: instance.id,
      newStep: result.toStep,
      signatureHash: result.signatureHash,
      at: new Date().toISOString(),
    });
    return result;
  }

  @Roles("editor")
  @Post(":id/reject")
  async reject(@Param("id") id: string, @Body() body: RejectDto, @Req() req: Request) {
    if (!req.user) throw new Error("guard misconfigured");
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { contentId: id },
    });
    if (!instance) throw new NotFoundException(`Workflow for content ${id} not found`);
    const result = await this.workflows.advance(
      instance.id,
      req.user.sub,
      req.user.role,
      "reject",
      body.reason,
      req.ip,
      req.headers["user-agent"],
    );
    this.notifications.broadcast("content.rejected", {
      contentId: id,
      workflowInstanceId: instance.id,
      reason: body.reason ?? null,
      signatureHash: result.signatureHash,
      at: new Date().toISOString(),
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Sprint 9 / Sprint A — Auto-tagging IA via n8n (service_automation only)
  // ---------------------------------------------------------------------------

  @Patch(":id/tags")
  @ExactRoles("service_automation")
  @Throttle({ service_automation: { limit: 500, ttl: 60_000 } })
  @ApiOperation({
    summary: "Auto-tag a draft (n8n only). Sets tags + summary, no workflow side-effect.",
  })
  @ApiResponse({ status: 200, description: "Content updated" })
  @ApiResponse({ status: 403, description: "Forbidden — service_automation required" })
  @ApiResponse({ status: 404, description: "Content not found" })
  async autoTag(
    @Param("id") id: string,
    @Body() dto: UpdateContentTagsDto,
  ) {
    return this.contentsService.applyAutoTags(id, dto);
  }

  @Post(":id/tagging-claim")
  @ExactRoles("service_automation")
  @Throttle({ service_automation: { limit: 500, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Atomically claim a draft for tagging (n8n only). 2-min TTL, auto-expires.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Claim acquired. PATCH /tags within 2 min or the lock expires.",
  })
  @ApiResponse({ status: 403, description: "Forbidden — service_automation required" })
  @ApiResponse({
    status: 404,
    description: "Content not found / not a draft (deleted or published)",
  })
  @ApiResponse({
    status: 409,
    description: "Another run holds a fresh claim — skip this content for now.",
  })
  async claimForTagging(@Param("id") id: string, @Req() req: Request) {
    return this.contentsService.claimForTagging(id, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
}

// Hiérarchie locale pour la décision read-access dans `one()`.
const ranks: Record<string, number> = {
  journalist: 1,
  community_manager: 1,
  editor: 2,
  chief: 3,
  direction: 4,
  admin: 5,
};
