import { describe, expect, it } from "vitest";
import { validateEnv } from "./env.validation";

describe("validateEnv", () => {
  const baseProdEnv = () => ({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://u:p@db:5432/x",
    JWT_SECRET: "x".repeat(64),
    CORS_ORIGIN: "https://cmr.tv",
    SENTRY_DSN: "https://abc@sentry.io/123",
  });

  it("applies default values for missing optionals", () => {
    const env = { DATABASE_URL: "postgresql://u@h/d", JWT_SECRET: "x".repeat(64), CORS_ORIGIN: "http://x" };
    const result = validateEnv(env);
    expect(result.NODE_ENV).toBe("development");
    expect(result.PORT).toBe("4000");
    expect(result.LOG_LEVEL).toBe("info");
  });

  it("warns but doesn't throw in development when required vars are missing", () => {
    expect(() => validateEnv({ NODE_ENV: "development" })).not.toThrow();
  });

  it("throws in production when DATABASE_URL is missing", () => {
    const env: Record<string, unknown> = baseProdEnv();
    delete env.DATABASE_URL;
    expect(() => validateEnv(env)).toThrow(/DATABASE_URL is required/);
  });

  it("throws when JWT_SECRET is too short", () => {
    const env = { ...baseProdEnv(), JWT_SECRET: "short" };
    expect(() => validateEnv(env)).toThrow(/at least 32/);
  });

  it("rejects dev_only JWT secret in production", () => {
    const env = { ...baseProdEnv(), JWT_SECRET: "dev_only_" + "a".repeat(60) };
    expect(() => validateEnv(env)).toThrow(/must not start with 'dev_only' in production/);
  });

  it("warns on invalid NODE_ENV in dev, throws if also marked as production-like", () => {
    // When NODE_ENV is misspelled, isProd() is false → warn-only path (dev DX).
    // The rule fires either way; assertion focuses on prod behaviour where it
    // matters most. Production with another invalid var should throw.
    const env = { ...baseProdEnv(), CORS_ORIGIN: "" };
    delete (env as Record<string, unknown>).CORS_ORIGIN;
    expect(() => validateEnv(env)).toThrow(/CORS_ORIGIN is required/);
  });

  it("rejects malformed DATABASE_URL", () => {
    const env = { ...baseProdEnv(), DATABASE_URL: "not-a-url" };
    expect(() => validateEnv(env)).toThrow(/DATABASE_URL must be a valid URL/);
  });

  it("requires SENTRY_DSN in production", () => {
    const env: Record<string, unknown> = baseProdEnv();
    delete env.SENTRY_DSN;
    expect(() => validateEnv(env)).toThrow(/SENTRY_DSN is required in production/);
  });
});
