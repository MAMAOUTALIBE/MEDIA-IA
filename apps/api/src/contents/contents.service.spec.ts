import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ContentsService } from "./contents.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";

const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

const USER_ID = "test-tagging-user";
const CONTENT_ID = "test-tagging-content";

describe.skipIf(!TEST_DB_URL)("ContentsService.claimForTagging (integration)", () => {
  let prisma: PrismaService;
  let svc: ContentsService;
  let auditMock: { log: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    prisma = new PrismaService({ datasources: { db: { url: TEST_DB_URL } } } as never);
    await prisma.$connect();
    auditMock = { log: vi.fn().mockResolvedValue(undefined) };
    svc = new ContentsService(prisma, auditMock as unknown as AuditService);

    // Seed a deterministic user once. Other tests in the suite use other ids.
    await prisma.user.upsert({
      where: { id: USER_ID },
      update: { active: true },
      create: {
        id: USER_ID,
        email: "test.tagging@cmr.tv",
        name: "Test Tagging",
        role: "journalist",
        active: true,
        initials: "TT",
        color: "#888888",
      },
    });
  });

  afterAll(async () => {
    await prisma.content.deleteMany({ where: { id: { startsWith: "test-tagging-" } } });
    await prisma.auditEvent.deleteMany({ where: { target: { startsWith: "content:test-tagging-" } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: "test-tagging-" } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    auditMock.log.mockClear();
    await prisma.content.upsert({
      where: { id: CONTENT_ID },
      update: {
        status: "draft",
        tags: [],
        summary: null,
        taggingStartedAt: null,
        deletedAt: null,
      },
      create: {
        id: CONTENT_ID,
        title: "Test Draft",
        body: "Test body content used by tagging-lock vitest.",
        type: "article",
        status: "draft",
        authorId: USER_ID,
        tags: [],
      },
    });
  });

  it("claims an unlocked draft and logs to the audit chain", async () => {
    const result = await svc.claimForTagging(CONTENT_ID, { ip: "10.0.0.1" });
    expect(result.contentId).toBe(CONTENT_ID);
    expect(result.ttlSeconds).toBe(120);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(auditMock.log).toHaveBeenCalledTimes(1);
    expect(auditMock.log.mock.calls[0][0]).toMatchObject({
      action: "automation_run",
      target: `content:${CONTENT_ID}`,
      severity: "info",
      status: "success",
      metadata: { event: "tagging_claimed", ttlMinutes: 2 },
    });

    const row = await prisma.content.findUnique({ where: { id: CONTENT_ID } });
    expect(row?.taggingStartedAt).toBeInstanceOf(Date);
  });

  it("rejects a second concurrent claim with 409 ConflictException", async () => {
    await svc.claimForTagging(CONTENT_ID);
    await expect(svc.claimForTagging(CONTENT_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    // First claim should have audited, the rejected second one MUST NOT.
    expect(auditMock.log).toHaveBeenCalledTimes(1);
  });

  it("re-claims after the lock TTL has expired", async () => {
    await svc.claimForTagging(CONTENT_ID);
    // Simulate the lock being older than 2 minutes — set it 3 minutes ago.
    await prisma.content.update({
      where: { id: CONTENT_ID },
      data: { taggingStartedAt: new Date(Date.now() - 3 * 60_000) },
    });
    const result = await svc.claimForTagging(CONTENT_ID);
    expect(result.contentId).toBe(CONTENT_ID);
    expect(auditMock.log).toHaveBeenCalledTimes(2);
  });

  it("rejects a claim on a non-draft content (409)", async () => {
    await prisma.content.update({
      where: { id: CONTENT_ID },
      data: { status: "published" },
    });
    await expect(svc.claimForTagging(CONTENT_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("rejects a claim on a soft-deleted content (404)", async () => {
    await prisma.content.update({
      where: { id: CONTENT_ID },
      data: { deletedAt: new Date() },
    });
    await expect(svc.claimForTagging(CONTENT_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects a claim on a non-existent content (404)", async () => {
    await expect(
      svc.claimForTagging("test-tagging-ghost"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("releases the lock when applyAutoTags writes tags", async () => {
    await svc.claimForTagging(CONTENT_ID);
    const beforeApply = await prisma.content.findUnique({
      where: { id: CONTENT_ID },
    });
    expect(beforeApply?.taggingStartedAt).not.toBeNull();

    await svc.applyAutoTags(CONTENT_ID, {
      tags: ["politique", "budget"],
      summary: "A short summary at least ten chars.",
    });
    const after = await prisma.content.findUnique({
      where: { id: CONTENT_ID },
    });
    expect(after?.taggingStartedAt).toBeNull();
    expect(after?.tags).toEqual(["politique", "budget"]);
    expect(after?.summary).toBe("A short summary at least ten chars.");
  });

  it("releases the lock when applyAutoTags hits idempotency guard (already tagged)", async () => {
    // Seed a content that already has tags + an orphaned lock.
    await prisma.content.update({
      where: { id: CONTENT_ID },
      data: {
        tags: ["existing"],
        summary: "previous summary",
        taggingStartedAt: new Date(),
      },
    });
    const ret = await svc.applyAutoTags(CONTENT_ID, {
      tags: ["new-tag"],
      summary: "new summary",
    });
    expect(ret.tags).toEqual(["existing"]); // unchanged
    const after = await prisma.content.findUnique({
      where: { id: CONTENT_ID },
    });
    expect(after?.taggingStartedAt).toBeNull(); // lock released
  });
});
