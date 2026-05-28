import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker";

describe("CircuitBreaker", () => {
  it("starts CLOSED and lets calls through", async () => {
    const cb = new CircuitBreaker({ name: "t1" });
    expect(cb.getState()).toBe("CLOSED");
    await expect(cb.exec(async () => "ok")).resolves.toBe("ok");
    expect(cb.getState()).toBe("CLOSED");
  });

  it("trips to OPEN after consecutive failures and rejects fast", async () => {
    const cb = new CircuitBreaker({ name: "t2", failureThreshold: 3, resetTimeoutMs: 1000 });
    const failing = vi.fn(async () => {
      throw new Error("boom");
    });
    for (let i = 0; i < 3; i++) {
      await expect(cb.exec(failing)).rejects.toThrow("boom");
    }
    expect(cb.getState()).toBe("OPEN");
    await expect(cb.exec(failing)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(failing).toHaveBeenCalledTimes(3); // no extra calls while OPEN
  });

  it("transitions to HALF_OPEN after the reset timeout, then CLOSED on success", async () => {
    vi.useFakeTimers();
    try {
      const cb = new CircuitBreaker({ name: "t3", failureThreshold: 2, resetTimeoutMs: 5000 });
      const failing = async () => {
        throw new Error("x");
      };
      await expect(cb.exec(failing)).rejects.toThrow();
      await expect(cb.exec(failing)).rejects.toThrow();
      expect(cb.getState()).toBe("OPEN");

      vi.advanceTimersByTime(5001);
      expect(cb.getState()).toBe("HALF_OPEN");

      await expect(cb.exec(async () => "recovered")).resolves.toBe("recovered");
      expect(cb.getState()).toBe("CLOSED");
    } finally {
      vi.useRealTimers();
    }
  });

  it("goes back to OPEN if the HALF_OPEN probe fails", async () => {
    vi.useFakeTimers();
    try {
      const cb = new CircuitBreaker({ name: "t4", failureThreshold: 1, resetTimeoutMs: 100 });
      await expect(
        cb.exec(async () => {
          throw new Error("first");
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe("OPEN");

      vi.advanceTimersByTime(101);
      expect(cb.getState()).toBe("HALF_OPEN");

      await expect(
        cb.exec(async () => {
          throw new Error("probe failed");
        }),
      ).rejects.toThrow("probe failed");
      expect(cb.getState()).toBe("OPEN");
    } finally {
      vi.useRealTimers();
    }
  });
});
