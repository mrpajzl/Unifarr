-- AlterTable: Add multi-language support for media metadata
-- titleEn and overviewEn store English versions (used for folder names and universal fallback)
-- title and overview remain for localized versions (user's preferred language)

ALTER TABLE "media" ADD COLUMN "title_en" TEXT;
ALTER TABLE "media" ADD COLUMN "overview_en" TEXT;

-- Backfill: Copy existing title to titleEn for backwards compatibility
-- (existing titles are likely Czech, but better than NULL)
UPDATE "media" SET "title_en" = "title" WHERE "title_en" IS NULL;
