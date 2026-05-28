import {
  BadRequestException,
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
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { Request } from "express";
import { ExactRoles, Roles } from "../auth/roles.decorator";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

class ToggleAutomationDto {
  @IsOptional() @IsBoolean() active?: boolean;
}

class LogAutomationRunDto {
  @IsString() @MaxLength(128) workflowId!: string;
  @IsString() @MaxLength(128) executionId!: string;
  @IsString() @MaxLength(128) triggeredBy!: string;
  @IsIn(["running", "success", "failed", "canceled"]) status!:
    | "running"
    | "success"
    | "failed"
    | "canceled";
  @IsOptional() @IsString() @MaxLength(2000) errorMessage?: string;
  @IsOptional() @IsArray() contentIds?: string[];
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

@ApiTags("automations")
@Controller("automations")
export class AutomationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Admin reads + toggles rules. The rule list is the source of truth for the
  // automation rules table (kind of a registry of n8n workflows + their state).
  @Roles("admin")
  @Get()
  async list() {
    const rows = await this.prisma.automationRule.findMany({
      orderBy: { createdAt: "asc" },
    });
    return { count: rows.length, items: rows };
  }

  @Roles("admin")
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

  /**
   * Admin view of recent automation executions.
   *
   * Filter by workflow or status. Used by the /dashboard/automatisations page
   * to show "what just ran" without exposing n8n directly to humans.
   */
  @Roles("admin")
  @Get("runs")
  @ApiOperation({ summary: "Recent automation runs (n8n-style executions)" })
  async runs(
    @Query("workflowId") workflowId?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    const take = Math.min(Number(limit ?? 50), 200);
    const where: Record<string, string> = {};
    if (workflowId) where.workflowId = workflowId;
    if (status) where.status = status;
    const rows = await this.prisma.automationRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take,
    });
    return { count: rows.length, items: rows };
  }

  /**
   * Log an execution result from a non-human caller (n8n).
   *
   * Restricted to `service_automation` via @ExactRoles — admins must mint a
   * dedicated service token (POST /auth/service-token) to use this endpoint
   * rather than reusing their human credentials. This makes accidental
   * pollution of the runs log from an admin console impossible.
   *
   * Every run is also written to the audit chain so the cryptographic trail
   * stays a single source of truth.
   */
  @ExactRoles("service_automation")
  @Post("runs")
  @ApiOperation({
    summary: "Log an automation run (service_automation only — e.g. n8n)",
  })
  async recordRun(@Body() body: LogAutomationRunDto, @Req() req: Request) {
    if (!req.user) throw new BadRequestException("Missing service identity");
    const run = await this.prisma.automationRun.create({
      data: {
        workflowId: body.workflowId,
        executionId: body.executionId,
        triggeredBy: body.triggeredBy,
        status: body.status,
        errorMessage: body.errorMessage,
        contentIds: body.contentIds ?? [],
        metadata: body.metadata as never,
        finishedAt:
          body.status === "running" ? null : new Date(),
      },
    });
    await this.audit.log({
      action: "automation_run" as never,
      target: `${body.workflowId}#${body.executionId}`,
      severity: body.status === "failed" ? "warning" : "info",
      status: body.status === "failed" ? "failure" : "success",
      metadata: {
        runId: run.id,
        triggeredBy: body.triggeredBy,
        contentIds: body.contentIds ?? [],
      },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return { ok: true, runId: run.id };
  }
}
