-- Social review desk + Episode of the Day digest log
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK');
CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED');
CREATE TYPE "DigestSendStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "body" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL DEFAULT '',
    "prompt_version" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "external_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_posts_article_id_platform_key" ON "social_posts"("article_id", "platform");
CREATE INDEX "social_posts_status_updated_at_idx" ON "social_posts"("status", "updated_at");
CREATE INDEX "social_posts_platform_status_idx" ON "social_posts"("platform", "status");

ALTER TABLE "social_posts"
  ADD CONSTRAINT "social_posts_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "episode_digest_sends" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "status" "DigestSendStatus" NOT NULL DEFAULT 'SENT',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "resend_id" TEXT,
    "error" TEXT,
    "subject" TEXT NOT NULL DEFAULT '',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episode_digest_sends_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "episode_digest_sends_series_id_article_id_key" ON "episode_digest_sends"("series_id", "article_id");
CREATE INDEX "episode_digest_sends_sent_at_idx" ON "episode_digest_sends"("sent_at");

ALTER TABLE "episode_digest_sends"
  ADD CONSTRAINT "episode_digest_sends_series_id_fkey"
  FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "episode_digest_sends"
  ADD CONSTRAINT "episode_digest_sends_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
