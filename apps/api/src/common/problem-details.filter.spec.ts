import { describe, expect, it } from "vitest";
import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { ProblemDetailsFilter } from "./problem-details.filter";

type Captured = {
  status?: number;
  headers: Record<string, string>;
  body?: unknown;
};

function makeHost(reqId = "req-test-123"): { host: ArgumentsHost; captured: Captured } {
  const captured: Captured = { headers: {} };
  const res = {
    setHeader(name: string, value: string) {
      captured.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(payload: unknown) {
      captured.body = payload;
      return this;
    },
  };
  const req = {
    id: reqId,
    originalUrl: "/api/test",
    url: "/api/test",
    headers: { "x-request-id": reqId },
  };
  const host = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, captured };
}

describe("ProblemDetailsFilter", () => {
  const filter = new ProblemDetailsFilter();

  it("maps NotFoundException to RFC 7807 problem with status 404", () => {
    const { host, captured } = makeHost();
    filter.catch(new NotFoundException("Content not found"), host);
    expect(captured.status).toBe(404);
    expect(captured.headers["content-type"]).toBe("application/problem+json; charset=utf-8");
    expect(captured.headers["x-request-id"]).toBe("req-test-123");
    expect(captured.body).toMatchObject({
      type: "https://cmr.tv/problems/not-found",
      title: "Not Found",
      status: 404,
      detail: "Content not found",
      instance: "/api/test",
      requestId: "req-test-123",
    });
  });

  it("flattens class-validator messages into errors map on 400", () => {
    const { host, captured } = makeHost();
    filter.catch(
      new BadRequestException({
        statusCode: 400,
        message: ["email must be an email", "password should not be empty"],
        error: "Bad Request",
      }),
      host,
    );
    expect(captured.status).toBe(400);
    expect(captured.body).toMatchObject({
      type: "https://cmr.tv/problems/validation",
      status: 400,
      detail: "Validation failed",
      errors: { body: ["email must be an email", "password should not be empty"] },
    });
  });

  it("preserves 403 with detail string", () => {
    const { host, captured } = makeHost();
    filter.catch(new ForbiddenException("Insufficient role"), host);
    expect(captured.status).toBe(403);
    expect(captured.body).toMatchObject({
      type: "https://cmr.tv/problems/forbidden",
      status: 403,
      detail: "Insufficient role",
    });
  });

  it("hides internal error detail in production", () => {
    const { host, captured } = makeHost();
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      filter.catch(new Error("Database connection refused: redacted secrets"), host);
    } finally {
      process.env.NODE_ENV = previous;
    }
    expect(captured.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = captured.body as { detail?: string; status: number };
    expect(body.status).toBe(500);
    expect(body.detail).toBeUndefined();
  });

  it("includes detail for non-prod errors to aid debugging", () => {
    const { host, captured } = makeHost();
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      filter.catch(new Error("boom"), host);
    } finally {
      process.env.NODE_ENV = previous;
    }
    expect((captured.body as { detail?: string }).detail).toBe("boom");
  });

  it("maps custom HttpException with object payload", () => {
    const { host, captured } = makeHost();
    filter.catch(
      new HttpException({ message: "rate limited", error: "Too Many Requests" }, 429),
      host,
    );
    expect(captured.status).toBe(429);
    expect(captured.body).toMatchObject({
      type: "https://cmr.tv/problems/rate-limited",
      title: "Too Many Requests",
      status: 429,
      detail: "rate limited",
    });
  });
});
