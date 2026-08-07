-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NEW', 'REVIEW', 'CHANGES', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "place" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "links" TEXT,
    "own_work" BOOLEAN NOT NULL DEFAULT true,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NEW',
    "photo_urls" JSONB NOT NULL DEFAULT '[]',
    "document_urls" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "article_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submissions_status_created_at_idx" ON "submissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "submissions_email_idx" ON "submissions"("email");
