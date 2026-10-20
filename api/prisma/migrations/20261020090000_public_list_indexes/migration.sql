-- Public listing hot path: filter by status+section, order by publishedAt.
CREATE INDEX IF NOT EXISTS "articles_status_section_published_at_idx"
  ON "articles" ("status", "section", "published_at" DESC);

-- Tag filter EXISTS lookups (tagId → articleId covering).
CREATE INDEX IF NOT EXISTS "article_tags_tag_id_article_id_idx"
  ON "article_tags" ("tag_id", "article_id");
