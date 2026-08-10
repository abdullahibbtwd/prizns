-- AlterEnum
ALTER TYPE "ArticleSection" ADD VALUE IF NOT EXISTS 'news';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TagKind" AS ENUM ('LOCATION', 'TOPIC', 'CATEGORY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnershipStatus" AS ENUM ('NEW', 'REVIEW', 'CONTACTED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable articles
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "behind_story_bg" TEXT NOT NULL DEFAULT '';
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "behind_story_en" TEXT;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "seo_title_bg" TEXT;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "seo_title_en" TEXT;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "seo_description_bg" TEXT;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "seo_description_en" TEXT;

-- AlterTable page_views
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "referrer" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "utm_source" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "utm_medium" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "utm_campaign" TEXT;

CREATE INDEX IF NOT EXISTS "page_views_utm_source_started_at_idx" ON "page_views"("utm_source", "started_at");

-- CreateTable tags
CREATE TABLE IF NOT EXISTS "tags" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "TagKind" NOT NULL,
    "name_bg" TEXT NOT NULL,
    "name_en" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tags_kind_slug_key" ON "tags"("kind", "slug");
CREATE INDEX IF NOT EXISTS "tags_kind_name_bg_idx" ON "tags"("kind", "name_bg");

CREATE TABLE IF NOT EXISTS "article_tags" (
    "article_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "article_tags_pkey" PRIMARY KEY ("article_id","tag_id")
);

CREATE INDEX IF NOT EXISTS "article_tags_tag_id_idx" ON "article_tags"("tag_id");

DO $$ BEGIN
  ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "partnership_inquiries" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "type" TEXT NOT NULL,
    "budget" TEXT,
    "message" TEXT NOT NULL,
    "honeypot" TEXT,
    "status" "PartnershipStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partnership_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "partnership_inquiries_status_created_at_idx" ON "partnership_inquiries"("status", "created_at");
CREATE INDEX IF NOT EXISTS "partnership_inquiries_email_idx" ON "partnership_inquiries"("email");

CREATE TABLE IF NOT EXISTS "donations" (
    "id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'bgn',
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "email" TEXT,
    "name" TEXT,
    "stripe_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "donations_stripe_session_id_key" ON "donations"("stripe_session_id");
CREATE INDEX IF NOT EXISTS "donations_status_created_at_idx" ON "donations"("status", "created_at");
