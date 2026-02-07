import { Hono } from 'hono';
import { checkNewEpisodes } from '../services/episode-monitor';

const router = new Hono();

/**
 * GET /api/monitor/status
 * Get monitor status
 */
router.get('/status', async (c) => {
  return c.json({
    enabled: true,
    checkInterval: '1 hour',
    lastCheck: null, // TODO: Track last check time
  });
});

/**
 * POST /api/monitor/check
 * Manually trigger episode check
 */
router.post('/check', async (c) => {
  console.log('🔄 Manual episode check triggered');
  
  const newEpisodes = await checkNewEpisodes();
  
  return c.json({
    success: true,
    newEpisodes: newEpisodes.length,
    episodes: newEpisodes,
  });
});

export default router;
