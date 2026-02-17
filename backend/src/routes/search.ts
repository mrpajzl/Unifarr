import { Hono } from 'hono';
import { getTMDBService, getTMDBApiKey } from './settings';
import { prisma } from '../db/prisma';

const app = new Hono();

// Search TMDB for movies
app.get('/tmdb/movie', async (c) => {
  try {
    const query = c.req.query('query');
    const year = c.req.query('year');
    
    if (!query) {
      return c.json({ error: 'Query parameter "query" is required' }, 400);
    }
    
    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      return c.json({ error: 'TMDB API key not configured. Please add it in Settings.' }, 500);
    }
    
    const tmdb = await getTMDBService();
    const tmdbResults = await tmdb.searchMovies(query, year ? parseInt(year) : undefined);
    
    // Search local database for existing matches
    let localMedia: any[] = [];
    try {
      localMedia = await prisma.media.findMany();
    } catch (error) {
      console.error('Failed to fetch local media:', error);
    }
    
    // Filter locally for matches (case-insensitive)
    const queryLower = query.toLowerCase();
    localMedia = localMedia.filter((m: any) => 
      m.title?.toLowerCase().includes(queryLower) || 
      m.originalTitle?.toLowerCase().includes(queryLower)
    );
    
    // Mark results that exist locally
    const localTmdbIds = new Set(localMedia.map((m: any) => m.tmdbId));
    const results = tmdbResults.map((result: any) => ({
      ...result,
      inLibrary: localTmdbIds.has(result.id),
      localId: localMedia.find((m: any) => m.tmdbId === result.id)?.id,
    }));
    
    // Sort: local matches first, then by vote average
    results.sort((a: any, b: any) => {
      if (a.inLibrary && !b.inLibrary) return -1;
      if (!a.inLibrary && b.inLibrary) return 1;
      return (b.vote_average || 0) - (a.vote_average || 0);
    });
    
    return c.json({ results });
  } catch (error) {
    console.error('Movie search error:', error);
    return c.json({ 
      error: 'Failed to search movies: ' + (error instanceof Error ? error.message : String(error)),
      results: []
    }, 500);
  }
});

// Search TMDB for TV shows
app.get('/tmdb/tv', async (c) => {
  try {
    const query = c.req.query('query');
    const year = c.req.query('year');
    
    if (!query) {
      return c.json({ error: 'Query parameter "query" is required' }, 400);
    }
    
    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      return c.json({ error: 'TMDB API key not configured. Please add it in Settings.' }, 500);
    }
    
    const tmdb = await getTMDBService();
    const tmdbResults = await tmdb.searchTVShows(query, year ? parseInt(year) : undefined);
    
    // Search local database for existing matches
    let localMedia: any[] = [];
    try {
      localMedia = await prisma.media.findMany();
    } catch (error) {
      console.error('Failed to fetch local media:', error);
    }
    
    // Filter locally for matches (case-insensitive)
    const queryLower = query.toLowerCase();
    localMedia = localMedia.filter((m: any) => 
      m.title?.toLowerCase().includes(queryLower) || 
      m.originalTitle?.toLowerCase().includes(queryLower)
    );
    
    // Mark results that exist locally
    const localTmdbIds = new Set(localMedia.map((m: any) => m.tmdbId));
    const results = tmdbResults.map((result: any) => ({
      ...result,
      inLibrary: localTmdbIds.has(result.id),
      localId: localMedia.find((m: any) => m.tmdbId === result.id)?.id,
    }));
    
    // Sort: local matches first, then by vote average
    results.sort((a: any, b: any) => {
      if (a.inLibrary && !b.inLibrary) return -1;
      if (!a.inLibrary && b.inLibrary) return 1;
      return (b.vote_average || 0) - (a.vote_average || 0);
    });
    
    return c.json({ results });
  } catch (error) {
    console.error('TV search error:', error);
    return c.json({ 
      error: 'Failed to search TV shows: ' + (error instanceof Error ? error.message : String(error)),
      results: []
    }, 500);
  }
});

// Multi search (movies + TV)
app.get('/tmdb/multi', async (c) => {
  try {
    const query = c.req.query('query');
    
    if (!query) {
      return c.json({ error: 'Query parameter "query" is required' }, 400);
    }
    
    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      return c.json({ error: 'TMDB API key not configured. Please add it in Settings.' }, 500);
    }
    
    const tmdb = await getTMDBService();
    const tmdbResults = await tmdb.searchMulti(query);
    
    // Search local database for existing matches
    let localMedia: any[] = [];
    try {
      localMedia = await prisma.media.findMany();
    } catch (error) {
      console.error('Failed to fetch local media:', error);
    }
    
    // Filter locally for matches (case-insensitive)
    const queryLower = query.toLowerCase();
    localMedia = localMedia.filter((m: any) => 
      m.title?.toLowerCase().includes(queryLower) || 
      m.originalTitle?.toLowerCase().includes(queryLower)
    );
    
    // Mark results that exist locally
    const localTmdbIds = new Set(localMedia.map((m: any) => m.tmdbId));
    const results = tmdbResults.map((result: any) => ({
      ...result,
      inLibrary: localTmdbIds.has(result.id),
      localId: localMedia.find((m: any) => m.tmdbId === result.id)?.id,
    }));
    
    // Sort: local matches first, then by vote average
    results.sort((a: any, b: any) => {
      if (a.inLibrary && !b.inLibrary) return -1;
      if (!a.inLibrary && b.inLibrary) return 1;
      return (b.vote_average || 0) - (a.vote_average || 0);
    });
    
    return c.json({ results });
  } catch (error) {
    console.error('Multi search error:', error);
    return c.json({ 
      error: 'Failed to search: ' + (error instanceof Error ? error.message : String(error)),
      results: []
    }, 500);
  }
});

export default app;
