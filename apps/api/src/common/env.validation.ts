import { Logger } from "@nestjs/common";

/**
 * Lightweight env schema validator. We avoid bringing Joi/zod as a runtime dep
 * since this surface is small and stable. Each rule is a function that returns
 * an error string when violated. Validation runs once at startup and prints all
 * issues before the process exits.
 */
type Rule = (value: string | undefined, fullEnv: Record<string, unknown>) => string | null;

interface Schema {
  [key: string]: { required?: boolean; rules?: Rule[]; defaultValue?: string };
}

const isProd = (env: Record<string, unknown>) => env.NODE_ENV === "production";

const isUrl: Rule = (v) => {
  if (!v) return null;
  try {
    new URL(v);
    return null;
  } catch {
    return "must be a valid URL";
  }
};

const minLength = (n: number): Rule => (v) =>
  v && v.length < n ? `must be at least ${n} characters` : null;

const oneOf = (values: string[]): Rule => (v) =>
  v && !values.includes(v) ? `must be one of: ${values.join(", ")}` : null;

const isInteger: Rule = (v) =>
  v && !/^\d+$/.test(v) ? "must be an integer" : null;

const _requiredInProd: Rule = (v, env) =>
  isProd(env) && !v ? "is required in production" : null;

const schema: Schema = {
  NODE_ENV: {
    rules: [oneOf(["development", "test", "staging", "production"])],
    defaultValue: "development",
  },
  PORT: { rules: [isInteger], defaultValue: "4000" },
  HOST: { defaultValue: "0.0.0.0" },
  LOG_LEVEL: {
    rules: [oneOf(["fatal", "error", "warn", "info", "debug", "trace", "silent"])],
    defaultValue: "info",
  },
  DATABASE_URL: { required: true, rules: [isUrl] },
  JWT_SECRET: {
    required: true,
    rules: [
      minLength(32),
      (v, env) => (isProd(env) && v && v.startsWith("dev_only") ? "must not start with 'dev_only' in production" : null),
    ],
  },
  JWT_EXPIRES_IN_SECONDS: { rules: [isInteger], defaultValue: "28800" },
  CORS_ORIGIN: { required: true },
  SENTRY_DSN: { rules: [isUrl] },
  OTEL_EXPORTER_OTLP_ENDPOINT: { rules: [isUrl] },
  REDIS_URL: { rules: [isUrl] },
};

export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  for (const [key, def] of Object.entries(schema)) {
    let value = env[key] as string | undefined;
    if ((value === undefined || value === "") && def.defaultValue !== undefined) {
      value = def.defaultValue;
      env[key] = def.defaultValue;
    }
    if (def.required && !value) {
      errors.push(`  • ${key} is required`);
      continue;
    }
    for (const rule of def.rules ?? []) {
      const error = rule(value, env);
      if (error) errors.push(`  • ${key} ${error}`);
    }
  }

  if (errors.length > 0) {
    const message = `Environment validation failed:\n${errors.join("\n")}`;
    if (isProd(env)) {
      Logger.error(message, "EnvValidation");
      throw new Error(message);
    }
    // dev: warn but allow boot — DX over strictness for local quick-iteration
    Logger.warn(`${message}\n(non-fatal in non-production)`, "EnvValidation");
  }

  return env;
}
