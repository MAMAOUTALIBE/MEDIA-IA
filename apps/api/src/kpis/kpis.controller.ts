import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { dashboardKpis, platformShares } from "../mocks/data";
import { PrismaService } from "../prisma/prisma.service";

/**
 * KPIs blend two sources:
 *  - `contents`     : live count from Prisma (excludes soft-deleted)
 *  - audience/video/engagement : external analytics, still mocked until the
 *    aggregation pipeline (BullMQ → kpi_snapshot table) lands.
 * Each item is decorated with `source: "live" | "mock"` so the dashboard can
 * surface a freshness/staleness indicator instead of treating both as truth.
 */
@ApiTags("kpis")
@Controller("kpis")
export class KpisController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const publishedCount = await this.prisma.content.count({
      where: { deletedAt: null, status: "published" },
    });
    const items = dashboardKpis.map((k) =>
      k.key === "contents"
        ? { ...k, value: publishedCount, source: "live" as const }
        : { ...k, source: "mock" as const },
    );
    return { items, generatedAt: new Date().toISOString() };
  }

  @Get("platforms")
  platforms() {
    return { items: platformShares, source: "mock", generatedAt: new Date().toISOString() };
  }
}
