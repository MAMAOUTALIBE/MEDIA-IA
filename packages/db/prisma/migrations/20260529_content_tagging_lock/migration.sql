-- Sprint A — race-condition fix on n8n auto-tagging
--
-- The n8n cron fires every 5 minutes. If Groq is slow (≥5min) on a draft, the
-- next tick re-picks the same draft and races: two PATCH /tags + two audit
-- entries for the same contentId. The audit log of N8N-INTEGRATION-PLAN
-- finding #3 calls this out as a critical idempotency issue.
--
-- Fix: optimistic lock with a 2-minute TTL, claimed atomically via
-- POST /api/contents/:id/tagging-claim before the LLM call.
ALTER TABLE "Content" ADD COLUMN "taggingStartedAt" TIMESTAMP(3);

-- Partial index — most drafts aren't being tagged at any given time, so a
-- composite (status, taggingStartedAt) index restricted to live rows keeps
-- the claim query at a single B-tree lookup even on a 1M-row table.
CREATE INDEX "Content_tagging_lock_idx"
  ON "Content"("status", "taggingStartedAt")
  WHERE "deletedAt" IS NULL;
