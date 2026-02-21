import { Hono } from 'hono';
import { prisma } from '../db/prisma';
import { getTMDBService, getTMDBApiKey, getSettings } from './settings';
import { autoMatchFolder, autoMatchAll } from '../services/auto-matcher';
import { mkdir } from 'fs/promises';
import path from 'path';
import { getMediaFileInfo, formatFileSize, formatDuration } from '../services/media-info';
import { moveMediaFolder, validatePath } from '../services/folder-mover';
import { getMediaTranslation, prewarmTranslations } from '../services/translation-manager';
import { getCurrentUser } from '../middleware/auth';

const app = new Hono();

/**
 * Helper: Get media with translation for user's preferred language
 */
async function getMediaWithTranslation(
  media: any,
  userLanguage: string = 'en',
  apiKey?: string
): Promise<any> {
  // If requesting English or no TMDB ID, return base data
  if (userLanguage === 'en' || !media.tmdbId || !media.type) {
    return media;
  }

  // Try to get translation
  if (apiKey) {
    try {
      const translation = await getMediaTranslation(
        media.id,
        media.tmdbId,
        media.type as 'movie' | 'tv',
        userLanguage,
        apiKey
      );

      if (translation) {
        return {
          ...media,
          title: translation.title,
          overview: translation.overview || media.overview,
          tagline: translation.tagline || media.tagline,
          _language: userLanguage,
          _baseTitle: media.title, // Keep EN title for reference
        };
      }
    } catch (error) {
      console.error(`Failed to get translation for media ${media.id}:`, error);
    }
  }

  // Fallback to English
  return {
    ...media,
    _language: 'en',
  };
}

// Get all media items
app.get('/', async (c) => {
  const allMedia = await prisma.media.findMany({
    include: {
      files: {
        select: {
          id: true,
          parsedSeason: true,
          parsedEpisode: true,
        },
      },
    },
  });
  
  // Add completeness info for TV shows
  const enrichedMedia = allMedia.map((media) => {
    if (media.type === 'tv' && media.numberOfEpisodes) {
      // Count unique episodes (season + episode combination)
      const uniqueEpisodes = new Set(
        media.files
          .filter(f => f.parsedSeason && f.parsedEpisode)
          .map(f => `S${f.parsedSeason}E${f.parsedEpisode}`)
      );
      
      const availableEpisodes = uniqueEpisodes.size;
      const totalEpisodes = media.numberOfEpisodes;
      const completeness = totalEpisodes > 0 ? availableEpisodes / totalEpisodes : 0;
      
      return {
        ...media,
        availableEpisodes,
        totalEpisodes,
        completeness,
      };
    }
    
    return media;
  });
  
  return c.json(enrichedMedia);
});

// Get media item by ID
app.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const media = await prisma.media.findUnique({
    where: { id },
    include: { files: { take: 1, orderBy: { id: 'asc' } } },
  });
  
  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }
  
  // If libraryPath is not set but we have linked files, derive it from the first file.
  // This ensures downloads always go to the EXISTING folder, not a newly generated one.
  let libraryPath = media.libraryPath;
  if (!libraryPath && media.files.length > 0) {
    const { dirname } = await import('path');
    libraryPath = dirname(media.files[0].path);
  }
  
  const { files: _files, ...mediaData } = media;
  
  // Fetch full TMDB data if tmdbId is available
  let tmdbData = null;
  if (media.tmdbId && media.type) {
    try {
      const apiKey = await getTMDBApiKey();
      const endpoint = media.type === 'movie' 
        ? `https://api.themoviedb.org/3/movie/${media.tmdbId}?api_key=${apiKey}&append_to_response=videos,credits,recommendations`
        : `https://api.themoviedb.org/3/tv/${media.tmdbId}?api_key=${apiKey}&append_to_response=videos,credits,recommendations`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        tmdbData = await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch TMDB data for media detail:', error);
      // Continue without TMDB data
    }
  }
  
  return c.json({ 
    ...mediaData, 
    libraryPath,
    _tmdb: tmdbData,
  });
});

// Get episodes for a TV show (raw file list, no TMDB required)
app.get('/:id/episodes', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  const media = await prisma.media.findUnique({
    where: { id },
  });
  
  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }
  
  if (media.type !== 'tv') {
    return c.json({ error: 'Media is not a TV show' }, 400);
  }
  
  // Get all files for this media item
  const mediaFiles = await prisma.file.findMany({
    where: { mediaItemId: id },
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
            size: Number(ep.size || 0),
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
  
  // ── NEW: Fetch ENGLISH only (base language) ──────────────────────────────
  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const mediaData = await tmdb[type === 'movie' ? 'getMovieDetails' : 'getTVShowDetails'](tmdbId);
  
  if (!mediaData) {
    return c.json({ error: 'Failed to fetch from TMDB' }, 500);
  }
  
  // Extract base data (English)
  const title = 'title' in mediaData ? mediaData.title : mediaData.name;
  const originalTitle = 'original_title' in mediaData ? mediaData.original_title : 'original_name' in mediaData ? mediaData.original_name : undefined;
  const year = mediaData.year;
  
  // Determine library path (use English title for folders)
  let libraryPath: string | undefined;
  try {
    const settings = await getSettings();
    
    const basePath = type === 'movie' ? settings.moviesPath : settings.tvPath;
    const folderName = year ? `${title} (${year})` : title;
    libraryPath = path.join(basePath, folderName);
  } catch (error) {
    console.error('Failed to determine library path:', error);
  }
  
  // Insert into database (English as base)
  const inserted = await prisma.media.create({
    data: {
      type,
      title, // English title (base)
      originalTitle,
      year,
      tmdbId: mediaData.id,
      imdbId: 'imdb_id' in mediaData ? mediaData.imdb_id : undefined,
      overview: mediaData.overview, // English overview
      tagline: mediaData.tagline,
      posterPath: mediaData.poster_path,
      backdropPath: mediaData.backdrop_path,
      voteAverage: mediaData.vote_average,
      voteCount: mediaData.vote_count,
      genres: JSON.stringify(mediaData.genres),
      runtime: 'runtime' in mediaData ? mediaData.runtime : undefined,
      numberOfSeasons: 'number_of_seasons' in mediaData ? mediaData.number_of_seasons : undefined,
      numberOfEpisodes: 'number_of_episodes' in mediaData ? mediaData.number_of_episodes : undefined,
      status: mediaData.status,
      libraryPath,
    },
  });
  
  // Create folder in library
  if (libraryPath) {
    try {
      const folderName = year ? `${title} (${year})` : title;
      
      await mkdir(libraryPath, { recursive: true });
      console.log(`✅ Created folder: ${libraryPath}`);
      
      await prisma.file.create({
        data: {
          path: libraryPath,
          filename: folderName,
          parsedTitle: title,
          parsedYear: year,
          size: BigInt(0),
          matched: true,
          mediaItemId: inserted.id,
          matchConfidence: 1.0,
          scannedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  }
  
  // ── Pre-warm popular translations (async, non-blocking) ──────────────────
  prewarmTranslations(
    inserted.id,
    tmdbId,
    type as 'movie' | 'tv',
    apiKey,
    ['cs', 'de', 'fr'] // Top 3 languages
  ).catch(err => console.error('Pre-warming failed:', err));
  
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
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });
  
  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }
  
  // Update file record
  await prisma.file.update({
    where: { id: fileId },
    data: {
      mediaItemId: mediaId,
      matched: true,
      matchConfidence: confidence,
    },
  });
  
  let matchedCount = 1;
  
  // If it's a TV show, match all episodes in the same show folder
  if (file.parsedSeason !== null && file.parsedSeason !== undefined) {
    // Extract show folder from path
    const pathModule = await import('path');
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
    const allUnmatched = await prisma.file.findMany({
      where: {
        id: { not: fileId }, // Not the same file
        matched: false, // Not already matched
        parsedSeason: { not: null },
      },
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
        await prisma.file.update({
          where: { id: episode.id },
          data: {
            mediaItemId: mediaId,
            matched: true,
            matchConfidence: confidence,
          },
        });
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
    // Unlink all files
    await prisma.file.updateMany({
      where: { mediaItemId: id },
      data: { mediaItemId: null, matched: false },
    });
    
    // Delete media item
    await prisma.media.delete({
      where: { id },
    });
    
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
  const media = await prisma.media.findUnique({
    where: { id },
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
  
  const media = await prisma.media.findUnique({
    where: { id },
  });
  
  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }
  
  // Update monitored status
  await prisma.media.update({
    where: { id },
    data: { monitored },
  });
  
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
  const { tmdbId, type, force } = body;
  
  if (!tmdbId || !type) {
    return c.json({ error: 'tmdbId and type are required' }, 400);
  }
  
  if (type !== 'movie' && type !== 'tv') {
    return c.json({ error: 'type must be "movie" or "tv"' }, 400);
  }
  
  const media = await prisma.media.findUnique({
    where: { id },
  });
  
  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }
  
  try {
    const apiKey = await getTMDBApiKey();
    
    if (!apiKey) {
      return c.json({ error: 'TMDB API key not configured' }, 500);
    }
    
    // Check if tmdbId already exists for ANY other media item (DB has global unique on tmdb_id)
    const existingMedia = await prisma.media.findFirst({
      where: {
        tmdbId: tmdbId,
        id: { not: id },
      },
      include: { files: true },
    });
    
    // Fetch metadata from TMDB first (needed for both update and merge paths)
    const endpoint = type === 'movie' 
      ? `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits,external_ids`
      : `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&append_to_response=credits,external_ids`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      return c.json({ error: 'Failed to fetch from TMDB' }, 500);
    }
    
    const tmdbData = await response.json() as any;
    
    const updateData: any = {
      tmdbId: tmdbId,
      type: type,
      title: type === 'movie' ? tmdbData.title : tmdbData.name,
      originalTitle: type === 'movie' ? tmdbData.original_title : tmdbData.original_name,
      overview: tmdbData.overview,
      year: type === 'movie'
        ? tmdbData.release_date ? new Date(tmdbData.release_date).getFullYear() : null
        : tmdbData.first_air_date ? new Date(tmdbData.first_air_date).getFullYear() : null,
      runtime: type === 'movie' ? tmdbData.runtime : tmdbData.episode_run_time?.[0],
      genres: tmdbData.genres?.map((g: any) => g.name).join(', '),
      posterPath: tmdbData.poster_path,
      backdropPath: tmdbData.backdrop_path,
      voteAverage: tmdbData.vote_average,
      voteCount: tmdbData.vote_count,
      status: tmdbData.status,
      imdbId: tmdbData.external_ids?.imdb_id,
      numberOfSeasons: type === 'tv' ? tmdbData.number_of_seasons : null,
      numberOfEpisodes: type === 'tv' ? tmdbData.number_of_episodes : null,
    };
    
    if (existingMedia) {
      // This TMDB ID is already in the library as another media entry.
      // Merge strategy: move all files from the current (unidentified) entry
      // to the existing identified entry, refresh its metadata, then delete the duplicate.
      console.log(`🔀 TMDB ID ${tmdbId} already exists as "${existingMedia.title}" (id=${existingMedia.id}). Merging media ${id} into it.`);
      
      // Get files attached to the entry being identified
      const currentFiles = await prisma.file.findMany({
        where: { mediaItemId: id },
      });
      
      // Move files and related data to the existing entry
      await prisma.$transaction(async (tx) => {
        if (currentFiles.length > 0) {
          await tx.file.updateMany({
            where: { mediaItemId: id },
            data: { mediaItemId: existingMedia.id },
          });
        }
        // Re-link downloads too
        await tx.download.updateMany({
          where: { mediaItemId: id },
          data: { mediaItemId: existingMedia.id },
        });
        // Refresh metadata on the existing entry
        await tx.media.update({
          where: { id: existingMedia.id },
          data: updateData,
        });
        // Delete the now-empty duplicate entry
        await tx.media.delete({ where: { id } });
      });
      
      console.log(`✅ Merged: moved ${currentFiles.length} file(s) to media ${existingMedia.id} ("${updateData.title}"), deleted duplicate media ${id}`);
      
      return c.json({
        success: true,
        message: `Successfully identified as ${updateData.title} (merged with existing library entry)`,
        tmdbId,
        title: updateData.title,
        mergedIntoId: existingMedia.id,
      });
    }
    
    // No conflict — straightforward update
    await prisma.media.update({
      where: { id },
      data: updateData,
    });
    
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

    const tmdb = await getTMDBService();

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const id of ids) {
      try {
        const media = await prisma.media.findUnique({
          where: { id },
        });

        if (!media) {
          results.failed.push({ id, error: 'Media not found' });
          continue;
        }

        if (!media.tmdbId) {
          results.failed.push({ id, error: 'No TMDB ID' });
          continue;
        }

        // Fetch fresh data from TMDB (both EN and localized)
        const multiData = (media.type === 'movie'
          ? await tmdb.getMovieDetailsMultilang(media.tmdbId)
          : await tmdb.getTVShowDetailsMultilang(media.tmdbId));

        if (!multiData) {
          results.failed.push({ id, error: 'Failed to fetch from TMDB' });
          continue;
        }

        const { en: detailsEn, localized: detailsLocal } = multiData;

        // Update database with both versions
        await prisma.media.update({
          where: { id },
          data: {
            title: (detailsLocal as any).title || (detailsLocal as any).name,
            titleEn: (detailsEn as any).title || (detailsEn as any).name,
            originalTitle: (detailsLocal as any).original_title || (detailsLocal as any).original_name,
            overview: detailsLocal.overview,
            overviewEn: detailsEn.overview,
            year: (detailsLocal as any).release_date 
              ? new Date((detailsLocal as any).release_date).getFullYear()
              : (detailsLocal as any).first_air_date
              ? new Date((detailsLocal as any).first_air_date).getFullYear()
              : null,
            posterPath: detailsLocal.poster_path,
            backdropPath: detailsLocal.backdrop_path,
            voteAverage: detailsLocal.vote_average,
            voteCount: detailsLocal.vote_count,
            genres: JSON.stringify(detailsLocal.genres),
            runtime: (detailsLocal as any).runtime,
            status: detailsLocal.status,
            numberOfSeasons: (detailsLocal as any).number_of_seasons,
            numberOfEpisodes: (detailsLocal as any).number_of_episodes,
            updatedAt: new Date(),
          },
        });

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

    const tmdb = await getTMDBService();

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const id of ids) {
      try {
        const media = await prisma.media.findUnique({
          where: { id },
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
        
        const isMovie = media.type === 'movie';
        
        console.log(`   Type: ${isMovie ? 'movie' : 'TV show'}`);
        console.log(`   Title: "${media.title}"`);
        console.log(`   Year: ${media.year || 'not set'}`);
        
        // Search TMDB
        let searchResults;
        try {
          if (isMovie) {
            searchResults = await tmdb.searchMovies(media.title, media.year || undefined);
          } else {
            searchResults = await tmdb.searchTVShows(media.title, media.year || undefined);
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
          await prisma.media.update({
            where: { id },
            data: {
              tmdbId: firstResult.id,
              title: tmdbTitle,
              year: firstResult.year,
              overview: firstResult.overview,
              posterPath: firstResult.poster_path,
              backdropPath: firstResult.backdrop_path,
              voteAverage: firstResult.vote_average,
            },
          });
          
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
        const media = await prisma.media.findUnique({
          where: { id },
        });

        if (!media) {
          results.failed.push({ id, error: 'Media not found' });
          continue;
        }

        // Delete associated files first
        await prisma.file.deleteMany({
          where: { mediaItemId: id },
        });
        
        // Delete media item
        await prisma.media.delete({
          where: { id },
        });

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
