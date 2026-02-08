import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Media types: 'movie' or 'tv'
export const mediaItems = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'movie' | 'tv'
  title: text('title').notNull(),
  originalTitle: text('original_title'),
  year: integer('year'),
  tmdbId: integer('tmdb_id').unique(),
  imdbId: text('imdb_id'),
  overview: text('overview'),
  posterPath: text('poster_path'),
  backdropPath: text('backdrop_path'),
  voteAverage: real('vote_average'),
  voteCount: integer('vote_count'),
  genres: text('genres'), // JSON array
  runtime: integer('runtime'), // minutes (for movies)
  status: text('status'), // 'Released', 'In Production', etc.
  // TV specific
  numberOfSeasons: integer('number_of_seasons'),
  numberOfEpisodes: integer('number_of_episodes'),
  // Management
  monitored: integer('monitored').default(0), // 0=false, 1=true
  libraryPath: text('library_path'), // Root path where files should be
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Physical media files on disk
export const files = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  path: text('path').notNull().unique(),
  filename: text('filename').notNull(),
  size: integer('size'), // bytes
  // Parsed metadata
  parsedTitle: text('parsed_title'),
  parsedYear: integer('parsed_year'),
  parsedSeason: integer('parsed_season'),
  parsedEpisode: integer('parsed_episode'),
  parsedQuality: text('parsed_quality'),
  parsedEdition: text('parsed_edition'),
  parsedCodec: text('parsed_codec'),
  parsedSource: text('parsed_source'),
  // Matching
  mediaItemId: integer('media_item_id').references(() => mediaItems.id),
  matched: integer('matched').default(0), // 0=false, 1=true
  matchConfidence: real('match_confidence'), // 0.0 - 1.0
  // Timestamps
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  scannedAt: text('scanned_at'),
});

// Torrent providers configuration
export const providers = sqliteTable('providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'public' | 'private'
  baseUrl: text('base_url').notNull(),
  enabled: integer('enabled').default(1),
  // Config (JSON)
  config: text('config'), // API keys, cookies, etc.
  // Capabilities
  supportedTypes: text('supported_types'), // JSON: ['movie', 'tv']
  priority: integer('priority').default(50),
  // Status
  lastCheck: text('last_check'),
  status: text('status'), // 'online' | 'offline' | 'error'
  errorMessage: text('error_message'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Search history
export const searches = sqliteTable('searches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  query: text('query').notNull(),
  type: text('type'), // 'movie' | 'tv' | 'general'
  providerId: integer('provider_id').references(() => providers.id),
  resultsCount: integer('results_count'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// TMDB match candidates for unidentified files
export const matchCandidates = sqliteTable('match_candidates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileId: integer('file_id').references(() => files.id),
  tmdbId: integer('tmdb_id').notNull(),
  type: text('type').notNull(), // 'movie' | 'tv'
  title: text('title').notNull(),
  year: integer('year'),
  posterPath: text('poster_path'),
  matchScore: real('match_score'), // 0.0 - 1.0
  status: text('status').default('pending'), // 'pending' | 'accepted' | 'rejected'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Download queue for torrents
export const downloads = sqliteTable('downloads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mediaItemId: integer('media_item_id').references(() => mediaItems.id),
  torrentHash: text('torrent_hash').unique(),
  name: text('name'),
  status: text('status'), // 'queued', 'downloading', 'paused', 'completed', 'error'
  progress: real('progress'), // 0.0 - 1.0
  downloadSpeed: integer('download_speed'), // bytes/s
  eta: integer('eta'), // seconds
  error: text('error'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
});

// Users for authentication
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // bcrypt hash
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  approved: integer('approved').notNull().default(0), // 0=pending, 1=approved
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Media requests (Overseerr-style)
export const mediaRequests = sqliteTable('media_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  tmdbId: integer('tmdb_id').notNull(),
  type: text('type').notNull(), // 'movie' | 'tv'
  title: text('title').notNull(),
  year: integer('year'),
  posterPath: text('poster_path'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'denied' | 'downloaded'
  userNote: text('user_note'), // Optional note from user
  adminNote: text('admin_note'), // Optional note from admin
  requestedAt: text('requested_at').default(sql`CURRENT_TIMESTAMP`),
  processedAt: text('processed_at'),
  processedBy: integer('processed_by').references(() => users.id), // admin userId
  mediaItemId: integer('media_item_id').references(() => mediaItems.id), // Set when approved + added
});

// Types for TypeScript
export type MediaItem = typeof mediaItems.$inferSelect;
export type NewMediaItem = typeof mediaItems.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Search = typeof searches.$inferSelect;
export type NewSearch = typeof searches.$inferInsert;
export type MatchCandidate = typeof matchCandidates.$inferSelect;
export type NewMatchCandidate = typeof matchCandidates.$inferInsert;
export type Download = typeof downloads.$inferSelect;
export type NewDownload = typeof downloads.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type MediaRequest = typeof mediaRequests.$inferSelect;
export type NewMediaRequest = typeof mediaRequests.$inferInsert;
