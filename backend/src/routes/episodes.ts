import { Hono } from 'hono';
import { getTMDBService, getTMDBApiKey } from './settings';
import { prisma } from '../db/prisma';


const app = new Hono();

interface Episode {
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string;
  still_path: string | null;
  runtime: number;
}

interface MatchedEpisode extends Episode {
  file?: {
    id: number;
    filename: string;
    path: string;
    size: number;
  };
  hasFile: boolean;
}

/**
 * GET /api/media/:id/episodes
 * Get all episodes for a TV show from TMDB
 */
app.get('/:id/episodes', async (c) => {
  try {
    const mediaId = parseInt(c.req.param('id'));
    
    // Get media item
    const media = await prisma.media.findFirst({
      where: { id: mediaId },
    });
    
    if (!media) {
      return c.json({ error: 'Media not found' }, 404);
    }
    
    if (media.type !== 'tv') {
      return c.json({ error: 'Media is not a TV show' }, 400);
    }
    
    if (!media.tmdbId) {
      return c.json({ error: 'Media has no TMDB ID' }, 400);
    }
    
    // Get TMDB API key
    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      return c.json({ error: 'TMDB API key not configured' }, 500);
    }
    
    const tmdb = await getTMDBService();

    // Determine number of seasons — use DB value, or fetch from TMDB if missing
    let numberOfSeasons = media.numberOfSeasons;
    if (!numberOfSeasons) {
      try {
        const showDetails = await tmdb.getTVShowDetails(media.tmdbId);
        numberOfSeasons = showDetails?.number_of_seasons || null;
        // Persist to DB for next time
        if (numberOfSeasons) {
          await prisma.media.update({
            where: { id: mediaId },
            data: {
              numberOfSeasons,
              numberOfEpisodes: showDetails?.number_of_episodes || undefined,
            },
          });
        }
      } catch (error) {
        console.error('Failed to fetch show details:', error);
      }
    }

    // If TMDB can't tell us, fall back to max season found in local files
    if (!numberOfSeasons) {
      const filesForShow = await prisma.file.findMany({
        where: { mediaItemId: mediaId },
        select: { parsedSeason: true },
      });
      const maxSeason = filesForShow.reduce((max, f) => Math.max(max, f.parsedSeason || 0), 0);
      numberOfSeasons = maxSeason || 1;
    }
    
    // Fetch all seasons and episodes
    const seasons: any[] = [];
    
    for (let seasonNum = 1; seasonNum <= numberOfSeasons; seasonNum++) {
      try {
        const seasonData = await tmdb.getTVSeason(media.tmdbId, seasonNum);
        seasons.push(seasonData);
      } catch (error) {
        console.error(`Failed to fetch season ${seasonNum}:`, error);
      }
    }
    
    return c.json({ 
      mediaId,
      tmdbId: media.tmdbId,
      title: media.title,
      seasons,
    });
    
  } catch (error) {
    console.error('Get episodes error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get episodes' 
    }, 500);
  }
});

/**
 * GET /api/media/:id/episodes/matched
 * Get episodes with file matching information
 */
app.get('/:id/episodes/matched', async (c) => {
  try {
    const mediaId = parseInt(c.req.param('id'));
    
    // Get media item
    const media = await prisma.media.findFirst({
      where: { id: mediaId },
    });
    
    if (!media) {
      return c.json({ error: 'Media not found' }, 404);
    }
    
    if (media.type !== 'tv') {
      return c.json({ error: 'Media is not a TV show' }, 400);
    }
    
    // Get all files for this media
    const mediaFiles = await prisma.file.findMany({
      where: { mediaItemId: mediaId },
    });
    
    // Get TMDB episodes
    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      return c.json({ error: 'TMDB API key not configured' }, 500);
    }
    
    const tmdb = await getTMDBService();

    // Determine number of seasons — use DB value, or fetch from TMDB if missing
    let numberOfSeasons = media.numberOfSeasons;
    if (!numberOfSeasons) {
      try {
        const showDetails = await tmdb.getTVShowDetails(media.tmdbId!);
        numberOfSeasons = showDetails?.number_of_seasons || null;
        if (numberOfSeasons) {
          await prisma.media.update({
            where: { id: mediaId },
            data: {
              numberOfSeasons,
              numberOfEpisodes: showDetails?.number_of_episodes || undefined,
            },
          });
        }
      } catch (error) {
        console.error('Failed to fetch show details:', error);
      }
    }
    // Fallback: detect from existing files
    if (!numberOfSeasons) {
      const maxSeason = mediaFiles.reduce((max, f) => Math.max(max, f.parsedSeason || 0), 0);
      numberOfSeasons = maxSeason || 1;
    }
    
    const seasons: any[] = [];
    
    for (let seasonNum = 1; seasonNum <= numberOfSeasons; seasonNum++) {
      try {
        const seasonData = await tmdb.getTVSeason(media.tmdbId!, seasonNum);
        
        // Match files to episodes
        const matchedEpisodes = seasonData.episodes.map((episode: Episode) => {
          // Find matching file by season/episode number
          const matchingFile = mediaFiles.find(f => 
            f.parsedSeason === episode.season_number && 
            f.parsedEpisode === episode.episode_number
          );
          
          return {
            ...episode,
            hasFile: !!matchingFile,
            file: matchingFile ? {
              id: matchingFile.id,
              filename: matchingFile.filename,
              path: matchingFile.path,
              size: matchingFile.size ? Number(matchingFile.size) : 0,
            } : undefined,
          };
        });
        
        seasons.push({
          ...seasonData,
          episodes: matchedEpisodes,
        });
        
      } catch (error) {
        console.error(`Failed to fetch season ${seasonNum}:`, error);
      }
    }
    
    return c.json({ 
      mediaId,
      tmdbId: media.tmdbId,
      title: media.title,
      seasons,
    });
    
  } catch (error) {
    console.error('Get matched episodes error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get matched episodes' 
    }, 500);
  }
});

export default app;
