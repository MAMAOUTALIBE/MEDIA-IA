import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { GdprService } from "./gdpr.service";

/**
 * Unit tests for the GDPR service using mocked Prisma + Audit. Full
 * integration tests against a real DB live in /test (skipped without
 * TEST_DATABASE_URL) and aren't duplicated here — the unit suite just guards
 * the orchestration logic: not-found handling, 4-eyes assertion, ordering
 * of audit writes.
 */

function makePrismaMock(opts: {
  user?: unknown;
  deletionRequest?: unknown;
  txSummary?: Record<string, number>;
}) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(opts.user ?? null),
      update: vi.fn().mockResolvedValue(opts.user ?? null),
    },
    userDeletionRequest: {
      create: vi.fn().mockImplementation(({ data }) => ({ id: "req-1", ...data })),
      findUnique: vi.fn().mockResolvedValue(opts.deletionRequest ?? null),
      update: vi.fn().mockResolvedValue(opts.deletionRequest ?? null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    session: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
    notification: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
    comment: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
    content: { updateMany: vi.fn().mockResolvedValue({ count: 4 }) },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const result = await fn({
        session: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
        notification: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
        comment: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
        content: { updateMany: vi.fn().mockResolvedValue({ count: 4 }) },
        user: { update: vi.fn().mockResolvedValue(opts.user ?? null) },
        userDeletionRequest: {
          update: vi.fn().mockResolvedValue({}),
        },
      });
      return result;
    }),
  };
}

const auditMock = () => ({ log: vi.fn().mockResolvedValue(undefined) });

describe("GdprService.requestDeletion", () => {
  it("throws NotFound when the target does not exist", async () => {
    const prisma = makePrismaMock({ user: null });
    const svc = new GdprService(prisma as never, auditMock() as never);
    await expect(
      svc.requestDeletion({ targetUserId: "ghost", requestedByUserId: "admin" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates a pending request and writes an audit entry", async () => {
    const prisma = makePrismaMock({ user: { id: "u10", email: "x@cmr.tv" } });
    const audit = auditMock();
    const svc = new GdprService(prisma as never, audit as never);
    const req = await svc.requestDeletion({
      targetUserId: "u10",
      requestedByUserId: "admin1",
      reason: "RGPD demand",
    });
    expect(req).toMatchObject({ targetUserId: "u10", status: "pending" });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin1",
        action: "gdpr_delete_request",
        target: "u10",
      }),
    );
  });
});

describe("GdprService.executeDeletion", () => {
  const stubRequest = (overrides: Record<string, unknown> = {}) => ({
    id: "req-1",
    targetUserId: "u10",
    requestedById: "admin1",
    status: "pending",
    reason: null,
    ...overrides,
  });

  it("rejects when request not found", async () => {
    const prisma = makePrismaMock({ deletionRequest: null });
    const svc = new GdprService(prisma as never, auditMock() as never);
    await expect(
      svc.executeDeletion({ requestId: "ghost", executedByUserId: "admin2" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("enforces 4-eyes — requester cannot also execute", async () => {
    const prisma = makePrismaMock({
      deletionRequest: stubRequest(),
      user: { id: "u10" },
    });
    const svc = new GdprService(prisma as never, auditMock() as never);
    await expect(
      svc.executeDeletion({ requestId: "req-1", executedByUserId: "admin1" }),
    ).rejects.toThrow(/four-eyes/i);
  });

  it("rejects already-executed request", async () => {
    const prisma = makePrismaMock({
      deletionRequest: stubRequest({ status: "executed" }),
      user: { id: "u10" },
    });
    const svc = new GdprService(prisma as never, auditMock() as never);
    await expect(
      svc.executeDeletion({ requestId: "req-1", executedByUserId: "admin2" }),
    ).rejects.toThrow(/cannot execute/);
  });

  it("on success: writes a critical audit event with the purge summary", async () => {
    const prisma = makePrismaMock({
      deletionRequest: stubRequest(),
      user: { id: "u10" },
    });
    const audit = auditMock();
    const svc = new GdprService(prisma as never, audit as never);
    const r = await svc.executeDeletion({ requestId: "req-1", executedByUserId: "admin2" });
    expect(r.summary).toMatchObject({
      sessions: 2,
      notifications: 5,
      comments: 3,
      contents: 4,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "gdpr_delete_executed",
        severity: "critical",
        target: "u10",
      }),
    );
  });
});
