import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import type { Request } from "express";
import { Roles } from "../auth/roles.decorator";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowsService } from "../workflows/workflows.service";

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
}
