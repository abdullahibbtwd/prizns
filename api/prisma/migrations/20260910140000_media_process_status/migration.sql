-- CreateEnum
CREATE TYPE "MediaProcessStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "status" "MediaProcessStatus" NOT NULL DEFAULT 'DONE';
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "original_size" INTEGER;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "processed_size" INTEGER;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "thumbnail_key" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "temp_path" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "uploaded_by_id" TEXT;

UPDATE "media_assets" SET "original_size" = "size" WHERE "original_size" IS NULL AND "size" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "media_assets_status_idx" ON "media_assets"("status");
