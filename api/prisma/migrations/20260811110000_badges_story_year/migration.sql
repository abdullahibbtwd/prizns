-- CreateEnum
CREATE TYPE "StoryYearCampaignStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_bg" TEXT NOT NULL,
    "name_en" TEXT,
    "description_bg" TEXT NOT NULL DEFAULT '',
    "description_en" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'award',
    "min_published" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_badges" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'auto',

    CONSTRAINT "author_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_year_campaigns" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title_bg" TEXT NOT NULL,
    "title_en" TEXT,
    "description_bg" TEXT NOT NULL DEFAULT '',
    "description_en" TEXT,
    "status" "StoryYearCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "opens_at" TIMESTAMP(3),
    "closes_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_year_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_year_nominations" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_year_nominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_year_votes" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "nomination_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "reader_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_year_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "badges_slug_key" ON "badges"("slug");

-- CreateIndex
CREATE INDEX "badges_is_active_sort_order_idx" ON "badges"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "author_badges_badge_id_idx" ON "author_badges"("badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "author_badges_author_id_badge_id_key" ON "author_badges"("author_id", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_year_campaigns_year_key" ON "story_year_campaigns"("year");

-- CreateIndex
CREATE INDEX "story_year_nominations_campaign_id_sort_order_idx" ON "story_year_nominations"("campaign_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "story_year_nominations_campaign_id_article_id_key" ON "story_year_nominations"("campaign_id", "article_id");

-- CreateIndex
CREATE INDEX "story_year_votes_nomination_id_idx" ON "story_year_votes"("nomination_id");

-- CreateIndex
CREATE INDEX "story_year_votes_article_id_idx" ON "story_year_votes"("article_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_year_votes_campaign_id_reader_id_key" ON "story_year_votes"("campaign_id", "reader_id");

-- AddForeignKey
ALTER TABLE "author_badges" ADD CONSTRAINT "author_badges_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_badges" ADD CONSTRAINT "author_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_year_nominations" ADD CONSTRAINT "story_year_nominations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "story_year_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_year_nominations" ADD CONSTRAINT "story_year_nominations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_year_votes" ADD CONSTRAINT "story_year_votes_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "story_year_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_year_votes" ADD CONSTRAINT "story_year_votes_nomination_id_fkey" FOREIGN KEY ("nomination_id") REFERENCES "story_year_nominations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_year_votes" ADD CONSTRAINT "story_year_votes_reader_id_fkey" FOREIGN KEY ("reader_id") REFERENCES "readers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed starter badges
INSERT INTO "badges" ("id", "slug", "name_bg", "name_en", "description_bg", "description_en", "icon", "min_published", "is_active", "sort_order", "created_at", "updated_at")
VALUES
  ('badge_first_story', 'first-story', 'Първа история', 'First Story', 'Публикувана поне една история в Призни.', 'Published at least one story in Prizni.', 'feather', 1, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('badge_chronicler', 'chronicler', 'Летописец', 'Chronicler', 'Пет публикувани истории.', 'Five published stories.', 'book-open', 5, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('badge_storyteller', 'storyteller', 'Разказвач', 'Storyteller', 'Петнадесет публикувани истории.', 'Fifteen published stories.', 'sparkles', 15, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('badge_voice_nw', 'voice-of-northwest', 'Глас на Северозапада', 'Voice of the Northwest', 'Ръчно отличие за изключителен принос към региона.', 'Manual honour for outstanding regional contribution.', 'map-pin', NULL, true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
