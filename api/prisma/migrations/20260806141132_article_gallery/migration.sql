-- CreateTable
CREATE TABLE "article_gallery_items" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_gallery_items_article_id_sort_order_idx" ON "article_gallery_items"("article_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "article_gallery_items_article_id_media_id_key" ON "article_gallery_items"("article_id", "media_id");

-- AddForeignKey
ALTER TABLE "article_gallery_items" ADD CONSTRAINT "article_gallery_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_gallery_items" ADD CONSTRAINT "article_gallery_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
