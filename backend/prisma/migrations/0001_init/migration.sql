-- Initial schema migration
-- Creates all base tables (safe to run on existing DB via IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users"("username");

CREATE TABLE IF NOT EXISTS "media" (
    "id" SERIAL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original_title" TEXT,
    "year" INTEGER,
    "tmdb_id" INTEGER,
    "imdb_id" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "vote_average" REAL,
    "vote_count" INTEGER,
    "genres" TEXT,
    "runtime" INTEGER,
    "status" TEXT,
    "number_of_seasons" INTEGER,
    "number_of_episodes" INTEGER,
    "monitored" BOOLEAN DEFAULT false,
    "library_path" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "files" (
    "id" SERIAL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" BIGINT,
    "parsed_title" TEXT,
    "parsed_year" INTEGER,
    "parsed_season" INTEGER,
    "parsed_episode" INTEGER,
    "parsed_quality" TEXT,
    "parsed_edition" TEXT,
    "parsed_codec" TEXT,
    "parsed_source" TEXT,
    "media_item_id" INTEGER,
    "matched" BOOLEAN DEFAULT false,
    "match_confidence" REAL,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "scanned_at" TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "files_path_unique" ON "files"("path");

CREATE TABLE IF NOT EXISTS "downloads" (
    "id" SERIAL PRIMARY KEY,
    "media_item_id" INTEGER,
    "torrent_hash" TEXT,
    "name" TEXT,
    "status" TEXT,
    "progress" REAL,
    "download_speed" INTEGER,
    "eta" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "completed_at" TIMESTAMP
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'downloads_torrent_hash_unique') THEN
    ALTER TABLE "downloads" ADD CONSTRAINT "downloads_torrent_hash_unique" UNIQUE ("torrent_hash");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "match_candidates" (
    "id" SERIAL PRIMARY KEY,
    "file_id" INTEGER,
    "tmdb_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "poster_path" TEXT,
    "match_score" REAL,
    "status" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "media_requests" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "poster_path" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "user_note" TEXT,
    "admin_note" TEXT,
    "requested_at" TIMESTAMP DEFAULT NOW(),
    "processed_at" TIMESTAMP,
    "processed_by" INTEGER,
    "media_item_id" INTEGER
);

CREATE TABLE IF NOT EXISTS "providers" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "config" TEXT,
    "supported_types" TEXT,
    "priority" INTEGER DEFAULT 50,
    "last_check" TIMESTAMP,
    "status" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "searches" (
    "id" SERIAL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "type" TEXT,
    "provider_id" INTEGER,
    "results_count" INTEGER,
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "settings" (
    "id" SERIAL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "settings_key_unique" ON "settings"("key");
