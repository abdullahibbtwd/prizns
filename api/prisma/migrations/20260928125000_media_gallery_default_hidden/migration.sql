-- New uploads stay out of the public /gallery unless the uploader opts in
-- (media library uploads send show_in_gallery=true). Existing rows are unchanged.
ALTER TABLE "media_assets" ALTER COLUMN "show_in_gallery" SET DEFAULT false;
