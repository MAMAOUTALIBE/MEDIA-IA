import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FeatureFlagsService } from "./feature-flags.service";

describe("FeatureFlagsService", () => {
  const original = { ...process.env };

  beforeEach(() => {
    // Wipe any FEATURE_* env vars so each test starts from a known state.
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("FEATURE_")) delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("FEATURE_")) delete process.env[k];
    }
    for (const [k, v] of Object.entries(original)) {
      if (k.startsWith("FEATURE_") && v !== undefined) process.env[k] = v;
    }
  });

  it("returns the static default when no env override is set", () => {
    const f = new FeatureFlagsService();
    expect(f.isEnabled("publishing.youtube")).toBe(true);
    expect(f.isEnabled("automations.n8n_bridge")).toBe(false);
  });

  it("env override turns a default-off flag on", () => {
    process.env.FEATURE_AUTOMATIONS_N8N_BRIDGE = "true";
    const f = new FeatureFlagsService();
    expect(f.isEnabled("automations.n8n_bridge")).toBe(true);
  });

  it("env override turns a default-on flag off", () => {
    process.env.FEATURE_PUBLISHING_YOUTUBE = "false";
    const f = new FeatureFlagsService();
    expect(f.isEnabled("publishing.youtube")).toBe(false);
  });

  it("accepts multiple truthy spellings", () => {
    for (const v of ["1", "true", "on", "yes", "TRUE", "Yes"]) {
      process.env.FEATURE_AUTOMATIONS_N8N_BRIDGE = v;
      expect(new FeatureFlagsService().isEnabled("automations.n8n_bridge")).toBe(true);
    }
  });

  it("falls back to default on garbage values (and logs a warning)", () => {
    process.env.FEATURE_AUTOMATIONS_N8N_BRIDGE = "maybe";
    const f = new FeatureFlagsService();
    expect(f.isEnabled("automations.n8n_bridge")).toBe(false); // default
  });

  it("snapshot() returns every declared flag", () => {
    const f = new FeatureFlagsService();
    const snap = f.snapshot();
    expect(snap).toHaveProperty("publishing.youtube");
    expect(snap).toHaveProperty("gdpr.right_to_be_forgotten");
    expect(snap).toHaveProperty("automations.n8n_bridge");
  });
});
