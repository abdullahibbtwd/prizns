-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "youtube_url" TEXT,
    "tiktok_url" TEXT,
    "photographer_credit_name" TEXT,
    "photographer_credit_url" TEXT,
    "shop_public" BOOLEAN NOT NULL DEFAULT false,
    "donation_presets" INTEGER[] DEFAULT ARRAY[5, 10, 15]::INTEGER[],
    "stripe_secret_key_enc" TEXT,
    "stripe_webhook_secret_enc" TEXT,
    "resend_api_key_enc" TEXT,
    "mail_from" TEXT,
    "admin_notify_email" TEXT,
    "notify_admin_on_submission" BOOLEAN NOT NULL DEFAULT true,
    "notify_submitter_on_receipt" BOOLEAN NOT NULL DEFAULT true,
    "notify_submitter_on_decision" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
