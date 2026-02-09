# Episode Matching Feature

## Overview

Bulk episode matching system for TV shows that can handle hundreds of files at once. Smart pattern detection extracts season/episode numbers from filenames and matches them to episodes in the database.

## Features

### 1. **Auto-Match**
- One-click automatic matching using built-in parser
- Supports common patterns: S01E05, 1x05, Season 1 Episode 5, etc.
- Matches files to episodes in database automatically

### 2. **Smart Pattern Detection**
- Select any sample file
- Automatically detects pattern format (S01E05, 1x05, etc.)
- Shows regex pattern and capture groups
- Preview before applying

### 3. **Bulk Apply**
- Apply detected pattern to all unmatched files at once
- Preview matches before committing
- Shows success/failure for each file
- Handles 100s of files efficiently

### 4. **Visual Feedback**
- 3-step wizard interface
- Real-time match preview
- Clear success/failure indicators
- File size and metadata display

## Usage

1. Go to a TV show detail page
2. Click **"Match Episodes"** button
3. Choose method:
   - **Auto-Match All**: Try automatic matching (fastest)
   - **Manual**: Select a sample file to detect pattern

### Manual Pattern Matching

**Step 1: Select Sample**
- Click on any file that represents the typical naming pattern
- Example: "Breaking Bad S01E05.mkv"

**Step 2: Pattern Detection**
- System automatically detects pattern (e.g., "S01E05")
- Shows extracted season/episode numbers
- Displays regex pattern that will be used

**Step 3: Preview & Apply**
- See all matches before applying
- Review failed matches
- Apply to update database

## Supported Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| S##E## | S01E05, S1E5 | Standard format |
| #x## | 1x05, 01x05 | Alternate format |
| Season # Episode # | Season 1 Episode 5 | Long format |
| ### | 105 (for S01E05) | 3-digit format |

## API Endpoints

### GET `/api/episode-matcher/:mediaId/unmatched-files`
Get all files not yet matched to episodes

### POST `/api/episode-matcher/:mediaId/analyze-pattern`
Detect pattern from a sample filename

```json
{
  "sampleFile": "/path/to/Show.S01E05.mkv"
}
```

### POST `/api/episode-matcher/:mediaId/apply-pattern`
Apply pattern to all files

```json
{
  "regex": "S(\\d{1,2})E(\\d{1,3})",
  "seasonGroup": 1,
  "episodeGroup": 2,
  "flags": "i",
  "autoMatch": true
}
```

### POST `/api/episode-matcher/:mediaId/auto-match`
Automatically match using built-in parser (no body required)

## Technical Details

- **Backend**: Hono API routes with pattern matching
- **Frontend**: Vue 3 composition API modal component
- **Parser**: Regex-based season/episode extraction
- **Database**: Drizzle ORM with SQLite/PostgreSQL

## Files

- `backend/src/routes/episode-matcher.ts` - API endpoints
- `backend/src/lib/parser.ts` - Filename parsing logic
- `frontend/app/components/EpisodeMatcherModal.vue` - UI component
- `frontend/app/pages/media/[id].vue` - Integration in TV show page
