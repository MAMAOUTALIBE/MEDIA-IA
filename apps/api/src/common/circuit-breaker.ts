import { Logger } from "@nestjs/common";

/**
 * Minimal half-open circuit breaker, no external deps. Wraps a callable so a
 * downstream outage (Claude rate-limit, S3 unavailable) fails fast instead of
 * piling up requests against a known-broken upstream.
 *
 * States:
 *  - CLOSED   : all calls go through; consecutive failures bump the counter.
 *  - OPEN     : after `failureThreshold` failures, calls are rejected for
 *               `resetTimeoutMs`. No upstream traffic during this window.
 *  - HALF_OPEN: one probe call is allowed; success → CLOSED, failure → OPEN.
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // default 5
  resetTimeoutMs?: number; // default 30s
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitOpenError extends Error {
  constructor(name: string, openedAt: number) {
    super(`Circuit '${name}' is OPEN since ${new Date(openedAt).toISOString()}`);
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private openedAt = 0;
  private readonly logger: Logger;
  private readonly threshold: number;
  private readonly resetMs: number;

  constructor(private readonly opts: CircuitBreakerOptions) {
    this.threshold = opts.failureThreshold ?? 5;
    this.resetMs = opts.resetTimeoutMs ?? 30_000;
    this.logger = new Logger(`Circuit:${opts.name}`);
  }

  getState(): CircuitState {
    if (this.state === "OPEN" && Date.now() - this.openedAt >= this.resetMs) {
      this.transitionTo("HALF_OPEN");
    }
    return this.state;
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();
    if (state === "OPEN") {
      throw new CircuitOpenError(this.opts.name, this.openedAt);
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    if (this.state !== "CLOSED") this.transitionTo("CLOSED");
    this.failures = 0;
  }

  private onFailure() {
    this.failures += 1;
    if (this.state === "HALF_OPEN" || this.failures >= this.threshold) {
      this.openedAt = Date.now();
      this.transitionTo("OPEN");
    }
  }

  private transitionTo(next: CircuitState) {
    if (this.state === next) return;
    const previous = this.state;
    this.state = next;
    this.logger.warn(`${previous} → ${next} (failures=${this.failures})`);
    this.opts.onStateChange?.(previous, next);
  }
}
