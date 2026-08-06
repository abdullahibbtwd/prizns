-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title_bg" TEXT NOT NULL,
    "title_en" TEXT,
    "description_bg" TEXT NOT NULL DEFAULT '',
    "description_en" TEXT,
    "status" "SeriesStatus" NOT NULL DEFAULT 'DRAFT',
    "cover_media_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_episodes" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "series_slug_key" ON "series"("slug");

-- CreateIndex
CREATE INDEX "series_episodes_series_id_sort_order_idx" ON "series_episodes"("series_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "series_episodes_series_id_article_id_key" ON "series_episodes"("series_id", "article_id");

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_episodes" ADD CONSTRAINT "series_episodes_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_episodes" ADD CONSTRAINT "series_episodes_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
