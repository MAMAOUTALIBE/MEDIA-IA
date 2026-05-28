import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

/**
 * Propagates X-Request-Id from clients/proxies and generates one when absent.
 * The id is attached to the request, echoed on the response, and consumed by
 * pino-http (via `req.id`) and the ProblemDetailsFilter for end-to-end tracing.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, res: Response, next: NextFunction): void {
    const incoming = req.headers["x-request-id"];
    const id =
      (Array.isArray(incoming) ? incoming[0] : incoming) ||
      req.headers["x-correlation-id"]?.toString() ||
      randomUUID();
    req.id = id;
    res.setHeader("X-Request-Id", id);
    next();
  }
}
