# Unifarr Research Documentation

## Overview
This document summarizes key findings from analyzing Prowlarr, Radarr, and Sonarr codebases to inform the architecture of Unifarr.

---

## 1. Prowlarr: Indexer Architecture

### Core Concepts
- **Base Classes**: `IndexerBase<TSettings>` provides the foundation for all indexers
- **Protocol Types**: `DownloadProtocol` (Torrent, Usenet)
- **Privacy Levels**: `IndexerPrivacy` (Public, SemiPublic, Private)

### Indexer Structure
Each indexer implementation includes:
- **Name & URLs**: Indexer identity and base URLs (including legacy URLs)
- **Capabilities**: Search parameters (Movie, TV, Music, Book), categories mapping
- **Request Generator**: `IIndexerRequestGenerator` - builds search queries
- **Response Parser**: `IParseIndexerResponse` - parses search results
- **Settings**: `TSettings` configuration (API keys, base URL, etc.)

### Example: Anidex Implementation
```csharp
public class Anidex : TorrentIndexerBase<AnidexSettings>
{
    // Metadata
    public override string Name => "Anidex";
    public override string[] IndexerUrls => new[] { "https://anidex.info/" };
    public override string Description => "...";
    public override IndexerPrivacy Privacy => IndexerPrivacy.Public;
    
    // Components
    public override IIndexerRequestGenerator GetRequestGenerator() {...}
    public override IParseIndexerResponse GetParser() {...}
    
    // Capabilities - what can this indexer search?
    private IndexerCapabilities SetCapabilities()
    {
        caps.TvSearchParams = [Q, Season, Ep];
        caps.Categories.AddCategoryMapping("1", NewznabStandardCategory.TVAnime, "Anime - Sub");
        return caps;
    }
}
```

### Request Chain Pattern
- **IndexerPageableRequestChain**: Supports pagination
- **IndexerRequest**: HTTP request with URL, headers, cookies
- **IndexerResponse**: Raw response data
- **IndexerQueryResult**: Parsed releases

### Key Takeaways
✅ **Plugin Architecture**: Each indexer is self-contained with its own logic  
✅ **Capability Declaration**: Indexers declare what they can search  
✅ **Standardized Categories**: Newznab category system for consistency  
✅ **Base Classes**: Heavy lifting done by `TorrentIndexerBase` and `HttpIndexerBase`

---

## 2. Radarr: Movie Parsing & Quality Detection

### Parser Architecture
Located in `src/NzbDrone.Core/Parser/`

### Movie Title Parsing (`Parser.cs`)
Multiple regex patterns to handle various release formats:
- **Standard**: `Movie.Title.2023.1080p.BluRay.x264-GROUP`
- **Anime**: `[SubGroup] Movie Title (2023) [Hash]`
- **Year in brackets**: `Movie.Title[2023]`
- **Special editions**: `Movie.Title.Directors.Cut.2023`
- **Alternative titles**: `Movie Title AKA Alternative Title (2023)`

### Key Regex Patterns
```regex
# Standard movie format
^(?<title>(?![(\[]).+?)?(?:(?:[-_\W](?<![)\[!]))*(?<year>(1(8|9)|20)\d{2}(?!p|i|(1(8|9)|20)\d{2}|\]|\W(1(8|9)|20)\d{2})))+(\W+|_|$)(?!\\)

# Edition detection (Director's Cut, Extended, etc.)
\(?\b(?<edition>(Director.?s|Collector.?s|Theatrical|Ultimate|Extended...))\b\)?
```

### Quality Detection (`QualityParser.cs`)
Sophisticated pattern matching for:
- **Source**: BluRay, WEB-DL, WEBRip, HDTV, DVD, etc.
- **Resolution**: 360p, 480p, 720p, 1080p, 2160p (4K)
- **Codecs**: x264, h264, x265, HEVC, XviD
- **Modifiers**: PROPER, REPACK, REMUX
- **Special Cases**: BRDISK detection, German REMUX patterns

### Quality Model
```csharp
public class QualityModel
{
    Quality Quality;              // Enum: BluRay-1080p, WEB-DL-720p, etc.
    Revision Revision;            // Version (v2, v3), Real, Proper
    QualityDetectionSource Source; // Name, Extension, etc.
}
```

### File Organization
- **Episode Files**: Structured naming with quality info
- **Metadata**: TMDB/IMDB matching
- **Folder Structure**: Configurable templates

### Key Takeaways
✅ **Comprehensive Regex**: Handles edge cases and international formats  
✅ **Quality Hierarchy**: Clear quality ranking system  
✅ **Flexible Parsing**: Falls back through multiple patterns  
✅ **Metadata Integration**: Built-in TMDB/IMDB support

---

## 3. Sonarr: TV Show Parsing & Organization

### Episode Parsing (`Parser.cs`)
Even more complex than movies due to episode numbering:

#### Supported Formats
- **Standard**: `Show.Name.S01E05.Episode.Title`
- **Alternate**: `Show.Name.1x05`
- **Multi-episode**: `S01E05E06`, `S01E05-E06`
- **Anime Absolute**: `[SubGroup] Show Name - 123 [Hash]`
- **Daily**: `Show.Name.2023.10.12` (for talk shows)
- **Split episodes**: `S01E05a`, `S01E05b`

#### Anime Special Patterns
```regex
# [SubGroup] Title - Absolute Episode Number [Hash]
^\[(?<subgroup>.+?)\][-_. ]?(?<title>.+?)(?:[. ]-[. ](?<absoluteepisode>\d{2,3}(\.\d{1,2})?(?!\d+|[-])))+.*?(?<hash>[(\[]\w{8}[)\]])?

# Season + Episode + Absolute Number
^(?<title>.+?)(?:[-_\W](?<![()\[!]))+(?:S?(?<season>\d{1,2})(?:[ex]|\W[ex]|-){1,2}(?<episode>\d{2}))+[-_. (]+?(?<absoluteepisode>\d{3})
```

### Series Management
- **Season tracking**: Full season vs individual episodes
- **Episode files**: Link episodes to physical files
- **Series monitoring**: Which seasons to monitor for new episodes

### Organization Patterns
Configurable templates like:
- `{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00} - {Episode Title}`
- `{Series Title}/{season}x{episode:00} - {Episode Title}`

### Key Takeaways
✅ **Episode Flexibility**: Handles standard, anime, daily shows  
✅ **Absolute Numbering**: Critical for anime tracking  
✅ **Season Management**: Track monitoring status per season  
✅ **Multi-Episode Support**: Properly handles batches

---

## 4. Database Architecture

### Common Patterns (All three apps)

#### Base Repository Pattern
```csharp
public interface IBasicRepository<TModel>
{
    TModel Insert(TModel model);
    TModel Update(TModel model);
    void Delete(int id);
    TModel Get(int id);
    List<TModel> All();
}
```

#### Entity Base
```csharp
public class ModelBase
{
    public int Id { get; set; }
}
```

### Prowlarr Entities
- **Indexers**: Indexer definitions (name, URL, settings, enabled)
- **IndexerStatus**: Health tracking (failures, disable time)
- **History**: Search and download history
- **Applications**: Connected *arr apps (Radarr, Sonarr)

### Radarr Entities
- **Movies**: Movie info (title, year, TMDB ID, monitored, path)
- **MovieFiles**: Physical files (path, quality, size, date added)
- **History**: Download and import history
- **QualityProfiles**: User-defined quality preferences

### Sonarr Entities
- **Series**: Show info (title, TVDB ID, network, path)
- **Episodes**: Episode records (season, episode number, air date, monitored)
- **EpisodeFiles**: Physical files linked to episodes
- **SeasonStatistics**: Episode counts per season

### Key Takeaways
✅ **Separation of Concerns**: Media metadata vs file tracking  
✅ **Status Tracking**: Monitor health and history  
✅ **Flexible Relationships**: One-to-many, many-to-many patterns  
✅ **Migration System**: Versioned database migrations

---

## 5. REST API Patterns

### Common API Structure
- **Controllers**: Handle HTTP requests
- **Resources**: DTOs for API responses
- **Validators**: FluentValidation for input validation

### Example Endpoints (Radarr)
```
GET    /api/v3/movie           - List all movies
POST   /api/v3/movie           - Add movie
PUT    /api/v3/movie/{id}      - Update movie
DELETE /api/v3/movie/{id}      - Delete movie
GET    /api/v3/movie/lookup    - Search TMDB
GET    /api/v3/moviefile       - List movie files
GET    /api/v3/parse           - Parse filename
GET    /api/v3/qualityprofile  - Quality profiles
```

### Authentication
- **API Key**: X-Api-Key header
- **Basic Auth**: Optional username/password

---

## Recommendations for Unifarr

### Architecture
1. **Unified Parser**: Combine Radarr movie + Sonarr TV parsing into one engine
2. **Provider System**: Adopt Prowlarr's indexer plugin pattern
3. **Database Design**: 
   - `media_items` (type: movie/tv, unified metadata)
   - `files` (physical files with quality info)
   - `providers` (torrent provider configs)
   - `searches` (search history)
   - `match_candidates` (TMDB matches for unidentified files)

### Tech Stack (as specified)
- **Framework**: Hono or Fastify (TypeScript)
- **ORM**: Drizzle
- **Database**: SQLite (simple) or PostgreSQL (advanced)

### Core Features
1. **Library Scanner**: 
   - Recursive directory traversal
   - Call parser on each file
   - Store in `files` table with `matched: false`

2. **Parser Module**:
   - Port key regex patterns from Radarr/Sonarr
   - Return: `{ type, title, year?, season?, episode?, quality, edition }`

3. **TMDB Matcher**:
   - Search TMDB with parsed title+year
   - Present candidates to user
   - Link file → media_item

4. **Provider Integration**:
   - Start with 1-2 public providers (YTS, 1337x)
   - Use Prowlarr pattern (RequestGenerator + Parser)
   - Support pagination

5. **REST API**:
   ```
   GET  /api/files              - Unmatched files
   GET  /api/media              - Matched media items  
   POST /api/media/:id/match    - Link file to TMDB
   GET  /api/search/tmdb        - Search TMDB
   GET  /api/providers          - List providers
   POST /api/providers/search   - Search torrents
   ```

### Phase 2 Implementation Order
1. ✅ Setup TypeScript + Hono + Drizzle
2. ✅ Database schema + migrations
3. ✅ Parser module (movie + TV)
4. ✅ TMDB client (search, get details)
5. ✅ Library scanner endpoint
6. ✅ Provider system (1-2 providers)
7. ✅ REST API endpoints
8. ✅ API documentation (OpenAPI/Swagger)

---

## Code References

### Must-Read Files
- `Prowlarr/src/NzbDrone.Core/Indexers/IndexerBase.cs` - Base indexer
- `Prowlarr/src/NzbDrone.Core/Indexers/Definitions/Anidex.cs` - Example implementation
- `Radarr/src/NzbDrone.Core/Parser/Parser.cs` - Movie parsing
- `Radarr/src/NzbDrone.Core/Parser/QualityParser.cs` - Quality detection
- `Sonarr/src/NzbDrone.Core/Parser/Parser.cs` - TV show parsing

### Useful Patterns
- Request/Response chains (Prowlarr)
- Quality hierarchy and revision tracking (Radarr)
- Absolute episode numbering (Sonarr)
- Repository pattern (all three)

---

*Research completed: 2024-02-06*
