-- Fix tmdb_id unique constraint on media table
-- The old constraint was UNIQUE(tmdb_id) alone — caused "Unique constraint failed"
-- when identifying a file as a movie already in the library.
-- Drop it so application-level merge logic in the identify endpoint handles deduplication.

-- Drop the unique constraint (name confirmed from DB introspection)
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_tmdb_id_unique";

-- Also try alternate names from Prisma auto-generated migrations
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_tmdb_id_key";
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "Media_tmdb_id_key";
