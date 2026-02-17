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
    
    // Fetch all seasons and episodes
    const seasons: any[] = [];
    const numberOfSeasons = media.numberOfSeasons || 1;
    
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
    const numberOfSeasons = media.numberOfSeasons || 1;
    
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
              size: matchingFile.size || 0,
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
