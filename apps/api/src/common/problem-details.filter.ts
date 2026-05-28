import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

/**
 * RFC 7807 Problem Details for HTTP APIs.
 * Returns application/problem+json with stable shape across the whole API.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance: string;
  requestId?: string;
  timestamp: string;
  errors?: Record<string, string[]>;
}

const TYPE_BASE = "https://cmr.tv/problems";

function statusToType(status: number): string {
  if (status === 400) return `${TYPE_BASE}/validation`;
  if (status === 401) return `${TYPE_BASE}/unauthorized`;
  if (status === 403) return `${TYPE_BASE}/forbidden`;
  if (status === 404) return `${TYPE_BASE}/not-found`;
  if (status === 409) return `${TYPE_BASE}/conflict`;
  if (status === 422) return `${TYPE_BASE}/unprocessable`;
  if (status === 429) return `${TYPE_BASE}/rate-limited`;
  if (status >= 500) return `${TYPE_BASE}/internal-error`;
  return `${TYPE_BASE}/about-blank`;
}

function statusToTitle(status: number): string {
  const map: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return map[status] ?? "Error";
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail: string | undefined;
    let errors: Record<string, string[]> | undefined;
    let title: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        detail = body;
      } else if (body && typeof body === "object") {
        const raw = body as { message?: unknown; error?: unknown; errors?: unknown };
        title = typeof raw.error === "string" ? raw.error : undefined;
        if (Array.isArray(raw.message)) {
          errors = { body: raw.message.map(String) };
          detail = "Validation failed";
        } else if (typeof raw.message === "string") {
          detail = raw.message;
        }
      }
    } else if (exception instanceof Error) {
      detail = process.env.NODE_ENV === "production" ? undefined : exception.message;
      this.logger.error({ err: exception }, "Unhandled exception");
    }

    const requestId =
      (request.id as string | undefined) ??
      (request.headers["x-request-id"] as string | undefined);

    const problem: ProblemDetails = {
      type: statusToType(status),
      title: title ?? statusToTitle(status),
      status,
      detail,
      instance: request.originalUrl ?? request.url,
      requestId,
      timestamp: new Date().toISOString(),
      ...(errors ? { errors } : {}),
    };

    response.setHeader("Content-Type", "application/problem+json; charset=utf-8");
    if (requestId) response.setHeader("X-Request-Id", requestId);
    response.status(status).json(problem);
  }
}
