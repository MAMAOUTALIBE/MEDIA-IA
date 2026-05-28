// Load root monorepo .env first so it overrides anything inherited from the
// parent shell. Without override, a stale shell-level CORS_ORIGIN or
// NEXT_PUBLIC_* sticks even when .env on disk is updated.
import { config as loadEnv } from "dotenv";
import { resolve as resolvePath } from "node:path";
loadEnv({ path: resolvePath(__dirname, "../../../.env"), override: true });
loadEnv({ path: resolvePath(__dirname, "../.env"), override: true });

import "./instrument"; // MUST be first — Sentry instrumentation (ADR-006)
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Graceful shutdown — wires SIGTERM/SIGINT to NestJS onModuleDestroy + Prisma
  // disconnect, closes the HTTP listener, and drains in-flight requests so
  // Kubernetes can roll pods without dropping connections.
  app.enableShutdownHooks();

  // Security headers (ADR-006) — tightened CSP + cross-origin isolation in prod
  const isProd = process.env.NODE_ENV === "production";
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              "default-src": ["'self'"],
              "base-uri": ["'self'"],
              "object-src": ["'none'"],
              "frame-ancestors": ["'none'"],
              "img-src": ["'self'", "data:", "blob:", "https:"],
              "media-src": ["'self'", "blob:"],
              "connect-src": ["'self'", "https:", "wss:"],
              "script-src": ["'self'"],
              "style-src": ["'self'", "'unsafe-inline'"],
              "upgrade-insecure-requests": [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }),
  );

  // Behind reverse proxy in prod
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Sprint 1: cookie-parser for refresh + access cookies (HttpOnly)
  app.use(cookieParser());

  // CORS allow-list — exact origin match, no wildcards in prod
  const corsAllowList = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, cb) => {
      // Same-origin / curl / server-to-server (no Origin header) → allow
      if (!origin) return cb(null, true);
      if (corsAllowList.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 3600,
  });
  app.setGlobalPrefix("api");

  // DTO validation (ADR-006)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle("CMR API")
    .setDescription(
      "Content Media Room — API REST + WebSocket pour la plateforme de production éditoriale TV nationale.\n\n" +
        "**Auth** : `POST /auth/login` { email, password: 'cmr2025' } → JWT 8h.\n" +
        "Attacher `Authorization: Bearer <token>` aux requêtes protégées (futures).\n\n" +
        "**WebSocket** : namespace `/notifications` sur le même host.\n" +
        "Événements émis : `welcome`, `heartbeat`, `activity`, `content.validated`, " +
        "`content.rejected`, `workflow.advanced`.",
    )
    .setVersion("0.1")
    .addTag("auth", "Login / logout / current user")
    .addTag("contents", "Contenus + validation/rejet")
    .addTag("workflows", "Pipeline de validation 4 niveaux")
    .addTag("kpis", "KPI dashboard + plateformes")
    .addTag("audience", "Audience time series")
    .addTag("activity", "Flux d'activité éditoriale")
    .addTag("audit", "Journal d'audit immuable")
    .addTag("notifications", "Mentions, validations, alertes système")
    .addTag("media", "DAM — Digital Asset Management")
    .addTag("automations", "Règles n8n-like")
    .addTag("calendar", "Calendrier éditorial")
    .addTag("analytics", "Analytics avancés")
    .addTag("diffusion", "Matrice de diffusion multicanale")
    .addTag("ai", "Assistant IA + vérifications + streaming SSE")
    .addTag("users", "Utilisateurs et rôles")
    .addTag("health", "Liveness / readiness")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
    },
    customSiteTitle: "CMR API · OpenAPI Explorer",
  });

  await app.listen(PORT, HOST);
  console.log(`✓ CMR API listening on http://${HOST}:${PORT}/api`);
  console.log(`✓ OpenAPI docs : http://${HOST}:${PORT}/api/docs`);
}

// Last-resort exit on unhandled errors — Sentry already captures via instrument.ts,
// but unhandled rejections in async hooks must crash the process so K8s can restart.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection — exiting:", reason);
  process.exit(1);
});

bootstrap().catch((err) => {
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});
