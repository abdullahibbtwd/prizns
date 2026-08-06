-- CreateEnum
CREATE TYPE "ArticleSection" AS ENUM ('featured', 'human-stories', 'places', 'traditions', 'discover', 'voices', 'sports', 'events', 'video', 'campaigns');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'RUNNING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

-- CreateTable
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_bg" TEXT NOT NULL,
    "name_en" TEXT,
    "role_bg" TEXT NOT NULL,
    "role_en" TEXT,
    "location_bg" TEXT,
    "location_en" TEXT,
    "quote_bg" TEXT,
    "quote_en" TEXT,
    "bio_bg" TEXT,
    "bio_en" TEXT,
    "image_url" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "original_name" TEXT,
    "size" INTEGER,
    "credit_bg" TEXT,
    "credit_en" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "section" "ArticleSection" NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "category_bg" TEXT NOT NULL,
    "category_en" TEXT,
    "title_bg" TEXT NOT NULL,
    "title_en" TEXT,
    "subtitle_bg" TEXT NOT NULL DEFAULT '',
    "subtitle_en" TEXT,
    "read_time_bg" TEXT NOT NULL DEFAULT '',
    "read_time_en" TEXT,
    "location_bg" TEXT NOT NULL DEFAULT '',
    "location_en" TEXT,
    "date_bg" TEXT NOT NULL DEFAULT '',
    "date_en" TEXT,
    "photo_credit_bg" TEXT NOT NULL DEFAULT '',
    "photo_credit_en" TEXT,
    "end_label_bg" TEXT NOT NULL DEFAULT 'Край',
    "end_label_en" TEXT,
    "speaker_bg" TEXT,
    "speaker_en" TEXT,
    "audio_duration" TEXT,
    "body" JSONB NOT NULL DEFAULT '[]',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "translation_status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "translation_error" TEXT,
    "author_id" TEXT,
    "hero_media_id" TEXT,
    "audio_media_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_key_key" ON "media_assets"("key");

-- CreateIndex
CREATE INDEX "articles_status_section_idx" ON "articles"("status", "section");

-- CreateIndex
CREATE INDEX "articles_author_id_idx" ON "articles"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_section_slug_key" ON "articles"("section", "slug");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_media_id_fkey" FOREIGN KEY ("hero_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_audio_media_id_fkey" FOREIGN KEY ("audio_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
