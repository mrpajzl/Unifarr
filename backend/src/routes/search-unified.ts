import { Hono } from 'hono';
import { getTrackerManager } from '../services/trackers/tracker-manager';
import { getSettings } from './settings';
import { rankSearchResults } from '../lib/match-scorer';

const router = new Hono();

/**
 * POST /api/search/unified
 * Search across all sources (trackers + Webshare) with unified ranking
 * Body: { query: string, type?: 'movie' | 'tv', year?: number, limit?: number }
 */
router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { query, type, year, limit } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    // Get settings for preferences
    const settings = await getSettings();
    const preferredLanguages = settings.preferences?.languages || ['CZ', 'EN'];
    const minTitleScore = settings.preferences?.minTitleScore || 50; // Phase 1: title filter

    // Search trackers and Webshare in parallel
    const [trackerResults, webshareResults] = await Promise.allSettled([
      // Trackers
      (async () => {
        try {
          const manager = await getTrackerManager();
          return await manager.searchAll({
            query,
            type,
            year,
            limit: 100,
          });
        } catch (error) {
          console.error('Tracker search error:', error);
          return [];
        }
      })(),
      
      // Webshare
      (async () => {
        try {
          const webshareEnabled = settings.webshare?.enabled;
          if (!webshareEnabled || !settings.webshare?.username || !settings.webshare?.password) {
            return [];
          }

          const { WebshareService } = await import('../services/webshare');
          const webshare = new WebshareService({
            username: settings.webshare.username,
            password: settings.webshare.password,
          });
          
          const result = await webshare.search(query, 50);
          
          // Convert Webshare files to unified format
          return result.files.map((f: any) => ({
            title: f.name,
            downloadUrl: `webshare:${f.ident}`,
            infoUrl: `https://webshare.cz/#/file/${f.ident}/overview`, // Link to Webshare file page
            size: f.size,
            seeders: 10000, // Webshare = unlimited speed, give max seeders bonus
            leechers: 0,
            category: '',
            publishDate: undefined,
            poster: undefined,
            description: undefined,
            provider: 'Webshare',
          }));
        } catch (error) {
          console.error('Webshare search error:', error);
          return [];
        }
      })(),
    ]);

    // Combine results
    const allResults: any[] = [];

    if (trackerResults.status === 'fulfilled') {
      allResults.push(...trackerResults.value.map((r: any) => ({
        ...r,
        provider: r.provider || 'Tracker',
        // Ensure infoUrl is passed through
        infoUrl: r.infoUrl,
      })));
    }

    if (webshareResults.status === 'fulfilled') {
      allResults.push(...webshareResults.value);
    }

    console.log(`🔍 Combined search: ${allResults.length} total results from all sources`);

    // Rank and filter all results together (two-phase scoring)
    const rankedResults = rankSearchResults(allResults, query, {
      expectedYear: year,
      preferredLanguages,
      minTitleScore, // Phase 1: filter wrong movies
    });

    // Apply limit after ranking
    const finalResults = limit ? rankedResults.slice(0, limit) : rankedResults;

    console.log(`🎯 Ranked ${allResults.length} results → ${finalResults.length} after two-phase filtering`);

    return c.json({
      query,
      results: finalResults,
      total: finalResults.length,
      rawTotal: allResults.length,
      providers: Array.from(new Set(finalResults.map((r: any) => r.provider || 'Unknown'))),
    });

  } catch (error: any) {
    console.error('Unified search error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default router;
