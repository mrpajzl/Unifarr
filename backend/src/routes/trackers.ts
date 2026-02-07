import { Hono } from 'hono';
import { getTrackerManager } from '../services/trackers/tracker-manager';

const router = new Hono();

/**
 * GET /api/trackers
 * Get all available trackers (catalog)
 */
router.get('/', async (c) => {
  try {
    const manager = await getTrackerManager();
    const trackers = manager.getAvailableTrackers();
    
    return c.json({ trackers });
  } catch (error: any) {
    console.error('Get trackers error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/trackers/configured
 * Get configured (enabled) trackers
 */
router.get('/configured', async (c) => {
  try {
    const manager = await getTrackerManager();
    const trackers = manager.getEnabledTrackers();
    
    return c.json({
      trackers: trackers.map(t => ({
        id: t.getId(),
        name: t.getName(),
        enabled: t.isEnabled(),
        capabilities: t.getCapabilities(),
      })),
    });
  } catch (error: any) {
    console.error('Get configured trackers error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/trackers/:id/test
 * Test tracker connection
 * Body (optional): { credentials: { username, password } }
 */
router.post('/:id/test', async (c) => {
  try {
    const trackerId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    
    const manager = await getTrackerManager();
    
    // Build config from body if provided (for testing before saving)
    let config = undefined;
    if (body.credentials) {
      config = {
        id: trackerId,
        name: trackerId,
        enabled: true,
        credentials: body.credentials,
      };
    }
    
    const success = await manager.testTracker(trackerId, config);
    
    if (success) {
      return c.json({
        success: true,
        message: 'Tracker connection successful',
      });
    } else {
      return c.json({
        success: false,
        message: 'Tracker connection failed',
      }, 400);
    }
  } catch (error: any) {
    console.error('Test tracker error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /api/trackers/reload
 * Reload tracker configuration
 */
router.post('/reload', async (c) => {
  try {
    const { getTrackerManager } = await import('../services/trackers/tracker-manager');
    const manager = await getTrackerManager();
    await manager.initialize();
    
    return c.json({
      success: true,
      message: 'Trackers reloaded',
    });
  } catch (error: any) {
    console.error('Reload trackers error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/trackers/search
 * Search across all enabled trackers with smart ranking
 * Body: { query: string, type?: 'movie' | 'tv' | 'music', limit?: number, year?: number }
 */
router.post('/search', async (c) => {
  try {
    const body = await c.req.json();
    const { query, type, limit, season, episode, year } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const manager = await getTrackerManager();
    const rawResults = await manager.searchAll({
      query,
      type,
      limit: 100, // Get more results before filtering
      season,
      episode,
      year,
    });

    // Get user preferences
    const { getSettings } = await import('./settings');
    const settings = await getSettings();
    const preferredLanguages = settings.preferences?.languages || ['CZ', 'EN'];
    const minTitleScore = settings.preferences?.minTitleScore || 50; // Phase 1 filter

    // Rank and filter results
    const { rankSearchResults } = await import('../lib/match-scorer');
    const rankedResults = rankSearchResults(rawResults, query, {
      expectedYear: year,
      preferredLanguages,
      minTitleScore,
    });

    // Apply limit after ranking
    const finalResults = limit ? rankedResults.slice(0, limit) : rankedResults;

    console.log(`🎯 Ranked ${rawResults.length} results → ${finalResults.length} after filtering (min title score: ${minTitleScore})`);

    return c.json({
      query,
      results: finalResults,
      total: finalResults.length,
      rawTotal: rawResults.length,
    });
  } catch (error: any) {
    console.error('Search trackers error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/trackers/:id/search
 * Search specific tracker
 * Body: { query: string, type?: 'movie' | 'tv' | 'music', limit?: number }
 */
router.post('/:id/search', async (c) => {
  try {
    const trackerId = c.req.param('id');
    const body = await c.req.json();
    const { query, type, limit, season, episode, year } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const manager = await getTrackerManager();
    const results = await manager.searchTracker(trackerId, {
      query,
      type,
      limit: limit || 50,
      season,
      episode,
      year,
    });

    return c.json({
      tracker: trackerId,
      query,
      results,
      total: results.length,
    });
  } catch (error: any) {
    console.error('Search tracker error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default router;
