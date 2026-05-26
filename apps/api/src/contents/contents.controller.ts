import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { pendingContents } from "../mocks/data-extra";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PrismaService } from "../prisma/prisma.service";

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
  pending() {
    // TODO Sprint 2 : remplacer par WorkflowInstance table avec Camunda 8
    return { count: pendingContents.length, items: pendingContents };
  }

  @Get(":id")
  async one(@Param("id") id: string) {
    const c = await this.prisma.content.findFirst({
      where: { id, deletedAt: null },
      include: {
        channels: { select: { channel: true } },
        aiChecks: true,
        author: { select: { id: true, name: true, initials: true, color: true, role: true } },
      },
    });
    if (!c) throw new NotFoundException(`Content ${id} not found`);
    return { ...c, channels: c.channels.map((ch) => ch.channel) };
  }

  @Roles("editor")
  @Post(":id/validate")
  validate(@Param("id") id: string, @Body() body: ValidateDto) {
    // TODO Sprint 2 : workflow Camunda 8 + ValidationAction signée
    const pendingIdx = pendingContents.findIndex(
      (p) => p.id === id || p.contentId === id,
    );
    if (pendingIdx === -1) {
      throw new NotFoundException(`Pending item ${id} not found`);
    }
    const removed = pendingContents.splice(pendingIdx, 1)[0]!;
    const nextStep =
      removed.step === "editor"
        ? "chief"
        : removed.step === "chief"
          ? "direction"
          : "published";

    this.notifications.broadcast("content.validated", {
      id: removed.id,
      contentId: removed.contentId,
      title: removed.title,
      previousStep: removed.step,
      newStep: nextStep,
      comment: body.comment ?? null,
      at: new Date().toISOString(),
    });

    return { ok: true, validated: removed, newStep: nextStep };
  }

  @Roles("editor")
  @Post(":id/reject")
  reject(@Param("id") id: string, @Body() body: RejectDto) {
    const pendingIdx = pendingContents.findIndex(
      (p) => p.id === id || p.contentId === id,
    );
    if (pendingIdx === -1) {
      throw new NotFoundException(`Pending item ${id} not found`);
    }
    const removed = pendingContents.splice(pendingIdx, 1)[0]!;

    this.notifications.broadcast("content.rejected", {
      id: removed.id,
      contentId: removed.contentId,
      title: removed.title,
      reason: body.reason ?? null,
      at: new Date().toISOString(),
    });

    return { ok: true, rejected: removed };
  }
}
