import { Injectable, Logger } from "@nestjs/common";

/**
 * Lightweight, in-process feature flag service. Two source layers, evaluated in order:
 *   1. env-var override   FEATURE_<UPPER_FLAG_NAME>=true|false
 *   2. static defaults    declared in DEFAULTS below
 *
 * We intentionally avoid an external dep (Unleash / GrowthBook / LaunchDarkly).
 * Reasoning:
 *   - Government delivery: minimize the network attack surface and 3rd-party
 *     trust. Flags evaluated locally cannot phone home, cannot be rolled live
 *     without a deploy, and survive an internet outage.
 *   - The flags we ship are coarse (publishing connectors on/off, GDPR purge
 *     toggle, n8n bridge, etc.). They don't need user-bucketing.
 *
 * If finer targeting is needed later, this service is a drop-in seam for a
 * vendor SDK — controllers just call `flags.isEnabled("foo")`.
 */
export type FeatureFlagName =
  | "publishing.youtube"
  | "publishing.facebook"
  | "publishing.tiktok"
  | "ai.claude.streaming"
  | "ai.auto_tag"
  | "automations.n8n_bridge"
  | "gdpr.right_to_be_forgotten"
  | "audit.export_s3";

const DEFAULTS: Record<FeatureFlagName, boolean> = {
  "publishing.youtube": true,
  "publishing.facebook": true,
  "publishing.tiktok": false, // requires app review — kept off until approved
  "ai.claude.streaming": true,
  "ai.auto_tag": false, // ship behind a flag until LLM costs are profiled
  "automations.n8n_bridge": false, // off until Sprint A of n8n integration plan ships
  "gdpr.right_to_be_forgotten": true,
  "audit.export_s3": false, // requires S3 backup infra
};

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly resolved = new Map<FeatureFlagName, boolean>();

  constructor() {
    for (const name of Object.keys(DEFAULTS) as FeatureFlagName[]) {
      const envKey = `FEATURE_${name.toUpperCase().replace(/[.]/g, "_")}`;
      const raw = process.env[envKey];
      let value: boolean;
      if (raw === undefined) {
        value = DEFAULTS[name];
      } else if (/^(1|true|on|yes)$/i.test(raw)) {
        value = true;
      } else if (/^(0|false|off|no)$/i.test(raw)) {
        value = false;
      } else {
        this.logger.warn(`Invalid value for ${envKey}: '${raw}' — falling back to default`);
        value = DEFAULTS[name];
      }
      this.resolved.set(name, value);
    }
  }

  isEnabled(name: FeatureFlagName): boolean {
    return this.resolved.get(name) ?? false;
  }

  /** Snapshot of all flags — useful for the /api/flags admin endpoint. */
  snapshot(): Record<FeatureFlagName, boolean> {
    const out = {} as Record<FeatureFlagName, boolean>;
    for (const [k, v] of this.resolved) out[k] = v;
    return out;
  }
}
