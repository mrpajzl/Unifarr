import { Hono } from 'hono';
import { db } from '../db';
import { files } from '../db/schema';
import { folderScanner } from '../services/folder-scanner';
import { getTMDBApiKey } from './settings';
import { eq } from 'drizzle-orm';
import { getMediaFileInfo, formatFileSize, formatDuration } from '../services/media-info';
import { normalizeTitle } from '../lib/normalize';

const app = new Hono();

// Get all folders (media items)
app.get('/', async (c) => {
  const allFiles = await db.select().from(files);
  return c.json(allFiles);
});

// Get unmatched folders (TV shows grouped by series)
app.get('/unmatched', async (c) => {
  const unmatched = await db.query.files.findMany({
    where: eq(files.matched, 0),
  });
  
  // Group TV shows by normalized title (removes diacritics, articles, special chars)
  const tvShows = new Map<string, typeof unmatched>();
  const movies: typeof unmatched = [];
  
  for (const file of unmatched) {
    // Check if it's a TV show (has season/episode info)
    if (file.parsedSeason !== null && file.parsedSeason !== undefined) {
      const showTitle = file.parsedTitle || 'Unknown';
      const normalizedTitle = normalizeTitle(showTitle);
      
      if (!tvShows.has(normalizedTitle)) {
        tvShows.set(normalizedTitle, []);
      }
      tvShows.get(normalizedTitle)!.push(file);
    } else {
      // It's a movie
      movies.push(file);
    }
  }
  
  // Create representative entries for TV shows (show folder level)
  const tvShowEntries = Array.from(tvShows.entries()).map(([normalizedTitle, episodes]) => {
    // Sort episodes to find the earliest one
    episodes.sort((a, b) => {
      if (a.parsedSeason !== b.parsedSeason) {
        return (a.parsedSeason || 0) - (b.parsedSeason || 0);
      }
      return (a.parsedEpisode || 0) - (b.parsedEpisode || 0);
    });
    
    const firstEp = episodes[0];
    const totalSize = episodes.reduce((sum, ep) => sum + (ep.size || 0), 0);
    
    // Use the most common title variant (or the one with "The" if exists)
    const titleCounts = new Map<string, number>();
    episodes.forEach(ep => {
      const title = ep.parsedTitle || 'Unknown';
      titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
    });
    
    // Prefer titles starting with "The", otherwise use most common
    let displayTitle = firstEp.parsedTitle || 'Unknown';
    const titlesWithThe = Array.from(titleCounts.keys()).filter(t => /^the\s+/i.test(t));
    if (titlesWithThe.length > 0) {
      displayTitle = titlesWithThe[0];
    } else {
      // Use most common variant
      let maxCount = 0;
      titleCounts.forEach((count, title) => {
        if (count > maxCount) {
          maxCount = count;
          displayTitle = title;
        }
      });
    }
    
    // Extract show folder path (parent of Season folder or episode file)
    let showFolderPath = firstEp.path;
    const parts = showFolderPath.split('/');
    
    // Find Season folder in path and get parent
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^Season\s+\d+$/i.test(parts[i])) {
        showFolderPath = parts.slice(0, i).join('/');
        break;
      }
    }
    
    // If no Season folder found, use parent of file
    if (showFolderPath === firstEp.path) {
      showFolderPath = parts.slice(0, -1).join('/');
    }
    
    return {
      ...firstEp,
      id: firstEp.id,
      filename: displayTitle,
      parsedTitle: displayTitle,
      path: showFolderPath,
      size: totalSize,
      // Add metadata about grouped episodes
      _isTVShow: true,
      _episodeCount: episodes.length,
      _episodes: episodes.map(ep => ep.id),
    };
  });
  
  // Combine TV shows and movies
  const result = [...tvShowEntries, ...movies];
  
  return c.json(result);
});

// Get folder by ID
app.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const file = await db.query.files.findFirst({
    where: (files, { eq }) => eq(files.id, id),
  });
  
  if (!file) {
    return c.json({ error: 'Folder not found' }, 404);
  }
  
  return c.json(file);
});

// Get detailed file info with ffprobe metadata
app.get('/:id/info', async (c) => {
  const id = parseInt(c.req.param('id'));
  const file = await db.query.files.findFirst({
    where: (files, { eq }) => eq(files.id, id),
  });
  
  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }
  
  // Get detailed media info using ffprobe
  const mediaInfo = await getMediaFileInfo(file.path);
  
  if (!mediaInfo) {
    return c.json({ error: 'Failed to extract media information' }, 500);
  }
  
  return c.json({
    ...file,
    mediaInfo: {
      ...mediaInfo,
      sizeFormatted: formatFileSize(mediaInfo.size),
      durationFormatted: formatDuration(mediaInfo.duration),
    },
  });
});

// Scan library - now folder-based
app.post('/scan', async (c) => {
  try {
    const body = await c.req.json();
    const { path, type } = body; // type: 'movies' or 'tv'
    
    if (!path) {
      return c.json({ error: 'Path is required' }, 400);
    }
    
    let result;
    if (type === 'movies') {
      result = await folderScanner.scanMovies(path);
    } else if (type === 'tv') {
      result = await folderScanner.scanTVShows(path);
    } else {
      // Auto-detect based on path or scan both
      const moviesResult = await folderScanner.scanMovies(path);
      const tvResult = await folderScanner.scanTVShows(path);
      result = {
        scanned: moviesResult.scanned + tvResult.scanned,
        added: moviesResult.added + tvResult.added,
        updated: moviesResult.updated + tvResult.updated,
        errors: [...moviesResult.errors, ...tvResult.errors],
      };
    }
    
    return c.json(result);
  } catch (error) {
    console.error('Scan error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Scan failed',
      scanned: 0,
      added: 0,
      updated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }, 500);
  }
});

// Delete folder record (not the actual folder)
app.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(files).where(eq(files.id, id));
  return c.json({ success: true });
});

export default app;
