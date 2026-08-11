-- Contact form inquiries + AI pre-filter categories
CREATE TYPE "ContactInquiryStatus" AS ENUM ('NEW', 'REVIEW', 'REPLIED', 'CLOSED');
CREATE TYPE "ContactInquiryCategory" AS ENUM ('BUSINESS', 'STORY_TIP', 'SPAM', 'GENERAL', 'UNKNOWN');

CREATE TABLE "contact_inquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "honeypot" TEXT,
    "status" "ContactInquiryStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "ai_category" "ContactInquiryCategory",
    "ai_summary" TEXT,
    "classified_at" TIMESTAMP(3),
    "auto_replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_inquiries_status_created_at_idx" ON "contact_inquiries"("status", "created_at");
CREATE INDEX "contact_inquiries_ai_category_created_at_idx" ON "contact_inquiries"("ai_category", "created_at");
CREATE INDEX "contact_inquiries_email_idx" ON "contact_inquiries"("email");
