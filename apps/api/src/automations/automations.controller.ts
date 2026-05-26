import { Body, Controller, Get, NotFoundException, Param, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";

class ToggleAutomationDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@ApiTags("automations")
@Controller("automations")
export class AutomationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const rows = await this.prisma.automationRule.findMany({
      orderBy: { createdAt: "asc" },
    });
    return { count: rows.length, items: rows };
  }

  @Roles("chief")
  @Patch(":id")
  async toggle(@Param("id") id: string, @Body() body: ToggleAutomationDto) {
    const existing = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Automation ${id} not found`);
    const updated = await this.prisma.automationRule.update({
      where: { id },
      data: typeof body.active === "boolean" ? { active: body.active } : {},
    });
    return { ok: true, rule: updated };
  }
}
