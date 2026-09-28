-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MODERATOR';

-- AlterTable
ALTER TABLE "authors" ADD COLUMN "is_guest" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "authors_is_guest_idx" ON "authors"("is_guest");
