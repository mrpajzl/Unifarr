# Unifarr API Documentation

Complete API reference for the Unifarr backend.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently no authentication required (will be added in Phase 2).

---

## Endpoints

### Health Check

**GET /** 

Returns API status.

**Response:**
```json
{
  "name": "Unifarr API",
  "version": "1.0.0",
  "status": "online"
}
```

---

## Files API

### GET /api/files

List all files in the database.

**Response:**
```json
[
  {
    "id": 1,
    "path": "/media/movies/Inception.2010.1080p.mkv",
    "filename": "Inception.2010.1080p.mkv",
    "size": 2147483648,
    "parsedTitle": "Inception",
    "parsedYear": 2010,
    "parsedQuality": "1080p",
    "matched": 0,
    "createdAt": "2024-02-06T10:00:00Z"
  }
]
```

### GET /api/files/unmatched

Get files that haven't been matched to media items.

### GET /api/files/:id

Get a specific file by ID.

### POST /api/files/scan

Scan a directory for media files.

**Request:**
```json
{
  "path": "/path/to/media"
}
```

**Response:**
```json
{
  "scanned": 150,
  "added": 120,
  "updated": 30,
  "errors": []
}
```

### DELETE /api/files/:id

Delete a file record (not the actual file).

---

## Media API

### GET /api/media

List all media items.

### GET /api/media/:id

Get a specific media item by ID.

### POST /api/media

Create a media item from TMDB.

**Request:**
```json
{
  "tmdbId": 550,
  "type": "movie"
}
```

**Response:**
```json
{
  "id": 1,
  "type": "movie",
  "title": "Fight Club",
  "year": 1999,
  "tmdbId": 550,
  "overview": "A ticking-time-bomb insomniac...",
  "posterPath": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "createdAt": "2024-02-06T10:00:00Z"
}
```

### POST /api/media/:id/match

Link a file to a media item.

**Request:**
```json
{
  "fileId": 123,
  "confidence": 0.95
}
```

### DELETE /api/media/:id

Delete a media item and unlink files.

---

## Search API

### GET /api/search/tmdb/movies

Search TMDB for movies.

**Query Parameters:**
- `q` (required): Search query
- `year` (optional): Release year

**Example:**
```
GET /api/search/tmdb/movies?q=Inception&year=2010
```

**Response:**
```json
[
  {
    "id": 27205,
    "title": "Inception",
    "year": 2010,
    "overview": "Cobb, a skilled thief...",
    "poster_path": "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    "vote_average": 8.4
  }
]
```

### GET /api/search/tmdb/tv

Search TMDB for TV shows.

**Query Parameters:**
- `q` (required): Search query
- `year` (optional): First air year

### GET /api/search/tmdb/multi

Search both movies and TV shows.

**Query Parameters:**
- `q` (required): Search query

---

## Providers API

### GET /api/providers

List all available torrent providers.

**Response:**
```json
[
  {
    "name": "YTS",
    "baseUrl": "https://yts.mx",
    "capabilities": {
      "search": true,
      "movieSearch": true,
      "tvSearch": false
    }
  }
]
```

### GET /api/providers/search

Search all providers.

**Query Parameters:**
- `q` (required): Search query
- `type` (optional): `movie`, `tv`, or `all`
- `year` (optional): Release year (for movies)
- `season` (optional): Season number (for TV)
- `episode` (optional): Episode number (for TV)

**Example:**
```
GET /api/providers/search?q=Inception&type=movie&year=2010
```

**Response:**
```json
[
  {
    "title": "Inception (2010) [1080p]",
    "infoHash": "abc123def456...",
    "magnetUrl": "magnet:?xt=urn:btih:abc123...",
    "size": 2147483648,
    "seeders": 150,
    "leechers": 30,
    "uploadDate": "2024-01-15T10:00:00Z",
    "category": "Movies",
    "provider": "YTS"
  }
]
```

### GET /api/providers/:provider/search

Search a specific provider.

**Example:**
```
GET /api/providers/YTS/search?q=Inception
```

---

## Data Types

### File
```typescript
{
  id: number;
  path: string;
  filename: string;
  size: number;
  parsedTitle: string;
  parsedYear?: number;
  parsedSeason?: number;
  parsedEpisode?: number;
  parsedQuality?: string;
  parsedEdition?: string;
  parsedCodec?: string;
  parsedSource?: string;
  mediaItemId?: number;
  matched: 0 | 1;
  matchConfidence?: number;
  createdAt: string;
  scannedAt?: string;
}
```

### MediaItem
```typescript
{
  id: number;
  type: 'movie' | 'tv';
  title: string;
  year?: number;
  tmdbId: number;
  imdbId?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage?: number;
  voteCount?: number;
  genres?: string; // JSON array
  runtime?: number;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  status?: string;
  monitored: 0 | 1;
  libraryPath?: string;
  createdAt: string;
  updatedAt: string;
}
```

### TorrentResult
```typescript
{
  title: string;
  infoHash?: string;
  magnetUrl?: string;
  torrentUrl?: string;
  size: number;
  seeders: number;
  leechers: number;
  uploadDate?: Date;
  category?: string;
  provider: string;
}
```

---

## Error Responses

All endpoints return JSON error responses with appropriate HTTP status codes.

**Format:**
```json
{
  "error": "Error message here"
}
```

**Status Codes:**
- `400` Bad Request - Invalid input
- `404` Not Found - Resource not found
- `500` Internal Server Error - Server error

---

## TMDB Image URLs

TMDB returns relative paths. To get full URLs:

**Posters:**
```
https://image.tmdb.org/t/p/w500{posterPath}
```

**Backdrops:**
```
https://image.tmdb.org/t/p/original{backdropPath}
```

Example:
```
https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg
```

---

## Workflow Examples

### 1. Scan and Match Workflow

```bash
# 1. Scan library
curl -X POST http://localhost:3000/api/files/scan \
  -H "Content-Type: application/json" \
  -d '{"path": "/media/movies"}'

# 2. Get unmatched files
curl http://localhost:3000/api/files/unmatched

# 3. Search TMDB for a file
curl "http://localhost:3000/api/search/tmdb/movies?q=Inception&year=2010"

# 4. Create media item
curl -X POST http://localhost:3000/api/media \
  -H "Content-Type: application/json" \
  -d '{"tmdbId": 27205, "type": "movie"}'

# 5. Match file to media
curl -X POST http://localhost:3000/api/media/1/match \
  -H "Content-Type: application/json" \
  -d '{"fileId": 1, "confidence": 0.95}'
```

### 2. Torrent Search Workflow

```bash
# 1. Search for torrents
curl "http://localhost:3000/api/providers/search?q=Inception&type=movie&year=2010"

# 2. Use magnetUrl from results to download
```

---

## Rate Limiting

TMDB API has rate limits:
- 40 requests per 10 seconds
- 500 requests per day (free tier)

Consider implementing caching for production use.

---

## CORS

CORS is enabled for all origins in development. Configure appropriately for production.

---

*Last updated: 2024-02-06*
