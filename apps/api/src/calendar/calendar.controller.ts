import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";
import { calendarEvents as mockEvents } from "../mocks/data-extra";
import { PrismaService } from "../prisma/prisma.service";

class ListCalendarDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

/**
 * Editorial calendar.
 *
 * Reads from Prisma `CalendarEvent` when the table has data. Falls back to the
 * curated mock so the UI is never empty in fresh-install or CI scenarios.
 * The response shape is stable across both sources and the `source` field tells
 * the front-end (and audit reviewers) where the data came from.
 */
@ApiTags("calendar")
@Controller("calendar")
export class CalendarController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Scheduled publications between optional date bounds" })
  async list(@Query() q: ListCalendarDto) {
    const where: { scheduledAt?: { gte?: Date; lte?: Date } } = {};
    if (q.from || q.to) {
      where.scheduledAt = {};
      if (q.from) where.scheduledAt.gte = new Date(q.from);
      if (q.to) where.scheduledAt.lte = new Date(q.to);
    }
    const dbRows = await this.prisma.calendarEvent.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      take: 500,
    });
    if (dbRows.length > 0) {
      return {
        count: dbRows.length,
        source: "live",
        items: dbRows.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.scheduledAt.toISOString(),
          channel: e.channel,
          contentType: e.contentType,
          contentId: e.contentId,
        })),
      };
    }
    // Mock fallback — same client-visible shape, flagged as such.
    let rows = [...mockEvents];
    if (q.from) rows = rows.filter((e) => e.date >= q.from!);
    if (q.to) rows = rows.filter((e) => e.date <= q.to!);
    return { count: rows.length, source: "mock", items: rows };
  }
}
