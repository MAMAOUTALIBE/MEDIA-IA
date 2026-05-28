import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";

export const TIMEOUT_KEY = "request:timeout-ms";
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Caps request handler execution time. Returns 408 with a Problem Details
 * envelope when a request exceeds the bucket — prevents a slow downstream
 * (Claude, S3, DB) from holding HTTP connections and exhausting the pool.
 *
 * Override per route with @SetMetadata(TIMEOUT_KEY, milliseconds) — useful for
 * long-running endpoints (AI streams use SSE so this interceptor is bypassed
 * by the controller writing directly to Response).
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ms =
      this.reflector.getAllAndOverride<number>(TIMEOUT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(ms),
      catchError((err) =>
        err instanceof TimeoutError
          ? throwError(() => new RequestTimeoutException(`Request exceeded ${ms}ms budget`))
          : throwError(() => err),
      ),
    );
  }
}
