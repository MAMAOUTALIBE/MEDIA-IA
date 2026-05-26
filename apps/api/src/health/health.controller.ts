import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  private readonly bootedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Liveness probe" })
  check() {
    return {
      ok: true,
      service: "cmr-api",
      version: process.env.npm_package_version ?? "0.1.0",
      uptime_ms: Date.now() - this.bootedAt,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV ?? "development",
    };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe (DB + dependencies)" })
  async ready() {
    const deps: Record<string, "ok" | "down" | "pending"> = {
      db: "down",
      redis: "pending",
      kafka: "pending",
    };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      deps.db = "ok";
    } catch {
      deps.db = "down";
    }
    const ready = deps.db === "ok";
    return { ok: ready, dependencies: deps };
  }
}
