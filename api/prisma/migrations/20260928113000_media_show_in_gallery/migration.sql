-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN "show_in_gallery" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "media_assets_kind_show_in_gallery_created_at_idx" ON "media_assets"("kind", "show_in_gallery", "created_at");
