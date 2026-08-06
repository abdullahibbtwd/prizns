-- AlterTable
ALTER TABLE "articles" ADD COLUMN "video_url" TEXT,
ADD COLUMN "video_media_id" TEXT;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_video_media_id_fkey" FOREIGN KEY ("video_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
