import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import type { Request } from "express";
import { ExactRoles, Roles } from "../auth/roles.decorator";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { ContentsService } from "./contents.service";
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

  @Get()
  async list(
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("q") q?: string,
  ) {
    const rows = await this.prisma.content.findMany({
      where: {
        deletedAt: null,
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
  async one(@Param("id") id: string) {
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
    return { ...c, channels: c.channels.map((ch) => ch.channel) };
  }

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

  // Sprint 9 — Auto-tagging IA via n8n. Restreint à service_automation
  // pour qu'aucun rôle humain ne puisse écraser tags/summary par ce chemin.
  @Patch(":id/tags")
  @ExactRoles("service_automation")
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
}
