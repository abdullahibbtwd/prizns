-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "title_bg" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "title_en" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "location_bg" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "location_en" TEXT;
