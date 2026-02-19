-- Fix tmdb_id unique constraint on media table
-- Old constraint was UNIQUE(tmdb_id) alone — doesn't allow same TMDB ID for movie + TV,
-- and crashes when identifying a duplicate file as the same movie.
-- New behavior: merge duplicates in code; DB no longer enforces uniqueness here.

-- Drop the old unique index / constraint (try both naming conventions)
DROP INDEX IF EXISTS "media_tmdb_id_key";
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_tmdb_id_key";
DROP INDEX IF EXISTS "media_tmdb_id_unique";
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_tmdb_id_unique";
DROP INDEX IF EXISTS "Media_tmdb_id_key";
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "Media_tmdb_id_key";

-- Uniqueness is now enforced at the application level (merge logic in identify endpoint).
-- This allows the same TMDB ID to temporarily appear in two rows during a race condition,
-- but the merge transaction resolves it cleanly.
