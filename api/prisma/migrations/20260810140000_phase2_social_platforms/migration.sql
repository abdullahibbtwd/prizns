-- Flexible platform codes + saved workspace selection
ALTER TABLE "social_posts" ALTER COLUMN "platform" TYPE TEXT USING ("platform"::text);

DROP TYPE IF EXISTS "SocialPlatform";

CREATE TABLE "social_workspace_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "platforms" TEXT[] NOT NULL DEFAULT ARRAY['FACEBOOK', 'INSTAGRAM', 'TIKTOK']::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_workspace_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "social_workspace_settings" ("id", "platforms", "updated_at")
VALUES ('default', ARRAY['FACEBOOK', 'INSTAGRAM', 'TIKTOK']::TEXT[], CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
