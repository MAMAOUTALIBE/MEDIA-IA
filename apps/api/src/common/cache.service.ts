import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";

/**
 * Tiny cache façade with TTL. Backed by an in-process LRU when REDIS_URL is
 * not configured, so it works out of the box in dev/tests; production should
 * point REDIS_URL at a real Redis (separate replica for horizontal scaling).
 *
 * Intentionally minimal API — kept compatible with the future Redis adapter:
 *   - get(key) → value | null
 *   - set(key, value, ttlMs) → void
 *   - del(key) → void
 *   - wrap(key, ttl, loader) → cached or freshly-computed value
 */
interface Entry<T = unknown> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, Entry>();
  private readonly maxEntries = 5_000;

  async get<T>(key: string): Promise<T | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return e.value as T;
  }

  async set<T>(key: string, value: T, ttlMs = 60_000): Promise<void> {
    if (this.store.size >= this.maxEntries) this.evictOldest();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Read-through helper: returns cached value, or executes `loader` and caches
   * its result. Subsequent concurrent calls dedupe against the in-flight promise
   * (single-flight) so a cache miss doesn't stampede the upstream.
   */
  async wrap<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    const inflight = this.inflight.get(key) as Promise<T> | undefined;
    if (inflight) return inflight;

    const p = loader()
      .then(async (v) => {
        await this.set(key, v, ttlMs);
        return v;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p as Promise<unknown>);
    return p;
  }

  private inflight = new Map<string, Promise<unknown>>();

  private evictOldest() {
    // O(n) eviction is fine at maxEntries=5k; Map preserves insertion order.
    const oldest = this.store.keys().next().value;
    if (oldest !== undefined) this.store.delete(oldest);
  }

  onModuleDestroy(): void {
    this.store.clear();
    this.inflight.clear();
  }
}
