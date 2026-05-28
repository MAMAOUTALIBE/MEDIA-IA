-- Sprint 9 follow-up: Content.tags + Content.summary.
-- Used by the n8n "Auto-tagging IA" workflow (PATCH /api/contents/:id/tags).
-- Additive only — safe for hot production rollout.

ALTER TABLE "Content"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "Content"
  ADD COLUMN IF NOT EXISTS "summary" TEXT;

-- GIN index on tags for cheap filtering by tag (status filter already indexed).
CREATE INDEX IF NOT EXISTS "Content_tags_idx" ON "Content" USING GIN ("tags");
