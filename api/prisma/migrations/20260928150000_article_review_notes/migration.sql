-- AlterTable
ALTER TABLE "articles" ADD COLUMN "review_note" TEXT,
ADD COLUMN "review_note_at" TIMESTAMP(3),
ADD COLUMN "submitted_for_review_at" TIMESTAMP(3);
