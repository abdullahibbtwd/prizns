-- "Лом" is the town Lom; machine translation turned it into "Scrap".
UPDATE "tags"
SET "name_en" = 'Lom'
WHERE "kind" = 'LOCATION'
  AND "name_bg" = 'Лом'
  AND ("name_en" IS NULL OR lower("name_en") <> 'lom');
