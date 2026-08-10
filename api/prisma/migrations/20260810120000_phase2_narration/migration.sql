-- Phase 2: Bulgarian TTS narration status on articles
CREATE TYPE "NarrationStatus" AS ENUM ('IDLE', 'PENDING', 'RUNNING', 'READY', 'FAILED');

ALTER TABLE "articles" ADD COLUMN "narration_status" "NarrationStatus" NOT NULL DEFAULT 'IDLE';
ALTER TABLE "articles" ADD COLUMN "narration_error" TEXT;
