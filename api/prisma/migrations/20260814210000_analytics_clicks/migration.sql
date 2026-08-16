-- CreateEnum
CREATE TYPE "AnalyticsClickKind" AS ENUM ('internal', 'outbound', 'cta');

-- CreateTable
CREATE TABLE "analytics_clicks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "visitor_key" TEXT NOT NULL,
    "reader_id" TEXT,
    "path" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "kind" "AnalyticsClickKind" NOT NULL,
    "article_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_clicks_created_at_idx" ON "analytics_clicks"("created_at");

-- CreateIndex
CREATE INDEX "analytics_clicks_href_created_at_idx" ON "analytics_clicks"("href", "created_at");

-- CreateIndex
CREATE INDEX "analytics_clicks_article_id_created_at_idx" ON "analytics_clicks"("article_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_clicks_session_id_idx" ON "analytics_clicks"("session_id");

-- AddForeignKey
ALTER TABLE "analytics_clicks" ADD CONSTRAINT "analytics_clicks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "analytics_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
