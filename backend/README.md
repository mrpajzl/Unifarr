# Unifarr Backend API

A unified media management backend for movies and TV shows, with library scanning, TMDB matching, and torrent provider integration.

## Features

- 🎬 **Library Scanner**: Recursively scan directories and parse media files
- 🔍 **Smart Parser**: Extract metadata from filenames (title, year, quality, season/episode)
- 🎥 **TMDB Integration**: Search and match media against The Movie Database
- 🌊 **Torrent Providers**: Search multiple torrent providers (currently YTS)
- 💾 **SQLite Database**: Lightweight storage with Drizzle ORM
- 🚀 **Fast API**: Built with Hono for performance

## Tech Stack

- **Framework**: Hono (TypeScript)
- **ORM**: Drizzle
- **Database**: SQLite (better-sqlite3)
- **TMDB Client**: tmdb-ts
- **Runtime**: Node.js with tsx for development

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your TMDB API key:

```env
PORT=3000
TMDB_API_KEY=your_api_key_here
DATABASE_PATH=./unifarr.db
```

Get a TMDB API key from: https://www.themoviedb.org/settings/api

### 3. Generate database

```bash
npm run db:generate
```

### 4. Start development server

```bash
npm run dev
```

Server will start on http://localhost:3000

## API Endpoints

### Health Check

```
GET /
```

Returns API status and version.

---

### Files

#### List all files

```
GET /api/files
```

#### Get unmatched files

```
GET /api/files/unmatched
```

Returns files that haven't been matched to TMDB media items.

#### Get file by ID

```
GET /api/files/:id
```

#### Scan directory

```
POST /api/files/scan
Content-Type: application/json

{
  "path": "/path/to/media/folder"
}
```

Recursively scans the directory for media files, parses metadata, and stores in database.

**Response:**
```json
{
  "scanned": 150,
  "added": 120,
  "updated": 30,
  "errors": []
}
```

#### Delete file record

```
DELETE /api/files/:id
```

Deletes the file record (not the actual file).

---

### Media Items

#### List all media

```
GET /api/media
```

#### Get media by ID

```
GET /api/media/:id
```

#### Create media from TMDB

```
POST /api/media
Content-Type: application/json

{
  "tmdbId": 550,
  "type": "movie"
}
```

Fetches full details from TMDB and creates a media item.

#### Match file to media

```
POST /api/media/:id/match
Content-Type: application/json

{
  "fileId": 123,
  "confidence": 0.95
}
```

Links a file to a media item.

#### Delete media item

```
DELETE /api/media/:id
```

Deletes media item and unlinks associated files.

---

### TMDB Search

#### Search movies

```
GET /api/search/tmdb/movies?q=Inception&year=2010
```

#### Search TV shows

```
GET /api/search/tmdb/tv?q=Breaking Bad
```

#### Multi search (movies + TV)

```
GET /api/search/tmdb/multi?q=The Matrix
```

---

### Torrent Providers

#### List providers

```
GET /api/providers
```

Returns available torrent providers and their capabilities.

#### Search all providers

```
GET /api/providers/search?q=Movie Title&type=movie&year=2023
```

**Query parameters:**
- `q`: Search query (required)
- `type`: `movie`, `tv`, or `all` (optional)
- `year`: Release year (optional, for movies)
- `season`: Season number (optional, for TV)
- `episode`: Episode number (optional, for TV)

**Response:**
```json
[
  {
    "title": "Movie Title (2023) [1080p]",
    "infoHash": "abc123...",
    "magnetUrl": "magnet:?xt=...",
    "size": 2147483648,
    "seeders": 150,
    "leechers": 30,
    "provider": "YTS"
  }
]
```

#### Search specific provider

```
GET /api/providers/YTS/search?q=Inception
```

---

## Database Schema

### `media_items`
Stores movies and TV shows matched from TMDB.

**Fields:**
- `id`, `type`, `title`, `year`, `tmdbId`, `imdbId`
- `overview`, `posterPath`, `backdropPath`, `voteAverage`, `voteCount`
- `genres` (JSON), `runtime`, `status`
- `numberOfSeasons`, `numberOfEpisodes` (TV only)
- `monitored`, `libraryPath`
- `createdAt`, `updatedAt`

### `files`
Physical media files on disk.

**Fields:**
- `id`, `path`, `filename`, `size`
- `parsedTitle`, `parsedYear`, `parsedSeason`, `parsedEpisode`
- `parsedQuality`, `parsedEdition`, `parsedCodec`, `parsedSource`
- `mediaItemId` (foreign key), `matched`, `matchConfidence`
- `createdAt`, `scannedAt`

### `providers`
Torrent provider configurations.

### `searches`
Search history.

### `match_candidates`
TMDB match suggestions for unidentified files.

---

## Parser

The parser extracts metadata from filenames using regex patterns inspired by Radarr and Sonarr.

### Supported Movie Formats

- `Movie.Title.2023.1080p.BluRay.x264-GROUP`
- `Movie Title (2023) 720p WEB-DL`
- `Movie.Title.Directors.Cut.2020.2160p`

### Supported TV Formats

- `Show.Name.S01E05.Episode.Title.720p`
- `Show.Name.1x05.720p`
- `Show Name - 105 - Episode Title`

### Quality Detection

- **Resolution**: 360p, 480p, 720p, 1080p, 2160p (4K)
- **Source**: BluRay, WEB-DL, WEBRip, HDTV, DVD
- **Codec**: x264, x265/HEVC, h264, XviD
- **Edition**: Director's Cut, Extended, Unrated, IMAX

---

## Development

### File structure

```
backend/
├── src/
│   ├── db/
│   │   ├── index.ts       # Database connection
│   │   └── schema.ts      # Drizzle schema
│   ├── lib/
│   │   └── parser.ts      # Media filename parser
│   ├── routes/
│   │   ├── files.ts       # File management endpoints
│   │   ├── media.ts       # Media CRUD endpoints
│   │   ├── search.ts      # TMDB search endpoints
│   │   └── providers.ts   # Torrent provider endpoints
│   ├── services/
│   │   ├── scanner.ts     # Library scanner
│   │   ├── tmdb.ts        # TMDB API client
│   │   └── providers/
│   │       ├── base.ts    # Base provider interface
│   │       ├── yts.ts     # YTS provider implementation
│   │       └── index.ts   # Provider manager
│   └── index.ts           # Main app entry point
├── drizzle/               # Generated migrations
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

### Adding a new provider

1. Create a new file in `src/services/providers/`
2. Extend `BaseProvider` class
3. Implement `search()` method
4. Register in `src/services/providers/index.ts`

Example:

```typescript
import { BaseProvider, TorrentResult, ProviderCapabilities } from './base';

export class MyProvider extends BaseProvider {
  name = 'MyProvider';
  baseUrl = 'https://example.com';
  capabilities: ProviderCapabilities = {
    search: true,
    movieSearch: true,
    tvSearch: true,
  };
  
  async search(query: string): Promise<TorrentResult[]> {
    // Implementation
    return [];
  }
}
```

---

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)

---

## Roadmap

### Phase 1 ✅
- [x] Database schema
- [x] Media file parser
- [x] TMDB integration
- [x] Library scanner
- [x] Basic API endpoints
- [x] YTS provider

### Phase 2 🚧
- [ ] Additional providers (1337x, RARBG alternatives)
- [ ] Automatic matching algorithm
- [ ] Quality profiles
- [ ] Download queue management
- [ ] WebSocket for real-time updates

### Phase 3 📋
- [ ] User authentication
- [ ] Multi-user support
- [ ] Plex/Jellyfin integration
- [ ] Advanced search filters
- [ ] Statistics and analytics

---

## License

MIT

---

## Contributing

Frontend agent: Use these API endpoints to build the UI. The API returns JSON and supports CORS.

**API Base URL**: `http://localhost:3000/api`

**Key workflows:**
1. Scan library → `POST /api/files/scan`
2. Get unmatched files → `GET /api/files/unmatched`
3. Search TMDB → `GET /api/search/tmdb/multi?q=...`
4. Create media item → `POST /api/media`
5. Match file → `POST /api/media/:id/match`
6. Search torrents → `GET /api/providers/search?q=...&type=movie`
