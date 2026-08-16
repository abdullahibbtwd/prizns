-- CreateEnum
CREATE TYPE "GeocodeStatus" AS ENUM ('idle', 'ok', 'failed', 'manual');

-- AlterTable
ALTER TABLE "tags" ADD COLUMN "lat" DOUBLE PRECISION,
ADD COLUMN "lng" DOUBLE PRECISION,
ADD COLUMN "geocode_status" "GeocodeStatus" NOT NULL DEFAULT 'idle',
ADD COLUMN "geocoded_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tags_kind_lat_lng_idx" ON "tags"("kind", "lat", "lng");
