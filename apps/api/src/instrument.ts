// Sentry instrumentation — must be imported FIRST in main.ts (ADR-006)
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

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
  // eslint-disable-next-line no-console
  console.log(`✓ Sentry enabled (env: ${process.env.SENTRY_ENVIRONMENT ?? "dev"})`);
}
