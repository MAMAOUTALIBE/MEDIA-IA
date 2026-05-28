// Sentry + OpenTelemetry instrumentation — must be imported FIRST in main.ts
// (ADR-006 sécurité + Sprint 8 observability)
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

// --- OpenTelemetry (traces + metrics) -----------------------------------
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
if (otelEndpoint) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "cmr-api",
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.1.0",
      "deployment.environment": process.env.NODE_ENV ?? "development",
    }),
    traceExporter: new OTLPTraceExporter({ url: `${otelEndpoint}/v1/traces` }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false }, // noisy
        "@opentelemetry/instrumentation-net": { enabled: false },
      }),
    ],
  });
  sdk.start();
  console.log(`✓ OpenTelemetry SDK started → ${otelEndpoint}`);
}

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    sendDefaultPii: false, // never send PII — ADR-006
    beforeSend(event) {
      // Defensive scrub
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
  console.log(`✓ Sentry enabled (env: ${process.env.SENTRY_ENVIRONMENT ?? "dev"})`);
}
