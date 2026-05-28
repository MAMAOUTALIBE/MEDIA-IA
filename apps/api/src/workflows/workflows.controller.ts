import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import type { Request } from "express";
import { Roles } from "../auth/roles.decorator";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { WorkflowsService } from "./workflows.service";

class AdvanceDto {
  @IsOptional() @IsString() @MaxLength(2000)
  comment?: string;

  @IsOptional() @IsIn(["approve", "reject", "request_changes"])
  decision?: "approve" | "reject" | "request_changes";
}

@ApiTags("workflows")
@Roles("editor")
@Controller("workflows")
export class WorkflowsController {
  constructor(
    private readonly workflows: WorkflowsService,
    private readonly notifications: NotificationsGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all workflow instances + per-step counts" })
  list() {
    return this.workflows.listAll();
  }

  @Get(":id/history")
  @ApiOperation({ summary: "Cosigned action history (audit-grade)" })
  history(@Param("id") id: string) {
    return this.workflows.history(id);
  }

  @Post(":id/advance")
  @ApiOperation({ summary: "Advance / reject a workflow — creates a signed ValidationAction" })
  async advance(@Param("id") id: string, @Body() body: AdvanceDto, @Req() req: Request) {
    if (!req.user) throw new Error("guard misconfigured");
    const result = await this.workflows.advance(
      id,
      req.user.sub,
      req.user.role,
      body.decision ?? "approve",
      body.comment,
      req.ip,
      req.headers["user-agent"],
    );

    this.notifications.broadcast("workflow.advanced", {
      id,
      decision: body.decision ?? "approve",
      newStep: ("instance" in result && result.instance && "currentStep" in result.instance)
        ? (result.instance as { currentStep: string }).currentStep
        : undefined,
      signatureHash: result.signatureHash,
      at: new Date().toISOString(),
    });

    return result;
  }
}
