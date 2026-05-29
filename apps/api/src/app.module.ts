import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { CommonModule } from "./common/common.module";
import { validateEnv } from "./common/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { PublishingModule } from "./publishing/publishing.module";
import { MetricsModule } from "./metrics/metrics.module";
import { HealthModule } from "./health/health.module";
import { ContentsModule } from "./contents/contents.module";
import { KpisModule } from "./kpis/kpis.module";
import { AuditModule } from "./audit/audit.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { WorkflowsModule } from "./workflows/workflows.module";
// Phase O.2 — additional modules
import { ActivityModule } from "./activity/activity.module";
import { MediaModule } from "./media/media.module";
import { AutomationsModule } from "./automations/automations.module";
import { CalendarModule } from "./calendar/calendar.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { DiffusionModule } from "./diffusion/diffusion.module";
import { AudienceModule } from "./audience/audience.module";
import { AiModule } from "./ai/ai.module";
import { UsersModule } from "./users/users.module";
// Phase Q — auth
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Load monorepo root .env first, then apps/api/.env if present (override).
      // Without this, ConfigModule would look only at process cwd (apps/api/)
      // where no .env exists, and silently rely on shell-inherited env.
      envFilePath: [resolve(__dirname, "../../../.env"), resolve(__dirname, "../.env")],
      // Throws in production if required env vars are missing/invalid,
      // warns only in development to keep DX smooth.
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      // Buckets — controllers opt into stricter ones via @Throttle({ name: ... })
      { name: "default", ttl: 60_000, limit: 100 }, // 100 req/min/IP
      { name: "auth", ttl: 60_000, limit: 5 }, // 5 logins/min/IP — brute-force shield
      { name: "ai", ttl: 60_000, limit: 30 }, // 30 LLM calls/min/IP — cost shield
      { name: "media-upload", ttl: 60_000, limit: 20 }, // 20 presigns/min/IP
      // n8n + autres service tokens : un tick cron émet 4-6 appels (Fetch,
      // Claim, PATCH, Log success/failed). Default 100/min sature dès qu'un
      // dev fait quelques smoke-tests en parallèle. 500/min laisse de la
      // marge sans pour autant ouvrir une porte DDoS — le rôle est de toute
      // façon ExactRoles-gated.
      { name: "service_automation", ttl: 60_000, limit: 500 },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        // Reuse the request id propagated by RequestIdMiddleware so logs, the
        // X-Request-Id response header, and the ProblemDetails envelope all
        // share the same correlation id end-to-end.
        genReqId: (req, res) => {
          const fromMw = (req as { id?: string }).id;
          if (fromMw) return fromMw;
          const hdr = req.headers["x-request-id"];
          const id = (Array.isArray(hdr) ? hdr[0] : hdr) || crypto.randomUUID();
          res.setHeader("X-Request-Id", id);
          return id;
        },
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { singleLine: true, colorize: true } }
            : undefined,
        redact: {
          paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
          remove: true,
        },
        serializers: {
          req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        },
      },
    }),
    CommonModule,
    PrismaModule,
    PublishingModule,
    MetricsModule,
    HealthModule,
    AuthModule,
    ContentsModule,
    KpisModule,
    AuditModule,
    NotificationsModule,
    WorkflowsModule,
    ActivityModule,
    MediaModule,
    AutomationsModule,
    CalendarModule,
    AnalyticsModule,
    DiffusionModule,
    AudienceModule,
    AiModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
