import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";

const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!;

describe("AuditService chain", () => {
  let prisma: PrismaService;
  let audit: AuditService;

  beforeAll(async () => {
    prisma = new PrismaService({ datasources: { db: { url: TEST_DB_URL } } } as never);
    await prisma.$connect();
    audit = new AuditService(prisma);
    // clean slate so the test verifies a deterministic mini-chain
    await prisma.auditEvent.deleteMany({ where: { target: { startsWith: "audit-test-" } } });
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { target: { startsWith: "audit-test-" } } });
    await prisma.$disconnect();
  });

  it("appends events with linked checksum (next.checksum changes when prev changes)", async () => {
    const e1 = await audit.log({ action: "login", target: "audit-test-1", severity: "info" });
    const e2 = await audit.log({ action: "logout", target: "audit-test-2", severity: "info" });
    expect(e1.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(e2.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(e1.checksumSha256).not.toBe(e2.checksumSha256);
  });

  it("verifyChain returns valid=true on intact chain", async () => {
    const r = await audit.verifyChain();
    expect(r.valid).toBe(true);
    expect(r.brokenAt).toBeNull();
  });

  it("verifyChain returns valid=false if an event is tampered", async () => {
    const tampered = await prisma.auditEvent.findFirst({
      where: { target: "audit-test-1" },
    });
    if (!tampered) throw new Error("seed event missing");
    await prisma.auditEvent.update({
      where: { id: tampered.id },
      data: { target: "audit-test-1-TAMPERED" },
    });
    const r = await audit.verifyChain();
    expect(r.valid).toBe(false);
    expect(r.brokenAt).toBe(tampered.id);
  });
});
