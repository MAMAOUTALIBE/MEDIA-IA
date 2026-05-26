import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { PrismaModule } from "./prisma/prisma.module";
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
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 100 }, // 100 req/min/IP par défaut
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
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
    PrismaModule,
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
