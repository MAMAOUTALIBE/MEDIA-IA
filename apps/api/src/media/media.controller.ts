import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query("type") type?: string) {
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        deletedAt: null,
        ...(type && type !== "all" ? { type: type as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return {
      count: rows.length,
      items: rows.map((m) => ({
        ...m,
        sizeBytes: m.sizeBytes !== null ? Number(m.sizeBytes) : null,
      })),
    };
  }
}
