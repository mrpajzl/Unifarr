# Upgrade to Folder-Based Media Management

## What Changed?

Unifarr now scans **folders** instead of individual video files:

### Before (File-Based)
```
/movies/
  Movie1.mkv  ← Scanned
  Movie2.mkv  ← Scanned
  Movie3.mkv  ← Scanned
```

### After (Folder-Based)
```
/movies/
  Titanic (1997)/          ← Scanned as 1 item
    Titanic.mkv
    Titanic.srt
  Avatar (2009)/           ← Scanned as 1 item
    Avatar.mkv
```

## Steps to Upgrade

1. **Clear existing file records** (they're file-based, not folder-based):
   ```bash
   sqlite3 unifarr.db "DELETE FROM files;"
   ```

2. **Organize your media** into folders (if not already):
   - Movies: One folder per movie
   - TV Shows: One folder per show (with Season subfolders)

3. **Re-scan your library** from the UI:
   - Go to Dashboard → Scan Library
   - Select Movies or TV Shows path
   - Click Scan

## Expected Folder Structure

### Movies
```
/movies/
  Titanic (1997)/
    Titanic.1997.1080p.BluRay.mkv
  Avatar (2009)/
    Avatar.2009.2160p.BluRay.mkv
  Inception (2010)/
    Inception.2010.1080p.WEB-DL.mkv
```

### TV Shows
```
/tvshows/
  Breaking Bad/
    Season 01/
      Breaking.Bad.S01E01.mkv
      Breaking.Bad.S01E02.mkv
    Season 02/
      Breaking.Bad.S02E01.mkv
  Game of Thrones/
    Season 01/
      ...
```

## Benefits

- ✅ Cleaner database (one entry per media item, not per file)
- ✅ Better TMDB matching (folder names are cleaner than filenames)
- ✅ Supports multi-file movies (e.g., Blu-ray rips with multiple .mkv files)
- ✅ Standard for media servers (Plex, Jellyfin, Emby all use this)

## Migration Command

To clear old file records and start fresh:
```bash
cd /Users/ondrejzraly/clawd/unifarr/backend
sqlite3 unifarr.db "DELETE FROM files; DELETE FROM match_candidates;"
```

Then re-scan from the UI.
