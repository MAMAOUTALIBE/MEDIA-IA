import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const rows = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        team: true,
        active: true,
        lastActiveAt: true,
        initials: true,
        color: true,
      },
    });
    return {
      count: rows.length,
      items: rows.map((u) => ({
        ...u,
        lastActive: u.lastActiveAt?.toISOString() ?? null,
        lastActiveAt: undefined,
      })),
    };
  }

  @Get(":id")
  async one(@Param("id") id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!u) throw new NotFoundException(`User ${id} not found`);
    const { passwordHash: _omit, ...safe } = u;
    return safe;
  }
}
