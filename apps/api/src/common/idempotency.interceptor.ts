import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, from, of } from "rxjs";
import { switchMap, tap } from "rxjs/operators";

/**
 * In-memory idempotency store. Clients send Idempotency-Key on POST/PATCH; the
 * first response for that key is cached for `TTL_MS`. Replays return the same
 * status/body without re-executing the handler, so a network retry never
 * creates duplicate resources (publishes, payments, validations, …).
 *
 * Production note: swap the Map for Redis when scaling beyond one replica.
 * The interface is intentionally compatible with a Redis-backed implementation.
 */
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — matches Stripe-style semantics.

interface CachedResponse {
  status: number;
  body: unknown;
  expiresAt: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, CachedResponse | "pending">();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (req.method !== "POST" && req.method !== "PATCH" && req.method !== "PUT") {
      return next.handle();
    }
    const key = req.header("Idempotency-Key");
    if (!key) return next.handle();

    const cacheKey = `${(req as { user?: { sub?: string } }).user?.sub ?? "anon"}:${req.method}:${req.path}:${key}`;
    this.evictExpired();
    const cached = this.cache.get(cacheKey);

    if (cached === "pending") {
      throw new ConflictException("A request with this Idempotency-Key is already in flight");
    }
    if (cached) {
      res.status(cached.status);
      res.setHeader("Idempotency-Replay", "true");
      return of(cached.body);
    }

    this.cache.set(cacheKey, "pending");
    return next.handle().pipe(
      switchMap((body) => from(Promise.resolve(body))),
      tap({
        next: (body) => {
          this.cache.set(cacheKey, {
            status: res.statusCode || 200,
            body,
            expiresAt: Date.now() + TTL_MS,
          });
        },
        error: () => {
          // Don't cache failures so retries can succeed.
          this.cache.delete(cacheKey);
        },
      }),
    );
  }

  private evictExpired() {
    if (this.cache.size < 1000) return; // amortized cleanup
    const now = Date.now();
    for (const [k, v] of this.cache) {
      if (v !== "pending" && v.expiresAt < now) this.cache.delete(k);
    }
  }
}
