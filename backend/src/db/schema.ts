import { pgTable, serial, text, integer, real, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Media types: 'movie' or 'tv'
export const mediaItems = pgTable('media', {
  id: serial('id').primaryKey(),
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
  monitored: boolean('monitored').default(false),
  libraryPath: text('library_path'), // Root path where files should be
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Physical media files on disk
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
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
  matched: boolean('matched').default(false),
  matchConfidence: real('match_confidence'), // 0.0 - 1.0
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  scannedAt: timestamp('scanned_at'),
});

// Torrent providers configuration
export const providers = pgTable('providers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'public' | 'private'
  baseUrl: text('base_url').notNull(),
  enabled: boolean('enabled').default(true),
  // Config (JSON)
  config: text('config'), // API keys, cookies, etc.
  // Capabilities
  supportedTypes: text('supported_types'), // JSON: ['movie', 'tv']
  priority: integer('priority').default(50),
  // Status
  lastCheck: timestamp('last_check'),
  status: text('status'), // 'online' | 'offline' | 'error'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Search history
export const searches = pgTable('searches', {
  id: serial('id').primaryKey(),
  query: text('query').notNull(),
  type: text('type'), // 'movie' | 'tv' | 'general'
  providerId: integer('provider_id').references(() => providers.id),
  resultsCount: integer('results_count'),
  createdAt: timestamp('created_at').defaultNow(),
});

// TMDB match candidates for unidentified files
export const matchCandidates = pgTable('match_candidates', {
  id: serial('id').primaryKey(),
  fileId: integer('file_id').references(() => files.id),
  tmdbId: integer('tmdb_id').notNull(),
  type: text('type').notNull(), // 'movie' | 'tv'
  title: text('title').notNull(),
  year: integer('year'),
  posterPath: text('poster_path'),
  matchScore: real('match_score'), // 0.0 - 1.0
  status: text('status').default('pending'), // 'pending' | 'accepted' | 'rejected'
  createdAt: timestamp('created_at').defaultNow(),
});

// Download queue for torrents
export const downloads = pgTable('downloads', {
  id: serial('id').primaryKey(),
  mediaItemId: integer('media_item_id').references(() => mediaItems.id),
  torrentHash: text('torrent_hash').unique(),
  name: text('name'),
  status: text('status'), // 'queued', 'downloading', 'paused', 'completed', 'error'
  progress: real('progress'), // 0.0 - 1.0
  downloadSpeed: integer('download_speed'), // bytes/s
  eta: integer('eta'), // seconds
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Users for authentication
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // bcrypt hash
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  approved: boolean('approved').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Media requests (Overseerr-style)
export const mediaRequests = pgTable('media_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  tmdbId: integer('tmdb_id').notNull(),
  type: text('type').notNull(), // 'movie' | 'tv'
  title: text('title').notNull(),
  year: integer('year'),
  posterPath: text('poster_path'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'denied' | 'downloaded'
  userNote: text('user_note'), // Optional note from user
  adminNote: text('admin_note'), // Optional note from admin
  requestedAt: timestamp('requested_at').defaultNow(),
  processedAt: timestamp('processed_at'),
  processedBy: integer('processed_by').references(() => users.id), // admin userId
  mediaItemId: integer('media_item_id').references(() => mediaItems.id), // Set when approved + added
});

// Settings (key-value store)
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(), // JSON string
  updatedAt: timestamp('updated_at').defaultNow(),
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
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
