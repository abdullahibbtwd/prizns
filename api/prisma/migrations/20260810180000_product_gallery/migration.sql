CREATE TABLE "product_gallery_items" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_gallery_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_gallery_items_product_id_media_id_key" ON "product_gallery_items"("product_id", "media_id");
CREATE INDEX "product_gallery_items_product_id_sort_order_idx" ON "product_gallery_items"("product_id", "sort_order");

ALTER TABLE "product_gallery_items" ADD CONSTRAINT "product_gallery_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_gallery_items" ADD CONSTRAINT "product_gallery_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
