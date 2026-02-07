import { Hono } from 'hono';
import { getTMDBService } from './settings';
import { db } from '../db';
import { mediaItems } from '../db/schema';

const app = new Hono();

/**
 * Get trending movies/TV shows
 */
app.get('/trending/:mediaType/:timeWindow', async (c) => {
  try {
    const mediaType = c.req.param('mediaType'); // 'movie' or 'tv'
    const timeWindow = c.req.param('timeWindow'); // 'day' or 'week'
    const page = parseInt(c.req.query('page') || '1');
    
    if (!['movie', 'tv', 'all'].includes(mediaType)) {
      return c.json({ error: 'Invalid media type. Use: movie, tv, or all' }, 400);
    }
    
    if (!['day', 'week'].includes(timeWindow)) {
      return c.json({ error: 'Invalid time window. Use: day or week' }, 400);
    }
    
    const tmdb = await getTMDBService();
    
    const endpoint = `/trending/${mediaType}/${timeWindow}`;
    const data = await tmdb['fetch'](endpoint, { page });
    
    // Get list of TMDB IDs already in library
    const allMedia = await db.select({ tmdbId: mediaItems.tmdbId }).from(mediaItems);
    const inLibraryIds = new Set(allMedia.map(m => m.tmdbId).filter(Boolean));
    
    // Mark items already in library
    const results = (data.results || []).map((item: any) => ({
      ...item,
      inLibrary: inLibraryIds.has(item.id),
      media_type: item.media_type || mediaType,
    }));
    
    return c.json({ results, page: data.page, total_pages: data.total_pages });
  } catch (error) {
    console.error('Trending error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch trending',
      results: []
    }, 500);
  }
});

/**
 * Get popular movies
 */
app.get('/popular/movies', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    
    const tmdb = await getTMDBService();
    
    
    const data = await tmdb['fetch']('/movie/popular', { page });
    
    // Get list of TMDB IDs already in library
    const allMedia = await db.select({ tmdbId: mediaItems.tmdbId }).from(mediaItems);
    const inLibraryIds = new Set(allMedia.map(m => m.tmdbId).filter(Boolean));
    
    // Mark items already in library
    const results = (data.results || []).map((item: any) => ({
      ...item,
      inLibrary: inLibraryIds.has(item.id),
      media_type: 'movie',
    }));
    
    return c.json({ results, page: data.page, total_pages: data.total_pages });
  } catch (error) {
    console.error('Popular movies error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch popular movies',
      results: []
    }, 500);
  }
});

/**
 * Get popular TV shows
 */
app.get('/popular/tv', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    
    const tmdb = await getTMDBService();
    const data = await tmdb['fetch']('/tv/popular', { page });
    
    // Get list of TMDB IDs already in library
    const allMedia = await db.select({ tmdbId: mediaItems.tmdbId }).from(mediaItems);
    const inLibraryIds = new Set(allMedia.map(m => m.tmdbId).filter(Boolean));
    
    // Mark items already in library
    const results = (data.results || []).map((item: any) => ({
      ...item,
      inLibrary: inLibraryIds.has(item.id),
      media_type: 'tv',
    }));
    
    return c.json({ results, page: data.page, total_pages: data.total_pages });
  } catch (error) {
    console.error('Popular TV error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch popular TV shows',
      results: []
    }, 500);
  }
});

/**
 * Get top rated movies
 */
app.get('/top-rated/movies', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    
    const tmdb = await getTMDBService();
    const data = await tmdb['fetch']('/movie/top_rated', { page });
    
    // Get list of TMDB IDs already in library
    const allMedia = await db.select({ tmdbId: mediaItems.tmdbId }).from(mediaItems);
    const inLibraryIds = new Set(allMedia.map(m => m.tmdbId).filter(Boolean));
    
    // Mark items already in library
    const results = (data.results || []).map((item: any) => ({
      ...item,
      inLibrary: inLibraryIds.has(item.id),
      media_type: 'movie',
    }));
    
    return c.json({ results, page: data.page, total_pages: data.total_pages });
  } catch (error) {
    console.error('Top rated movies error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch top rated movies',
      results: []
    }, 500);
  }
});

/**
 * Get top rated TV shows
 */
app.get('/top-rated/tv', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    
    const tmdb = await getTMDBService();
    const data = await tmdb['fetch']('/tv/top_rated', { page });
    
    // Get list of TMDB IDs already in library
    const allMedia = await db.select({ tmdbId: mediaItems.tmdbId }).from(mediaItems);
    const inLibraryIds = new Set(allMedia.map(m => m.tmdbId).filter(Boolean));
    
    // Mark items already in library
    const results = (data.results || []).map((item: any) => ({
      ...item,
      inLibrary: inLibraryIds.has(item.id),
      media_type: 'tv',
    }));
    
    return c.json({ results, page: data.page, total_pages: data.total_pages });
  } catch (error) {
    console.error('Top rated TV error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch top rated TV shows',
      results: []
    }, 500);
  }
});

/**
 * Get now playing movies (in theaters)
 */
app.get('/now-playing', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    
    const tmdb = await getTMDBService();
    const data = await tmdb['fetch']('/movie/now_playing', { page });
    // Get list of TMDB IDs already in library
    const allMedia = await db.select({ tmdbId: mediaItems.tmdbId }).from(mediaItems);
    const inLibraryIds = new Set(allMedia.map(m => m.tmdbId).filter(Boolean));
    
    // Mark items already in library
    const results = (data.results || []).map((item: any) => ({
      ...item,
      inLibrary: inLibraryIds.has(item.id),
      media_type: 'movie',
    }));
    
    return c.json({ results, page: data.page, total_pages: data.total_pages });
  } catch (error) {
    console.error('Now playing error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch now playing',
      results: []
    }, 500);
  }
});

/**
 * Get upcoming movies
 */
app.get('/upcoming', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    
    const tmdb = await getTMDBService();
    const data = await tmdb['fetch']('/movie/upcoming', { page });
    
    const allMedia = await db.select({ tmdbId: mediaItems.tmdbId }).from(mediaItems);
    const inLibraryIds = new Set(allMedia.map(m => m.tmdbId).filter(Boolean));
    
    // Mark items already in library
    const results = (data.results || []).map((item: any) => ({
      ...item,
      inLibrary: inLibraryIds.has(item.id),
      media_type: 'movie',
    }));
    
    return c.json({ results, page: data.page, total_pages: data.total_pages });
  } catch (error) {
    console.error('Upcoming error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch upcoming',
      results: []
    }, 500);
  }
});

/**
 * Get person details with filmography
 */
app.get('/person/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const tmdb = await getTMDBService();
    // Get person details with credits
    const person = await tmdb['fetch'](`/person/${id}`, { append_to_response: 'movie_credits,tv_credits' });
    // Get list of TMDB IDs already in library
    const allMedia = await db.select({ tmdbId: mediaItems.tmdbId }).from(mediaItems);
    const inLibraryIds = new Set(allMedia.map(m => m.tmdbId).filter(Boolean));
    
    // Mark movies/shows already in library
    if (person.movie_credits?.cast) {
      person.movie_credits.cast = person.movie_credits.cast.map((movie: any) => ({
        ...movie,
        inLibrary: inLibraryIds.has(movie.id),
        media_type: 'movie',
      }));
    }
    
    if (person.tv_credits?.cast) {
      person.tv_credits.cast = person.tv_credits.cast.map((show: any) => ({
        ...show,
        inLibrary: inLibraryIds.has(show.id),
        media_type: 'tv',
      }));
    }
    
    return c.json(person);
  } catch (error) {
    console.error('Person details error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch person details'
    }, 500);
  }
});

/**
 * Get movie/TV show details with videos (trailers)
 */
app.get('/details/:mediaType/:id', async (c) => {
  try {
    const mediaType = c.req.param('mediaType'); // 'movie' or 'tv'
    const id = c.req.param('id');
    
    if (!['movie', 'tv'].includes(mediaType)) {
      return c.json({ error: 'Invalid media type. Use: movie or tv' }, 400);
    }
    
    const tmdb = await getTMDBService();
    // Get details
    const details = await tmdb['fetch'](`/${mediaType}/${id}`, { append_to_response: 'videos,credits' });
    
    const allMedia = await db.select({ tmdbId: mediaItems.tmdbId }).from(mediaItems);
    const inLibraryIds = new Set(allMedia.map(m => m.tmdbId).filter(Boolean));
    
    return c.json({
      ...details,
      inLibrary: inLibraryIds.has(parseInt(id)),
      media_type: mediaType,
    });
  } catch (error) {
    console.error('Details error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch details'
    }, 500);
  }
});

export default app;
