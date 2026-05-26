import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  private readonly bootedAt = Date.now();

  @Get()
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
  ready() {
    // Future: check DB / Redis / Kafka connectivity here.
    return { ok: true, dependencies: { db: "pending", redis: "pending", kafka: "pending" } };
  }
}
