import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";

@ApiTags("audit")
@Roles("admin")
@Controller("audit")
export class AuditController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query("severity") severity?: string, @Query("q") q?: string) {
    const events = await this.prisma.auditEvent.findMany({
      where: {
        ...(severity && severity !== "all" ? { severity: severity as never } : {}),
        ...(q
          ? {
              OR: [
                { target: { contains: q, mode: "insensitive" } },
                { action: { equals: q as never } },
              ],
            }
          : {}),
      },
      orderBy: { at: "desc" },
      take: 200,
    });
    const totals = await this.prisma.auditEvent.groupBy({
      by: ["severity"],
      _count: true,
    });
    const totalsMap: Record<string, number> = { all: 0, info: 0, warning: 0, critical: 0 };
    for (const t of totals) {
      totalsMap[t.severity] = t._count;
      totalsMap.all += t._count;
    }
    const failures = await this.prisma.auditEvent.count({ where: { status: "failure" } });
    return { count: events.length, items: events, totals: { ...totalsMap, failures } };
  }

  @Get("chain/verify")
  @ApiOperation({ summary: "Verify the cryptographic audit chain (admin only)" })
  async verifyChain() {
    return this.audit.verifyChain();
  }
}
