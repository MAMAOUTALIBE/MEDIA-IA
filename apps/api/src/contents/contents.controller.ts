import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { contents } from "../mocks/data";
import { pendingContents } from "../mocks/data-extra";
import { NotificationsGateway } from "../notifications/notifications.gateway";

@Controller("contents")
export class ContentsController {
  constructor(private readonly notifications: NotificationsGateway) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("q") q?: string,
  ) {
    let rows = [...contents];
    if (status) rows = rows.filter((c) => c.status === status);
    if (type) rows = rows.filter((c) => c.type === type);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.title.toLowerCase().includes(needle) ||
          (c.excerpt?.toLowerCase().includes(needle) ?? false),
      );
    }
    return { count: rows.length, items: rows };
  }

  @Get("pending")
  pending() {
    return { count: pendingContents.length, items: pendingContents };
  }

  @Get(":id")
  one(@Param("id") id: string) {
    const c = contents.find((x) => x.id === id);
    if (!c) throw new NotFoundException(`Content ${id} not found`);
    return c;
  }

  @Post(":id/validate")
  validate(@Param("id") id: string, @Body() body: { comment?: string } = {}) {
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

  @Post(":id/reject")
  reject(@Param("id") id: string, @Body() body: { reason?: string } = {}) {
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
