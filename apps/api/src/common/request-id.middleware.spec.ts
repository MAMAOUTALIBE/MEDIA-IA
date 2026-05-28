import { describe, expect, it, vi } from "vitest";
import { RequestIdMiddleware } from "./request-id.middleware";

function makeRes() {
  const headers: Record<string, string> = {};
  return {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    headers,
  };
}

describe("RequestIdMiddleware", () => {
  const mw = new RequestIdMiddleware();

  it("propagates incoming X-Request-Id header", () => {
    const req = { headers: { "x-request-id": "abc-123" } } as never;
    const res = makeRes();
    const next = vi.fn();
    mw.use(req, res as never, next);
    expect((req as { id?: string }).id).toBe("abc-123");
    expect(res.headers["x-request-id"]).toBe("abc-123");
    expect(next).toHaveBeenCalledOnce();
  });

  it("falls back to X-Correlation-Id header", () => {
    const req = { headers: { "x-correlation-id": "corr-9" } } as never;
    const res = makeRes();
    mw.use(req, res as never, vi.fn());
    expect((req as { id?: string }).id).toBe("corr-9");
    expect(res.headers["x-request-id"]).toBe("corr-9");
  });

  it("generates a UUID when no id header is provided", () => {
    const req = { headers: {} } as never;
    const res = makeRes();
    mw.use(req, res as never, vi.fn());
    const id = (req as { id?: string }).id!;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(res.headers["x-request-id"]).toBe(id);
  });

  it("handles array-valued header (proxy chain)", () => {
    const req = { headers: { "x-request-id": ["first-id", "second-id"] } } as never;
    const res = makeRes();
    mw.use(req, res as never, vi.fn());
    expect((req as { id?: string }).id).toBe("first-id");
  });
});
