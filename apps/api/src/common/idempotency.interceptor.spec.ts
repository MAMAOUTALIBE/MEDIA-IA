import { describe, expect, it } from "vitest";
import { ConflictException, ExecutionContext } from "@nestjs/common";
import { NEVER, of, throwError } from "rxjs";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

interface MockReq {
  method: string;
  path: string;
  user?: { sub?: string };
  headers: Record<string, string>;
  header(name: string): string | undefined;
}

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  status(code: number): this;
  setHeader(name: string, value: string): void;
}

function makeReq(opts: Partial<MockReq> & Pick<MockReq, "method" | "path">): MockReq {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  return {
    method: opts.method,
    path: opts.path,
    user: opts.user,
    headers,
    header(name) {
      return headers[name];
    },
  };
}

function makeRes(): MockRes {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
  };
}

function makeContext(req: MockReq, res: MockRes): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
}

describe("IdempotencyInterceptor", () => {
  it("passes GET requests through untouched", async () => {
    const i = new IdempotencyInterceptor();
    const ctx = makeContext(makeReq({ method: "GET", path: "/x" }), makeRes());
    const next = { handle: () => of({ body: "first" }) };
    const out = await i.intercept(ctx, next).toPromise();
    expect(out).toEqual({ body: "first" });
  });

  it("passes through POST without Idempotency-Key", async () => {
    const i = new IdempotencyInterceptor();
    const ctx = makeContext(makeReq({ method: "POST", path: "/x" }), makeRes());
    const next = { handle: () => of({ body: "first" }) };
    const out = await i.intercept(ctx, next).toPromise();
    expect(out).toEqual({ body: "first" });
  });

  it("replays the cached response when the same key is sent twice", async () => {
    const i = new IdempotencyInterceptor();
    const headers = { "Idempotency-Key": "key-1" };
    const req1 = makeReq({ method: "POST", path: "/x", headers });
    const req2 = makeReq({ method: "POST", path: "/x", headers });
    const res1 = makeRes();
    const res2 = makeRes();

    let invocations = 0;
    const handler = {
      handle: () => {
        invocations++;
        return of({ body: "live" });
      },
    };

    const first = await i.intercept(makeContext(req1, res1), handler).toPromise();
    const second = await i.intercept(makeContext(req2, res2), handler).toPromise();

    expect(first).toEqual({ body: "live" });
    expect(second).toEqual({ body: "live" });
    expect(invocations).toBe(1); // handler called only once
    expect(res2.headers["idempotency-replay"]).toBe("true");
  });

  it("rejects concurrent requests with the same key (409)", async () => {
    const i = new IdempotencyInterceptor();
    const headers = { "Idempotency-Key": "key-flight" };
    const reqA = makeReq({ method: "POST", path: "/x", headers });
    const reqB = makeReq({ method: "POST", path: "/x", headers });

    // Trigger the first call but never let it emit so the entry stays "pending".
    const handlerA = { handle: () => NEVER };
    // Subscribing once is enough to start the pipeline; the cache flips to "pending".
    i.intercept(makeContext(reqA, makeRes()), handlerA).subscribe();

    const handlerB = { handle: () => of("would-not-run") };
    expect(() =>
      i.intercept(makeContext(reqB, makeRes()), handlerB),
    ).toThrowError(ConflictException);
  });

  it("does not cache when the handler errors", async () => {
    const i = new IdempotencyInterceptor();
    const headers = { "Idempotency-Key": "key-err" };
    let attempts = 0;
    const handler = {
      handle: () => {
        attempts++;
        return attempts === 1
          ? throwError(() => new Error("boom"))
          : of({ body: "recovered" });
      },
    };

    await expect(
      i.intercept(makeContext(makeReq({ method: "POST", path: "/x", headers }), makeRes()), handler).toPromise(),
    ).rejects.toThrow("boom");

    // Same key after the error should be allowed to execute fresh (failure not cached).
    const replay = await i
      .intercept(
        makeContext(makeReq({ method: "POST", path: "/x", headers }), makeRes()),
        handler,
      )
      .toPromise();
    expect(replay).toEqual({ body: "recovered" });
    expect(attempts).toBe(2);
  });
});
