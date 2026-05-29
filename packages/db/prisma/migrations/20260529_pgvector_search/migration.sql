-- Sprint Search — semantic search on Content via pgvector
--
-- Embed each content (title + body) with a 384-dim model (Groq doesn't expose
-- embeddings publicly yet, so we'll use OpenAI text-embedding-3-small at 384
-- dims via dimensions=384, or a local sentence-transformers fallback).
-- 384 instead of 1536 keeps the index small (1500-row table → ~1.5 MB index).
--
-- We use ivfflat for similarity search — good enough up to ~1M rows. Switch
-- to hnsw when needed (pgvector ≥ 0.5).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "embedding" vector(384);
ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "embeddedAt" TIMESTAMP(3);

-- ivfflat index for cosine distance. Lists ~= sqrt(N) where N is the table
-- size at the time of CREATE INDEX. For a 10k-row table use lists=100; we'll
-- start small (lists=10) and let the cluster admin tune later via REINDEX.
CREATE INDEX IF NOT EXISTS "Content_embedding_idx"
  ON "Content"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 10);
