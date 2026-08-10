-- CreateEnum
CREATE TYPE "EstimatedArrivalDayType" AS ENUM ('BUSINESS', 'CALENDAR');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "estimated_arrival_min_days" INTEGER;
ALTER TABLE "products" ADD COLUMN "estimated_arrival_max_days" INTEGER;
ALTER TABLE "products" ADD COLUMN "estimated_arrival_day_type" "EstimatedArrivalDayType";
