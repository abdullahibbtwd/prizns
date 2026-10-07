-- Replace Resend API key with SMTP configuration on site_settings.
ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "resend_api_key_enc";

ALTER TABLE "site_settings" ADD COLUMN "smtp_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "site_settings" ADD COLUMN "smtp_host" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "smtp_port" INTEGER;
ALTER TABLE "site_settings" ADD COLUMN "smtp_user" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "smtp_password_enc" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "smtp_security" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "mail_from_name" TEXT;
