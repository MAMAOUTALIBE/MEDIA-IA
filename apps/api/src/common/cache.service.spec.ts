import { describe, expect, it, vi } from "vitest";
import { CacheService } from "./cache.service";

describe("CacheService", () => {
  it("returns null on miss and stores on set", async () => {
    const c = new CacheService();
    expect(await c.get<string>("k")).toBeNull();
    await c.set("k", "value", 1000);
    expect(await c.get("k")).toBe("value");
  });

  it("expires entries past TTL", async () => {
    vi.useFakeTimers();
    try {
      const c = new CacheService();
      await c.set("k", 42, 100);
      expect(await c.get("k")).toBe(42);
      vi.advanceTimersByTime(150);
      expect(await c.get("k")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("wrap() executes loader on miss and caches result", async () => {
    const c = new CacheService();
    const loader = vi.fn(async () => "computed");
    expect(await c.wrap("kk", 1000, loader)).toBe("computed");
    expect(await c.wrap("kk", 1000, loader)).toBe("computed");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("wrap() dedupes concurrent loaders (single-flight)", async () => {
    const c = new CacheService();
    let resolveFn: ((v: string) => void) | null = null;
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const a = c.wrap("x", 1000, loader);
    const b = c.wrap("x", 1000, loader);
    // `wrap` does an async cache lookup before calling the loader; flush the
    // microtask queue so the loader has had a chance to run and capture `resolve`.
    for (let i = 0; i < 5 && !resolveFn; i++) await Promise.resolve();
    resolveFn!("once");
    expect(await a).toBe("once");
    expect(await b).toBe("once");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("del() removes an entry", async () => {
    const c = new CacheService();
    await c.set("z", "alive", 1000);
    await c.del("z");
    expect(await c.get("z")).toBeNull();
  });
});
