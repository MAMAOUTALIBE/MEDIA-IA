-- Sprint 9 — n8n auto-tagging IA
-- Add tags + summary columns to Content for the n8n service_automation worker.
ALTER TABLE "Content" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Content" ADD COLUMN "summary" TEXT;

-- GIN index for fast tag filtering (used by n8n worker fetching ?hasNoTags=true)
CREATE INDEX "Content_tags_idx" ON "Content" USING GIN ("tags");
