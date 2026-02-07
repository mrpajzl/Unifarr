# Migration to Folder-Based Media Management

## Changes

### Old System (File-Based)
- Each video file = separate database entry
- Matching based on filename parsing
- Files table stores individual video files

### New System (Folder-Based)
- Each folder = one media item
- Folder name used for TMDB matching
- Files table stores folder info + list of video files

## Structure

### Movies
```
/movies/
  Titanic (1997)/
    Titanic.mkv
    Titanic.srt
  Avatar (2009)/
    Avatar.mkv
```
→ Each folder = 1 movie

### TV Shows
```
/tvshows/
  Breaking Bad/
    Season 01/
      Breaking.Bad.S01E01.mkv
      Breaking.Bad.S01E02.mkv
    Season 02/
      Breaking.Bad.S02E01.mkv
```
→ Each top-level folder = 1 TV show

## Database Changes

1. **files table**: Change to store folders instead of individual files
   - `path` = folder path
   - `parsedTitle` = folder name (cleaned)
   - New field: `videoFiles` = JSON array of video files in folder
   
2. **Matching logic**: Match folder name against TMDB
