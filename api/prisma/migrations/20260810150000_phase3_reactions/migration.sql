-- Phase 3: anonymous “I Relate” reactions
CREATE TABLE "article_reactions" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'RELATE',
    "visitor_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "article_reactions_article_id_kind_visitor_key_key" ON "article_reactions"("article_id", "kind", "visitor_key");

CREATE INDEX "article_reactions_article_id_kind_idx" ON "article_reactions"("article_id", "kind");

ALTER TABLE "article_reactions" ADD CONSTRAINT "article_reactions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
