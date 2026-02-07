# Unifarr Research Findings

## Analyzed Projects
- **Prowlarr**: Indexer/provider architecture for torrent searching
- **Radarr**: Movie management, metadata matching, file organization
- **Sonarr**: TV show management

## Key Architectural Patterns

### 1. Prowlarr - Indexer/Provider Pattern
**Location**: `src/NzbDrone.Core/Indexers/`

**Key Components**:
- **Base Classes**: `IndexerBase`, `HttpIndexerBase` - Abstract foundation for all indexers
- **Request Generator**: `IIndexerRequestGenerator` - Builds search requests
- **Response Parser**: `IProcessIndexerResponse` - Parses torrent results
- **Capabilities**: `IndexerCapabilities` - Defines what each indexer supports
- **Settings**: `IIndexerSettings` - Configuration per indexer

**Pattern Implementation**:
```csharp
public class AlphaRatio : GazelleBase<AlphaRatioSettings>
{
    public override IIndexerRequestGenerator GetRequestGenerator()
    public override IParseIndexerResponse GetParser()
    protected override IndexerCapabilities SetCapabilities()
}
```

**Learnings**:
- Indexers inherit from base classes (GazelleBase, TorznabBase, etc.)
- Each indexer defines its own RequestGenerator and Parser
- Capabilities define search parameters (Q, Season, Ep, etc.)
- Category mapping standardizes torrent categories across indexers
- Rate limiting is built into the base class

### 2. Radarr/Sonarr - Media Management Pattern

**Key Components**:
- **Parser**: Extracts movie/show info from filenames
- **Metadata Source**: Fetches info from TMDB/TVDb
- **Media Scanner**: Scans folders for media files
- **File Organizer**: Renames and moves files to proper structure

**File Naming Pattern Detection**:
- Regular expressions to extract: title, year, quality, codec, release group
- Normalization of titles for matching
- Quality detection (720p, 1080p, 4K, etc.)

### 3. Database Schema Patterns
- Media items (Movies/Shows)
- Metadata (title, plot, posters, etc.)
- Files (path, size, quality)
- Download queue
- Indexer configurations
- Settings/preferences

## Unifarr Architecture Design

### Tech Stack
- **Frontend**: Nuxt 3 + Vue 3 + Tailwind + TypeScript
- **Backend**: Hono (lightweight, fast) + TypeScript
- **Database**: SQLite (simple, portable, perfect for Docker)
- **APIs**: TMDB, qBittorrent
- **Torrent Search**: Custom provider system inspired by Prowlarr

### Project Structure
```
unifarr/
├── frontend/          # Nuxt 3 app
│   ├── pages/         # Library, search, settings
│   ├── components/    # UI components
│   └── composables/   # Shared logic
├── backend/           # Hono API server
│   ├── api/           # API routes
│   ├── services/      # Business logic
│   │   ├── scanner/   # Media file scanner
│   │   ├── matcher/   # TMDB matching
│   │   ├── torrent/   # Torrent providers
│   │   └── download/  # qBittorrent client
│   ├── db/            # Database schema & migrations
│   └── utils/         # Helpers
├── docker/            # Docker configs
└── docs/              # Documentation
```

### Database Schema (SQLite)
```sql
-- Media items (movies and TV shows)
CREATE TABLE media (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,           -- 'movie' or 'tv'
    tmdb_id INTEGER UNIQUE,
    imdb_id TEXT,
    title TEXT NOT NULL,
    original_title TEXT,
    year INTEGER,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    rating REAL,
    runtime INTEGER,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Files on disk
CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    media_id INTEGER,
    path TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    size INTEGER,
    quality TEXT,
    codec TEXT,
    resolution TEXT,
    release_group TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media(id)
);

-- TV show specific
CREATE TABLE seasons (
    id INTEGER PRIMARY KEY,
    media_id INTEGER,
    season_number INTEGER,
    episode_count INTEGER,
    poster_path TEXT,
    FOREIGN KEY (media_id) REFERENCES media(id)
);

CREATE TABLE episodes (
    id INTEGER PRIMARY KEY,
    season_id INTEGER,
    episode_number INTEGER,
    title TEXT,
    overview TEXT,
    air_date TEXT,
    still_path TEXT,
    FOREIGN KEY (season_id) REFERENCES seasons(id)
);

-- Torrent providers
CREATE TABLE providers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    type TEXT NOT NULL,           -- 'public', 'private', 'semi-private'
    enabled BOOLEAN DEFAULT 1,
    config TEXT,                  -- JSON config
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Download queue
CREATE TABLE downloads (
    id INTEGER PRIMARY KEY,
    media_id INTEGER,
    torrent_hash TEXT UNIQUE,
    name TEXT,
    status TEXT,                  -- 'queued', 'downloading', 'completed', 'failed'
    progress REAL,
    download_speed INTEGER,
    eta INTEGER,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (media_id) REFERENCES media(id)
);

-- Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### Core Features Implementation Plan

#### 1. Library Scanner
- Recursively scan media folders
- Detect media type (movie vs TV show)
- Parse filenames using regex patterns
- Extract: title, year, season, episode, quality
- Store file info in database

#### 2. TMDB Metadata Matching
- Search TMDB with parsed title + year
- Present top matches for manual selection
- Fetch complete metadata (poster, plot, cast, etc.)
- Download and cache images locally
- Update database with TMDB IDs

#### 3. Torrent Search (Prowlarr-inspired)
- Provider base class system
- Built-in providers: 1337x, YTS, RARBG, TPB
- Search across multiple providers in parallel
- Parse results (title, size, seeders, magnet link)
- Filter by quality, size limits
- Sort by seeders/quality

#### 4. qBittorrent Integration
- Connect to qBittorrent Web API
- Add torrents via magnet links
- Monitor download progress
- Auto-organize on completion
- Rename files based on metadata

#### 5. Web UI
- **Library View**: Grid of posters, filterable/sortable
- **Detail Page**: Full metadata, files, download options
- **Search**: Find torrents for media
- **Settings**: Configure paths, providers, qBittorrent
- **Queue**: Active downloads with progress

### Extensibility
- Plugin system for torrent providers
- Hooks for post-processing
- API for external integrations
- Webhook notifications
- Custom metadata sources

## Next Steps
1. Initialize project structure
2. Set up database with migrations
3. Build scanner service
4. Implement TMDB integration
5. Create torrent provider system
6. Build qBittorrent client
7. Develop frontend UI
8. Create Docker setup
9. Test with test_media folder
10. Document everything
