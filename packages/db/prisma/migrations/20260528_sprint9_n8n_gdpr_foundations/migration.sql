-- Sprint 9: foundations for n8n integration + GDPR right-to-be-forgotten.
-- All changes are ADDITIVE (no drops, no renames) so this migration is
-- forward-compatible on a hot production DB.

-- 1. New role for non-human service callers (n8n, GitHub Actions, cron).
--    Distinct from `admin` so its scope is narrower (no /users, no /auth/*).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'service_automation';

-- 2. AutomationRun — every execution kicked off by n8n (or any external
--    orchestrator) writes one row here. Provides a queryable activity log and
--    a foreign-key target for the audit chain.
CREATE TABLE IF NOT EXISTS "AutomationRun" (
  "id"            TEXT PRIMARY KEY,
  "workflowId"    TEXT NOT NULL,
  "executionId"   TEXT NOT NULL,
  "triggeredBy"   TEXT NOT NULL,
  "status"        TEXT NOT NULL,
  "startedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "finishedAt"    TIMESTAMPTZ,
  "errorMessage"  TEXT,
  "contentIds"    TEXT[] NOT NULL DEFAULT '{}',
  "metadata"      JSONB
);
CREATE INDEX IF NOT EXISTS "AutomationRun_workflowId_status_idx" ON "AutomationRun"("workflowId","status");
CREATE INDEX IF NOT EXISTS "AutomationRun_startedAt_idx" ON "AutomationRun"("startedAt" DESC);

-- 3. UserDeletionRequest — RGPD "right to be forgotten". A request is logged
--    BEFORE any data purge so the audit chain captures who asked for what.
--    Status workflow: pending → confirmed → executed | rejected | cancelled.
CREATE TABLE IF NOT EXISTS "UserDeletionRequest" (
  "id"             TEXT PRIMARY KEY,
  "targetUserId"   TEXT NOT NULL,
  "requestedById"  TEXT NOT NULL,
  "reason"         TEXT,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "requestedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "executedAt"     TIMESTAMPTZ,
  "summary"        JSONB,
  CONSTRAINT "UserDeletionRequest_target_fk" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE NO ACTION,
  CONSTRAINT "UserDeletionRequest_requester_fk" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE NO ACTION
);
CREATE INDEX IF NOT EXISTS "UserDeletionRequest_status_idx" ON "UserDeletionRequest"("status");
CREATE INDEX IF NOT EXISTS "UserDeletionRequest_requestedAt_idx" ON "UserDeletionRequest"("requestedAt" DESC);

-- 4. AuditAction additions: capture the new operations introduced by n8n + GDPR.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'automation_run';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gdpr_delete_request';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gdpr_delete_executed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'service_token_issued';
