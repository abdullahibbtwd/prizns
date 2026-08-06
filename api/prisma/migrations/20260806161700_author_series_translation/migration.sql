-- AlterTable
ALTER TABLE "authors" ADD COLUMN "translation_status" "TranslationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "authors" ADD COLUMN "translation_error" TEXT;

-- AlterTable
ALTER TABLE "series" ADD COLUMN "translation_status" "TranslationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "series" ADD COLUMN "translation_error" TEXT;
