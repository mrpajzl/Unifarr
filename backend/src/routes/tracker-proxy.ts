import { Hono } from 'hono';
import { getTrackerManager } from '../services/trackers/tracker-manager';

const router = new Hono();

/**
 * POST /api/tracker-proxy/download
 * Proxy download for .torrent files that require authentication
 * Body: { trackerId: string, downloadUrl: string }
 */
router.post('/download', async (c) => {
  try {
    const body = await c.req.json();
    const { trackerId, downloadUrl } = body;

    if (!trackerId || !downloadUrl) {
      return c.json({ error: 'trackerId and downloadUrl are required' }, 400);
    }

    const manager = await getTrackerManager();
    const tracker = manager.getTracker(trackerId);

    if (!tracker) {
      return c.json({ error: `Tracker not found: ${trackerId}` }, 404);
    }

    // For SKTorrent, we need to download the .torrent file with cookies
    if (trackerId === 'sktorrent') {
      const SKTorrentTracker = await import('../services/trackers/sktorrent');
      const sktorrent = tracker as InstanceType<typeof SKTorrentTracker.SKTorrentTracker>;
      
      // Download .torrent file with authentication
      const torrentBuffer = await (sktorrent as any).downloadTorrentFile(downloadUrl);
      
      // Return as base64 for easy transfer
      return c.json({
        success: true,
        torrentData: torrentBuffer.toString('base64'),
        contentType: 'application/x-bittorrent',
      });
    }

    return c.json({ error: 'Tracker proxy not implemented for this tracker' }, 501);

  } catch (error: any) {
    console.error('Tracker proxy download error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default router;
