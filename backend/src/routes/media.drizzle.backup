import { Hono } from 'hono';
import { db } from '../db';
import { mediaItems, files } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getTMDBService, getTMDBApiKey } from './settings';
import { autoMatchFolder, autoMatchAll } from '../services/auto-matcher';
import { mkdir } from 'fs/promises';
import path from 'path';
import { getMediaFileInfo, formatFileSize, formatDuration } from '../services/media-info';
import { moveMediaFolder, validatePath } from '../services/folder-mover';

const app = new Hono();

// Get all media items
app.get('/', async (c) => {
  const allMedia = await db.select().from(mediaItems);
  return c.json(allMedia);
});

// Get media item by ID
app.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const media = await db.query.mediaItems.findFirst({
    where: (mediaItems, { eq }) => eq(mediaItems.id, id),
  });
  
  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }
  
  return c.json(media);
});

// Get episodes for a TV show (raw file list, no TMDB required)
app.get('/:id/episodes', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  const media = await db.query.mediaItems.findFirst({
    where: (mediaItems, { eq }) => eq(mediaItems.id, id),
  });
  
  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }
  
  if (media.type !== 'tv') {
    return c.json({ error: 'Media is not a TV show' }, 400);
  }
  
  // Get all files for this media item
  const mediaFiles = await db.query.files.findMany({
    where: eq(files.mediaItemId, id),
  });
  
  // Group by season
  const seasons = new Map<number, typeof mediaFiles>();
  
  for (const file of mediaFiles) {
    const season = file.parsedSeason || 0;
    if (!seasons.has(season)) {
      seasons.set(season, []);
    }
    seasons.get(season)!.push(file);
  }
  
  // Sort episodes within each season
  const sortedSeasons = Array.from(seasons.entries())
    .sort(([a], [b]) => a - b)
    .map(([seasonNum, episodes]) => ({
      season_number: seasonNum,
      episodes: episodes
        .sort((a, b) => (a.parsedEpisode || 0) - (b.parsedEpisode || 0))
        .map(ep => ({
          episode_number: ep.parsedEpisode || 0,
          name: ep.filename,
          hasFile: true,
          file: {
            id: ep.id,
            filename: ep.filename,
            path: ep.path,
            size: ep.size || 0,
            quality: ep.parsedQuality,
          },
        })),
    }));
  
  return c.json({
    mediaId: id,
    title: media.title,
    seasons: sortedSeasons,
  });
});

// Create media item from TMDB
app.post('/', async (c) => {
  const body = await c.req.json();
  const { tmdbId, type } = body;
  
  if (!tmdbId || !type) {
    return c.json({ error: 'tmdbId and type are required' }, 400);
  }
  
  const apiKey = await getTMDBApiKey();
  if (!apiKey) {
    return c.json({ error: 'TMDB API key not configured. Please add it in Settings.' }, 500);
  }
  
  const tmdb = await getTMDBService();
  
  let mediaData;
  if (type === 'movie') {
    mediaData = await tmdb.getMovieDetails(tmdbId);
  } else if (type === 'tv') {
    mediaData = await tmdb.getTVShowDetails(tmdbId);
  } else {
    return c.json({ error: 'Invalid type. Must be movie or tv' }, 400);
  }
  
  if (!mediaData) {
    return c.json({ error: 'Failed to fetch from TMDB' }, 500);
  }
  
  const title = 'title' in mediaData ? mediaData.title : mediaData.name;
  const year = mediaData.year;
  
  // Determine library path
  let libraryPath: string | undefined;
  try {
    const { getSettings } = await import('./settings');
    const settings = await getSettings();
    
    const basePath = type === 'movie' ? settings.moviesPath : settings.tvPath;
    const folderName = year ? `${title} (${year})` : title;
    libraryPath = path.join(basePath, folderName);
  } catch (error) {
    console.error('Failed to determine library path:', error);
  }
  
  // Insert into database
  const [inserted] = await db.insert(mediaItems).values({
    type,
    title,
    originalTitle: 'original_title' in mediaData ? mediaData.original_title : ('original_name' in mediaData ? mediaData.original_name : undefined),
    year,
    tmdbId: mediaData.id,
    imdbId: 'imdb_id' in mediaData ? mediaData.imdb_id : undefined,
    overview: mediaData.overview,
    posterPath: mediaData.poster_path,
    backdropPath: mediaData.backdrop_path,
    voteAverage: mediaData.vote_average,
    voteCount: mediaData.vote_count,
    genres: JSON.stringify(mediaData.genres),
    runtime: 'runtime' in mediaData ? mediaData.runtime : undefined,
    numberOfSeasons: 'number_of_seasons' in mediaData ? mediaData.number_of_seasons : undefined,
    numberOfEpisodes: 'number_of_episodes' in mediaData ? mediaData.number_of_episodes : undefined,
    status: mediaData.status,
    libraryPath, // Store the library path
  }).returning();
  
  // Create folder in library
  if (libraryPath) {
    try {
      const folderName = year ? `${title} (${year})` : title;
      
      // Create folder
      await mkdir(libraryPath, { recursive: true });
      console.log(`✅ Created folder: ${libraryPath}`);
      
      // Create file record
      await db.insert(files).values({
        path: libraryPath,
        filename: folderName,
        parsedTitle: title,
        parsedYear: year,
        size: 0,
        matched: true,
        mediaItemId: inserted.id,
        matchConfidence: 1.0,
        scannedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to create folder:', error);
      // Don't fail the request if folder creation fails
    }
  }
  
  return c.json(inserted);
});

// Match file to media item
app.post('/:id/match', async (c) => {
  const mediaId = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { fileId, confidence = 1.0 } = body;
  
  if (!fileId) {
    return c.json({ error: 'fileId is required' }, 400);
  }
  
  // Get the file to check if it's a TV show
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });
  
  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }
  
  // Update file record
  await db.update(files)
    .set({
      mediaItemId: mediaId,
      matched: true,
      matchConfidence: confidence,
    })
    .where(eq(files.id, fileId));
  
  let matchedCount = 1;
  
  // If it's a TV show, match all episodes in the same show folder
  if (file.parsedSeason !== null && file.parsedSeason !== undefined) {
    // Extract show folder from path (parent of Season folder or file)
    const path = await import('path');
    let showFolder = file.path;
    const parts = file.path.split('/');
    
    // Find Season folder and get parent
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^Season\s+\d+$/i.test(parts[i])) {
        showFolder = parts.slice(0, i).join('/');
        break;
      }
    }
    
    // If no Season folder found, use parent of file
    if (showFolder === file.path) {
      showFolder = parts.slice(0, -1).join('/');
    }
    
    console.log(`📁 Show folder: ${showFolder}`);
    
    // Match ALL unmatched episodes in the same show folder
    const allUnmatched = await db.query.files.findMany({
      where: (files, { and, eq, ne, isNotNull }) => and(
        ne(files.id, fileId), // Not the same file
        eq(files.matched, false), // Not already matched
        isNotNull(files.parsedSeason)
      ),
    });
    
    // Filter by show folder
    const relatedEpisodes = allUnmatched.filter(ep => {
      let epShowFolder = ep.path;
      const epParts = ep.path.split('/');
      
      for (let i = epParts.length - 1; i >= 0; i--) {
        if (/^Season\s+\d+$/i.test(epParts[i])) {
          epShowFolder = epParts.slice(0, i).join('/');
          break;
        }
      }
      
      if (epShowFolder === ep.path) {
        epShowFolder = epParts.slice(0, -1).join('/');
      }
      
      return epShowFolder === showFolder;
    });
    
    if (relatedEpisodes.length > 0) {
      for (const episode of relatedEpisodes) {
        await db.update(files)
          .set({
            mediaItemId: mediaId,
            matched: true,
            matchConfidence: confidence,
          })
          .where(eq(files.id, episode.id));
      }
      matchedCount += relatedEpisodes.length;
      console.log(`✅ Matched ${relatedEpisodes.length} related episodes in folder "${showFolder}"`);
    }
  }
  
  return c.json({ 
    success: true,
    matchedCount,
    message: matchedCount > 1 ? `Matched ${matchedCount} files` : 'Matched successfully'
  });
});

// Delete media item
app.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  try {
    // Get all files linked to this media item
    const linkedFiles = await db.query.files.findMany({
      where: eq(files.mediaItemId, id),
    });
    
    console.log(`Unlinking ${linkedFiles.length} files from media item ${id}`);
    
    // Unlink each file individually
    for (const file of linkedFiles) {
      await db.update(files)
        .set({ mediaItemId: null, matched: false })
        .where(eq(files.id, file.id));
    }
    
    // Delete media item
    const result = await db.delete(mediaItems).where(eq(mediaItems.id, id));
    
    console.log(`Deleted media item ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete media item error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete media item' 
    }, 500);
  }
});

// Auto-match a single folder
app.post('/auto-match/:fileId', async (c) => {
  try {
    const fileId = parseInt(c.req.param('fileId'));
    const success = await autoMatchFolder(fileId);
    
    if (success) {
      return c.json({ success: true, message: 'Auto-matched successfully' });
    } else {
      return c.json({ success: false, message: 'Could not auto-match with sufficient confidence' }, 400);
    }
  } catch (error) {
    console.error('Auto-match error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Auto-match failed' 
    }, 500);
  }
});

// Auto-match all unmatched folders
app.post('/auto-match-all', async (c) => {
  try {
    const result = await autoMatchAll();
    return c.json({ 
      success: true, 
      matched: result.matched,
      skipped: result.skipped,
      message: `Matched ${result.matched} items, skipped ${result.skipped}`,
    });
  } catch (error) {
    console.error('Auto-match-all error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Auto-match failed' 
    }, 500);
  }
});

// Get files for a media item with detailed info
app.get('/:id/files', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  // Get media item to find library path
  const media = await db.query.mediaItems.findFirst({
    where: (mediaItems, { eq }) => eq(mediaItems.id, id),
  });
  
  if (!media || !media.libraryPath) {
    return c.json([]);
  }
  
  try {
    const { readdir, stat } = await import('fs/promises');
    const { join, extname } = await import('path');
    
    // Get all files in library path
    const entries = await readdir(media.libraryPath, { withFileTypes: true });
    
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.m2ts', '.ts'];
    
    // Filter video files
    const videoFiles = entries
      .filter(entry => entry.isFile() && videoExtensions.includes(extname(entry.name).toLowerCase()))
      .map(entry => join(media.libraryPath!, entry.name));
    
    if (videoFiles.length === 0) {
      return c.json([]);
    }
    
    // Get detailed info for each file
    const filesWithInfo = await Promise.all(
      videoFiles.map(async (filePath, index) => {
        const filename = filePath.split('/').pop() || filePath;
        const stats = await stat(filePath);
        const mediaInfo = await getMediaFileInfo(filePath);
        
        return {
          id: index + 1,
          path: filePath,
          filename,
          size: Number(stats.size),
          mediaItemId: id,
          matched: true,
          matchConfidence: 1.0,
          mediaInfo: mediaInfo ? {
            ...mediaInfo,
            sizeFormatted: formatFileSize(mediaInfo.size),
            durationFormatted: formatDuration(mediaInfo.duration),
          } : null,
        };
      })
    );
    
    return c.json(filesWithInfo);
  } catch (error) {
    console.error(`Error reading files for media ${id}:`, error);
    return c.json([]);
  }
});

// Update library path (with optional file move)
app.post('/:id/update-path', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { newPath, autoMove = false } = body;
  
  if (!newPath) {
    return c.json({ error: 'newPath is required' }, 400);
  }
  
  // Validate new path
  const validation = await validatePath(newPath);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }
  
  // Move folder and update database
  const result = await moveMediaFolder(id, newPath, autoMove);
  
  if (!result.success) {
    return c.json({ error: result.error }, 500);
  }
  
  return c.json({
    success: true,
    message: autoMove 
      ? `Moved ${result.filesMoved} items from ${result.oldPath} to ${result.newPath}`
      : `Updated library path to ${result.newPath}`,
    oldPath: result.oldPath,
    newPath: result.newPath,
    filesMoved: result.filesMoved,
  });
});

// Toggle monitored status
app.patch('/:id/monitored', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { monitored } = body;
  
  if (typeof monitored !== 'boolean') {
    return c.json({ error: 'monitored must be a boolean' }, 400);
  }
  
  const media = await db.query.mediaItems.findFirst({
    where: eq(mediaItems.id, id),
  });
  
  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }
  
  // Update monitored status
  await db.update(mediaItems)
    .set({ monitored: monitored })
    .where(eq(mediaItems.id, id));
  
  console.log(`📺 ${monitored ? 'Started' : 'Stopped'} monitoring: ${media.title}`);
  
  return c.json({
    success: true,
    monitored,
    message: `${monitored ? 'Started' : 'Stopped'} monitoring ${media.title}`,
  });
});

// Identify media with TMDB ID
app.patch('/:id/identify', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { tmdbId, type } = body;
  
  if (!tmdbId || !type) {
    return c.json({ error: 'tmdbId and type are required' }, 400);
  }
  
  if (type !== 'movie' && type !== 'tv') {
    return c.json({ error: 'type must be "movie" or "tv"' }, 400);
  }
  
  const media = await db.query.mediaItems.findFirst({
    where: eq(mediaItems.id, id),
  });
  
  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }
  
  try {
    const apiKey = await getTMDBApiKey();
    
    if (!apiKey) {
      return c.json({ error: 'TMDB API key not configured' }, 500);
    }
    
    // Check if tmdbId already exists for a different media item
    const existingMedia = await db.query.mediaItems.findFirst({
      where: (mediaItems, { eq, and, not }) => and(
        eq(mediaItems.tmdbId, tmdbId),
        not(eq(mediaItems.id, id))
      ),
    });
    
    if (existingMedia) {
      return c.json({ 
        error: `TMDB ID ${tmdbId} is already used by "${existingMedia.title}" (ID: ${existingMedia.id})` 
      }, 400);
    }
    
    // Fetch metadata from TMDB
    const endpoint = type === 'movie' 
      ? `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits,external_ids`
      : `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&append_to_response=credits,external_ids`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      return c.json({ error: 'Failed to fetch from TMDB' }, 500);
    }
    
    const tmdbData = await response.json();
    
    // Update media item with TMDB data
    const updateData: any = {
      tmdbId: tmdbId,
      type: type,
      title: type === 'movie' ? tmdbData.title : tmdbData.name,
      originalTitle: type === 'movie' ? tmdbData.original_title : tmdbData.original_name,
      overview: tmdbData.overview,
      year: type === 'movie'
        ? tmdbData.release_date ? new Date(tmdbData.release_date).getFullYear() : null
        : tmdbData.first_air_date ? new Date(tmdbData.first_air_date).getFullYear() : null,
      releaseDate: type === 'movie' ? tmdbData.release_date : tmdbData.first_air_date,
      runtime: type === 'movie' ? tmdbData.runtime : tmdbData.episode_run_time?.[0],
      genres: tmdbData.genres?.map((g: any) => g.name).join(', '),
      posterPath: tmdbData.poster_path,
      backdropPath: tmdbData.backdrop_path,
      voteAverage: tmdbData.vote_average,
      voteCount: tmdbData.vote_count,
      status: tmdbData.status,
      tagline: tmdbData.tagline,
      imdbId: tmdbData.external_ids?.imdb_id,
      numberOfSeasons: type === 'tv' ? tmdbData.number_of_seasons : null,
      numberOfEpisodes: type === 'tv' ? tmdbData.number_of_episodes : null,
    };
    
    await db.update(mediaItems)
      .set(updateData)
      .where(eq(mediaItems.id, id));
    
    console.log(`🎬 Identified media ${id} as TMDB ${type} ${tmdbId}: ${updateData.title}`);
    
    return c.json({
      success: true,
      message: `Successfully identified as ${updateData.title}`,
      tmdbId,
      title: updateData.title,
    });
  } catch (error: any) {
    console.error(`Failed to identify media ${id}:`, error);
    return c.json({ error: error.message || 'Failed to identify media' }, 500);
  }
});

// ========== Bulk Operations ==========

// Bulk refresh metadata
app.post('/bulk/refresh-metadata', async (c) => {
  try {
    const { ids } = await c.req.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'Invalid ids array' }, 400);
    }

    const tmdb = getTMDBService();
    if (!tmdb) {
      return c.json({ error: 'TMDB service not configured' }, 500);
    }

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const id of ids) {
      try {
        const media = await db.query.mediaItems.findFirst({
          where: eq(mediaItems.id, id),
        });

        if (!media) {
          results.failed.push({ id, error: 'Media not found' });
          continue;
        }

        if (!media.tmdbId) {
          results.failed.push({ id, error: 'No TMDB ID' });
          continue;
        }

        // Fetch fresh data from TMDB
        const details = media.type === 'movie'
          ? await tmdb.getMovieDetails(media.tmdbId)
          : await tmdb.getTVShowDetails(media.tmdbId);

        // Update database
        await db.update(mediaItems)
          .set({
            title: details.title || details.name,
            originalTitle: details.original_title || details.original_name,
            overview: details.overview,
            releaseDate: details.release_date || details.first_air_date,
            year: details.release_date 
              ? new Date(details.release_date).getFullYear()
              : details.first_air_date
              ? new Date(details.first_air_date).getFullYear()
              : null,
            posterPath: details.poster_path,
            backdropPath: details.backdrop_path,
            voteAverage: details.vote_average,
            voteCount: details.vote_count,
            popularity: details.popularity,
            genres: JSON.stringify(details.genres),
            runtime: details.runtime,
            status: details.status,
            tagline: details.tagline,
            numberOfSeasons: (details as any).number_of_seasons,
            numberOfEpisodes: (details as any).number_of_episodes,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(mediaItems.id, id));

        results.success.push(id);
        console.log(`✅ Refreshed metadata for ${media.title} (${id})`);
      } catch (error: any) {
        results.failed.push({ id, error: error.message });
        console.error(`❌ Failed to refresh metadata for ${id}:`, error);
      }
    }

    return c.json({
      message: `Refreshed ${results.success.length} of ${ids.length} items`,
      results,
    });
  } catch (error: any) {
    console.error('Bulk refresh metadata error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Bulk auto-match
app.post('/bulk/auto-match', async (c) => {
  try {
    const { ids } = await c.req.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'Invalid ids array' }, 400);
    }

    const tmdb = getTMDBService();
    if (!tmdb) {
      return c.json({ error: 'TMDB service not configured' }, 500);
    }

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const id of ids) {
      try {
        const media = await db.query.mediaItems.findFirst({
          where: eq(mediaItems.id, id),
        });

        if (!media) {
          console.log(`❌ Media ${id} not found`);
          results.failed.push({ id, error: 'Media not found' });
          continue;
        }

        if (media.tmdbId) {
          console.log(`⚠️ Media ${id} (${media.title}) already matched to TMDB ${media.tmdbId}`);
          results.failed.push({ id, error: 'Already matched' });
          continue;
        }

        console.log(`🔍 Attempting auto-match for media ${id}: "${media.title}" (${media.year || 'no year'})`);
        
        // Media items don't have parsedTitle - we need to search by their title directly
        const isMovie = media.type === 'movie';
        const isTv = media.type === 'tv';
        
        console.log(`   Type: ${isMovie ? 'movie' : 'TV show'}`);
        console.log(`   Title: "${media.title}"`);
        console.log(`   Year: ${media.year || 'not set'}`);
        
        // Search TMDB
        let searchResults;
        try {
          if (isMovie) {
            searchResults = await (await tmdb).searchMovies(media.title, media.year);
          } else {
            searchResults = await (await tmdb).searchTVShows(media.title, media.year);
          }
        } catch (err: any) {
          console.log(`❌ TMDB search failed: ${err.message}`);
          results.failed.push({ id, error: `TMDB search failed: ${err.message}` });
          continue;
        }
        
        if (searchResults.length === 0) {
          console.log(`❌ No TMDB results for "${media.title}"`);
          results.failed.push({ id, error: 'No TMDB results' });
          continue;
        }
        
        console.log(`📊 Found ${searchResults.length} TMDB results:`);
        searchResults.slice(0, 5).forEach((result, idx) => {
          const tmdbTitle = 'title' in result ? result.title : result.name;
          console.log(`   ${idx + 1}. "${tmdbTitle}" (${result.year}) - TMDB ID: ${result.id}`);
        });
        
        // Auto-match: take first result if year matches (or no year available)
        const firstResult = searchResults[0];
        const tmdbTitle = 'title' in firstResult ? firstResult.title : firstResult.name;
        
        // Match if years match OR if we don't have a year to compare
        const yearMatch = !media.year || !firstResult.year || media.year === firstResult.year;
        
        if (yearMatch) {
          console.log(`✅ Auto-matching to: "${tmdbTitle}" (${firstResult.year}) - TMDB ID: ${firstResult.id}`);
          
          // Update media with TMDB data
          await db.update(mediaItems)
            .set({
              tmdbId: firstResult.id,
              title: tmdbTitle,
              year: firstResult.year,
              overview: firstResult.overview,
              posterPath: firstResult.poster_path,
              backdropPath: firstResult.backdrop_path,
              voteAverage: firstResult.vote_average,
            })
            .where(eq(mediaItems.id, id));
          
          console.log(`✅ Successfully matched media ${id}`);
          results.success.push(id);
        } else {
          console.log(`⚠️ Year mismatch (${media.year} vs ${firstResult.year}) - manual selection recommended`);
          results.failed.push({ id, error: 'Manual selection required - year mismatch' });
        }
        
      } catch (error: any) {
        console.log(`❌ Failed to auto-match ${id}: ${error.message}`);
        results.failed.push({ id, error: error.message });
      }
    }

    return c.json({
      message: `Matched ${results.success.length} of ${ids.length} items`,
      results,
    });
  } catch (error: any) {
    console.error('Bulk auto-match error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Bulk rename (placeholder - complex operation)
app.post('/bulk/rename', async (c) => {
  try {
    const { ids, pattern } = await c.req.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'Invalid ids array' }, 400);
    }

    if (!pattern || typeof pattern !== 'string') {
      return c.json({ error: 'Invalid pattern' }, 400);
    }

    // TODO: Implement bulk rename logic
    // This is a complex operation that needs:
    // 1. Parse the pattern (e.g., "{title} ({year})")
    // 2. Rename folders based on media metadata
    // 3. Update database paths
    // 4. Handle file system errors gracefully

    return c.json({
      message: 'Bulk rename not yet implemented',
      pattern,
      ids,
    }, 501);
  } catch (error: any) {
    console.error('Bulk rename error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Bulk delete
app.post('/bulk/delete', async (c) => {
  try {
    const { ids } = await c.req.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'Invalid ids array' }, 400);
    }

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const id of ids) {
      try {
        const media = await db.query.mediaItems.findFirst({
          where: eq(mediaItems.id, id),
        });

        if (!media) {
          results.failed.push({ id, error: 'Media not found' });
          continue;
        }

        // Delete associated files first
        await db.delete(files).where(eq(files.mediaItemId, id));
        
        // Delete media item
        await db.delete(mediaItems).where(eq(mediaItems.id, id));

        results.success.push(id);
        console.log(`🗑️ Deleted ${media.title} (${id})`);
      } catch (error: any) {
        results.failed.push({ id, error: error.message });
        console.error(`❌ Failed to delete ${id}:`, error);
      }
    }

    return c.json({
      message: `Deleted ${results.success.length} of ${ids.length} items`,
      results,
    });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
