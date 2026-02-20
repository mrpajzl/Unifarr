-- Phase 4: DB Optimization
-- Add indexes and soft delete column

-- User: Add preferredLanguage
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- Media: Add soft delete and indexes
ALTER TABLE media ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_media_deleted_at ON media(deleted_at);
CREATE INDEX IF NOT EXISTS idx_media_tmdb_id ON media(tmdb_id);

-- File: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_matched ON files(matched);
CREATE INDEX IF NOT EXISTS idx_files_media_item_id ON files(media_item_id);
CREATE INDEX IF NOT EXISTS idx_files_season_episode ON files(parsed_season, parsed_episode);

-- Download: Add indexes
CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
CREATE INDEX IF NOT EXISTS idx_downloads_media_item_id ON downloads(media_item_id);
CREATE INDEX IF NOT EXISTS idx_downloads_torrent_hash ON downloads(torrent_hash);
