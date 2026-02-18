import { Hono } from 'hono';
import { getTrackerManager } from '../services/trackers/tracker-manager';
import { getSettings } from './settings';
import { rankSearchResults } from '../lib/match-scorer';
import {
  getMovieSearchQueries,
  getTVSearchQueries,
  MovieData,
  TVShowData,
} from '../services/search-template-parser';

const router = new Hono();

/**
 * POST /api/search/movie
 * Search for a movie using templates
 * Body: MovieData
 */
router.post('/movie', async (c) => {
  try {
    const movieData: MovieData = await c.req.json();

    if (!movieData.tmdbId) {
      return c.json({ error: 'tmdbId is required' }, 400);
    }

    // Get settings
    const settings = await getSettings();
    const templates = settings.searchTemplates?.movies || [
      '{Movie Title} {Release Year}',
      '{Movie OriginalTitle} {Release Year}',
      '{Movie CleanTitle} {Release Year}',
      '{Movie Title}',
    ];
    const preferredLanguages = settings.preferences?.languages || ['CZ', 'EN'];
    const minTitleScore = settings.preferences?.minTitleScore || 50;

    // Generate search queries from templates
    const queries = getMovieSearchQueries(templates, movieData);
    console.log(`🎬 Movie search for "${movieData.title}" (${movieData.releaseYear})`);
    console.log(`📝 Generated ${queries.length} queries:`, queries);

    // Execute all queries in parallel
    const queryResults = await Promise.all(
      queries.map(async (query) => {
        return await performSearch(query, 'movie', movieData.releaseYear, settings);
      })
    );

    // Combine and deduplicate results
    const allResults = deduplicateResults(queryResults.flat());
    
    console.log(`🔍 Found ${allResults.length} unique results across all queries`);

    // Rank results
    const rankedResults = rankSearchResults(allResults, movieData.title, {
      expectedYear: movieData.releaseYear,
      preferredLanguages,
      minTitleScore,
    });

    return c.json({
      movie: movieData,
      queries,
      results: rankedResults,
      total: rankedResults.length,
      rawTotal: allResults.length,
    });

  } catch (error: any) {
    console.error('Movie template search error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/search/tv
 * Search for a TV episode using templates
 * Body: TVShowData
 */
router.post('/tv', async (c) => {
  try {
    const tvData: TVShowData = await c.req.json();

    if (!tvData.tmdbId) {
      return c.json({ error: 'tmdbId is required' }, 400);
    }

    // Get settings
    const settings = await getSettings();
    
    // Check for per-show override
    const showOverride = (settings.searchTemplates?.overrides as any)?.[tvData.tmdbId];
    const templates = showOverride || settings.searchTemplates?.tv || [
      '{Series Title} S{Season:2}E{Episode:2}',
      '{Series OriginalTitle} S{Season:2}E{Episode:2}',
      '{Series CleanTitle} S{Season:2}E{Episode:2}',
      '{Series Title} {Season}x{Episode:2}',
    ];
    
    const preferredLanguages = settings.preferences?.languages || ['CZ', 'EN'];
    const minTitleScore = settings.preferences?.minTitleScore || 50;

    // Generate search queries from templates
    const queries = getTVSearchQueries(templates, tvData);
    console.log(`📺 TV search for "${tvData.title}" S${tvData.season}E${tvData.episode}`);
    console.log(`📝 Generated ${queries.length} queries:`, queries);
    if (showOverride) {
      console.log(`⚡ Using show-specific override templates`);
    }

    // Execute all queries in parallel
    const queryResults = await Promise.all(
      queries.map(async (query) => {
        return await performSearch(query, 'tv', tvData.releaseYear, settings);
      })
    );

    // Combine and deduplicate results
    const allResults = deduplicateResults(queryResults.flat());
    
    console.log(`🔍 Found ${allResults.length} unique results across all queries`);

    // Rank results
    const rankedResults = rankSearchResults(allResults, tvData.title, {
      expectedYear: tvData.releaseYear,
      preferredLanguages,
      minTitleScore,
    });

    return c.json({
      tv: tvData,
      queries,
      results: rankedResults,
      total: rankedResults.length,
      rawTotal: allResults.length,
      usedOverride: !!showOverride,
    });

  } catch (error: any) {
    console.error('TV template search error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Perform search across all sources
 */
async function performSearch(
  query: string,
  type?: 'movie' | 'tv',
  year?: number,
  settings?: any
): Promise<any[]> {
  const results: any[] = [];

  // Search trackers
  try {
    const manager = await getTrackerManager();
    const trackerResults = await manager.searchAll({
      query,
      type,
      year,
      limit: 100,
    });
    results.push(...trackerResults.map((r: any) => ({
      ...r,
      provider: r.provider || 'Tracker',
    })));
  } catch (error) {
    console.error(`Tracker search error for "${query}":`, error);
  }

  // Search Webshare
  try {
    const webshareEnabled = settings?.webshare?.enabled;
    if (webshareEnabled && settings?.webshare?.username && settings?.webshare?.password) {
      const { WebshareService } = await import('../services/webshare');
      const webshare = new WebshareService({
        username: settings.webshare.username,
        password: settings.webshare.password,
      });
      
      const result = await webshare.search(query, 50);
      
      results.push(...result.files.map((f: any) => ({
        title: f.name,
        downloadUrl: `webshare:${f.ident}`,
        infoUrl: `https://webshare.cz/#/file/${f.ident}/overview`,
        size: Number(f.size || 0),
        seeders: 10000,
        leechers: 0,
        category: '',
        publishDate: undefined,
        poster: undefined,
        description: undefined,
        provider: 'Webshare',
      })));
    }
  } catch (error) {
    console.error(`Webshare search error for "${query}":`, error);
  }

  return results;
}

/**
 * Deduplicate results by download URL or title
 */
function deduplicateResults(results: any[]): any[] {
  const seen = new Set<string>();
  const unique: any[] = [];

  for (const result of results) {
    // Use downloadUrl as primary key, fallback to normalized title
    const key = result.downloadUrl || result.title.toLowerCase().replace(/\s+/g, '');
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(result);
    }
  }

  return unique;
}

export default router;
