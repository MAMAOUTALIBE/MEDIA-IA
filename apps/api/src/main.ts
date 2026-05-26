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

  // Security headers (ADR-006)
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false,
      hsts: process.env.NODE_ENV === "production",
    }),
  );

  // Behind reverse proxy in prod
  app.set("trust proxy", 1);

  // Sprint 1: cookie-parser for refresh + access cookies (HttpOnly)
  app.use(cookieParser());

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(","),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
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
  // eslint-disable-next-line no-console
  console.log(`✓ CMR API listening on http://${HOST}:${PORT}/api`);
  // eslint-disable-next-line no-console
  console.log(`✓ OpenAPI docs : http://${HOST}:${PORT}/api/docs`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});
