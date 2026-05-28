import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import type { Request } from "express";
import { Roles } from "../auth/roles.decorator";
import { FeatureFlagsService } from "../common/feature-flags.service";
import { GdprService } from "./gdpr.service";

class RequestDeletionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/**
 * GDPR endpoints — admin-only. The two-step request → execute flow enforces
 * the 4-eyes principle: the admin who requests cannot be the one who executes.
 *
 * Behind feature flag `gdpr.right_to_be_forgotten` so the capability can be
 * disabled at the runtime if a regulator/audit requires temporary suspension.
 */
@ApiTags("gdpr")
@Roles("admin")
@Controller("gdpr")
export class GdprController {
  constructor(
    private readonly gdpr: GdprService,
    private readonly flags: FeatureFlagsService,
  ) {}

  private assertEnabled() {
    if (!this.flags.isEnabled("gdpr.right_to_be_forgotten")) {
      throw new UnauthorizedException("GDPR purge capability is disabled by feature flag");
    }
  }

  @Get("deletion-requests")
  @ApiOperation({ summary: "List pending / confirmed deletion requests" })
  async listPending() {
    this.assertEnabled();
    const items = await this.gdpr.listPending();
    return { count: items.length, items };
  }

  @Post("deletion-requests/:userId")
  @ApiOperation({ summary: "Open a deletion request for the target user" })
  async request(
    @Param("userId") userId: string,
    @Body() body: RequestDeletionDto,
    @Req() req: Request,
  ) {
    this.assertEnabled();
    if (!req.user) throw new UnauthorizedException();
    return this.gdpr.requestDeletion({
      targetUserId: userId,
      requestedByUserId: req.user.sub,
      reason: body.reason,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Post("deletion-requests/:id/execute")
  @ApiOperation({
    summary:
      "Execute a pending deletion request. 4-eyes: executor must differ from requester.",
  })
  async execute(@Param("id") id: string, @Req() req: Request) {
    this.assertEnabled();
    if (!req.user) throw new UnauthorizedException();
    return this.gdpr.executeDeletion({
      requestId: id,
      executedByUserId: req.user.sub,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Delete("deletion-requests/:id")
  @ApiOperation({ summary: "Cancel a pending deletion request" })
  async cancel(@Param("id") id: string, @Req() req: Request) {
    this.assertEnabled();
    if (!req.user) throw new UnauthorizedException();
    await this.gdpr.cancel(id, req.user.sub);
    return { ok: true };
  }
}
