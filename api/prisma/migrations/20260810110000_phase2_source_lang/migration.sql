-- Phase 2: persist detected editor language for translation jobs
ALTER TABLE "authors" ADD COLUMN "source_lang" TEXT;
ALTER TABLE "articles" ADD COLUMN "source_lang" TEXT;
ALTER TABLE "series" ADD COLUMN "source_lang" TEXT;
