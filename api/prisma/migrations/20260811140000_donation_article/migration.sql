-- Optional story link for “Support This Story” micro-donations
ALTER TABLE "donations" ADD COLUMN "article_id" TEXT;

CREATE INDEX "donations_article_id_idx" ON "donations"("article_id");

ALTER TABLE "donations" ADD CONSTRAINT "donations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
