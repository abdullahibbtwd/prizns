-- Semantic related articles: store Gemini embedding JSON on articles
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "embedding" JSONB;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "embedding_updated_at" TIMESTAMP(3);
