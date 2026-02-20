-- Phase 5: Multi-Language Refactor
-- WARNING: This is a BREAKING CHANGE migration
-- Backup database before running!

BEGIN;

-- 1. Create media_translations table
CREATE TABLE IF NOT EXISTS media_translations (
  id SERIAL PRIMARY KEY,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,
  title TEXT NOT NULL,
  overview TEXT,
  tagline TEXT,
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(media_id, language)
);

CREATE INDEX idx_translations_expires ON media_translations(expires_at);

-- 2. Add tagline column to media
ALTER TABLE media ADD COLUMN IF NOT EXISTS tagline TEXT;

-- 3. Migrate existing data:
--    Step A: Copy titleEn → title (EN becomes base)
--    Step B: Save old title (CZ) to translations table if different from titleEn
--    Step C: Save old overview (CZ) to translations table if different from overviewEn

-- Create temporary columns for backup
ALTER TABLE media ADD COLUMN IF NOT EXISTS _old_title TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS _old_overview TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS _old_title_en TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS _old_overview_en TEXT;

-- Backup current data
UPDATE media SET 
  _old_title = title,
  _old_overview = overview,
  _old_title_en = title_en,
  _old_overview_en = overview_en;

-- Set title = titleEn (EN is now base)
UPDATE media SET 
  title = COALESCE(title_en, title),
  overview = COALESCE(overview_en, overview)
WHERE title_en IS NOT NULL;

-- Migrate CZ translations (if different from EN)
INSERT INTO media_translations (media_id, language, title, overview, expires_at)
SELECT 
  id,
  'cs',
  _old_title,
  _old_overview,
  NOW() + INTERVAL '30 days'
FROM media
WHERE 
  _old_title IS NOT NULL 
  AND _old_title != '' 
  AND (_old_title != title OR _old_overview != overview);

-- 4. Drop old columns (titleEn, overviewEn are now redundant)
ALTER TABLE media DROP COLUMN IF EXISTS title_en;
ALTER TABLE media DROP COLUMN IF EXISTS overview_en;

-- 5. Clean up temporary columns
ALTER TABLE media DROP COLUMN IF EXISTS _old_title;
ALTER TABLE media DROP COLUMN IF EXISTS _old_overview;
ALTER TABLE media DROP COLUMN IF EXISTS _old_title_en;
ALTER TABLE media DROP COLUMN IF EXISTS _old_overview_en;

COMMIT;

-- Verification queries (run after migration):
-- SELECT COUNT(*) FROM media_translations; -- Should show migrated CZ translations
-- SELECT title, original_title FROM media LIMIT 10; -- Verify EN titles
-- SELECT * FROM media_translations LIMIT 10; -- Check translations
