import { Hono } from 'hono';
import { getWebTorrentClient } from '../services/download/webtorrent-client';
import { getHTTPDownloader } from '../services/download/http-downloader';
import { db } from '../db';
import { downloads } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

const router = new Hono();

/**
 * GET /api/downloads
 * List all downloads (torrents and HTTP)
 */
router.get('/', async (c) => {
  try {
    const client = getWebTorrentClient();
    const activeTorrents = client.getTorrents();
    
    // Also get active HTTP downloads
    const httpDownloader = await getHTTPDownloader();
    const httpDownloads = httpDownloader.getAllDownloads();
    
    // Combine torrent and HTTP downloads
    const allDownloads = [
      ...activeTorrents.map(t => ({
        id: t.infoHash,
        type: 'torrent' as const,
        name: t.name,
        status: t.state,
        progress: t.progress,
        downloadSpeed: t.downloadSpeed,
        uploadSpeed: t.uploadSpeed,
        size: t.size,
        peers: t.peers,
        seeders: t.seeders,
        leechers: t.leechers,
        savePath: t.savePath,
        addedTime: t.addedTime,
      })),
      ...httpDownloads.map(h => ({
        id: h.id,
        type: 'http' as const,
        name: h.filename,
        status: h.status,
        progress: h.progress,
        downloadSpeed: h.speed,
        uploadSpeed: 0,
        size: h.totalBytes,
        peers: 0,
        savePath: h.targetPath || '',
        addedTime: h.startTime,
      })),
    ];
    
    return c.json({ downloads: allDownloads });
  } catch (error: any) {
    console.error('List downloads error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/downloads/active
 * List active (downloading) torrents
 */
router.get('/active', async (c) => {
  try {
    const client = getWebTorrentClient();
    const torrents = client.getTorrents();
    
    const activeDownloads = torrents
      .filter(t => t.state === 'downloading' || t.state === 'seeding')
      .map(t => ({
        id: t.infoHash,
        name: t.name,
        status: t.state,
        progress: t.progress,
        downloadSpeed: t.downloadSpeed,
        uploadSpeed: t.uploadSpeed,
        size: t.size,
        peers: t.peers,
        seeders: t.seeders,
        leechers: t.leechers,
        savePath: t.savePath,
      }));
    
    return c.json({ downloads: activeDownloads });
  } catch (error: any) {
    console.error('List active downloads error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/downloads
 * Add a new download (torrent or direct HTTP)
 * Body: 
 *   - For torrent: { type: 'torrent', magnetUrl: string, savePath: string, category?: 'movies' | 'tvshows' }
 *   - For HTTP: { type: 'http', url: string, savePath: string, filename?: string }
 */
router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { type, magnetUrl, url, savePath, category, filename } = body;

    if (!savePath) {
      return c.json({ error: 'Save path is required' }, 400);
    }

    // Handle torrent download
    if (type === 'torrent' || magnetUrl) {
      if (!magnetUrl) {
        return c.json({ error: 'Magnet URL or torrent URL is required' }, 400);
      }

      const client = getWebTorrentClient();
      let torrentInput: string | Buffer = magnetUrl;

      // Check if it's a SKTorrent download URL (requires proxy)
      if (magnetUrl.startsWith('sktorrent:')) {
        const downloadUrl = magnetUrl.replace('sktorrent:', '');
        
        // Use tracker proxy to download .torrent file with authentication
        const { getTrackerManager } = await import('../services/trackers/tracker-manager');
        const manager = await getTrackerManager();
        const tracker = manager.getTracker('sktorrent');
        
        if (!tracker) {
          return c.json({ error: 'SKTorrent tracker not configured' }, 400);
        }
        
        // Download .torrent file via tracker
        const SKTorrentTracker = await import('../services/trackers/sktorrent');
        const sktorrent = tracker as InstanceType<typeof SKTorrentTracker.SKTorrentTracker>;
        
        try {
          const torrentBuffer = await (sktorrent as any).downloadTorrentFile(downloadUrl);
          torrentInput = torrentBuffer;
          console.log(`✅ Downloaded .torrent file from SKTorrent (${torrentBuffer.length} bytes)`);
        } catch (error: any) {
          console.error('Failed to download .torrent file from SKTorrent:', error);
          return c.json({ error: `Failed to download from SKTorrent: ${error.message}` }, 500);
        }
      } else if (!magnetUrl.startsWith('magnet:') && !magnetUrl.startsWith('http')) {
        return c.json({ error: 'Invalid torrent URL (must be magnet:, http://, or sktorrent:)' }, 400);
      }
      
      // Add torrent (WebTorrent supports magnet links, .torrent URLs, and Buffers)
      const infoHash = await client.addTorrent(torrentInput, savePath, category);
      
      // Get torrent info
      const torrentInfo = client.getTorrent(infoHash);
      
      if (!torrentInfo) {
        return c.json({ error: 'Torrent added but info not available' }, 500);
      }

      return c.json({
        success: true,
        type: 'torrent',
        download: {
          id: infoHash,
          hash: infoHash,
          name: torrentInfo.name,
          status: torrentInfo.state,
          progress: torrentInfo.progress,
          downloadSpeed: torrentInfo.downloadSpeed,
          size: torrentInfo.size,
        },
      });
    }

    // Handle HTTP download
    if (type === 'http' || url) {
      if (!url || !url.startsWith('http')) {
        return c.json({ error: 'Invalid HTTP URL' }, 400);
      }

      if (!filename) {
        return c.json({ error: 'Filename is required for HTTP downloads' }, 400);
      }

      const httpDownloader = await getHTTPDownloader();
      const downloadId = await httpDownloader.downloadFile(url, filename, undefined, savePath);

      return c.json({
        success: true,
        type: 'http',
        download: {
          id: downloadId,
          url,
          filename,
          savePath,
          status: 'downloading',
          progress: 0,
        },
      });
    }

    return c.json({ error: 'Invalid download type. Specify "type" as "torrent" or "http", or provide magnetUrl/url' }, 400);
  } catch (error: any) {
    console.error('Add download error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/downloads/:hash
 * Get specific download info
 */
router.get('/:hash', async (c) => {
  try {
    const hash = c.req.param('hash');
    
    const client = getWebTorrentClient();
    const torrentInfo = client.getTorrent(hash);
    
    if (!torrentInfo) {
      return c.json({ error: 'Torrent not found' }, 404);
    }

    return c.json({ torrent: torrentInfo });
  } catch (error: any) {
    console.error('Get download error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PATCH /api/downloads/:hash
 * Update download status (pause/resume)
 * Body: { action: 'pause' | 'resume' }
 * Note: Pause/resume only works for torrents, not HTTP downloads
 */
router.patch('/:hash', async (c) => {
  try {
    const hash = c.req.param('hash');
    const body = await c.req.json();
    const { action } = body;

    if (!action || !['pause', 'resume'].includes(action)) {
      return c.json({ error: 'Invalid action. Must be "pause" or "resume"' }, 400);
    }

    const client = getWebTorrentClient();
    const torrentInfo = client.getTorrent(hash);
    
    if (torrentInfo) {
      // It's a torrent
      if (action === 'pause') {
        client.pauseTorrent(hash);
      } else if (action === 'resume') {
        client.resumeTorrent(hash);
      }

      // Get updated info
      const updatedInfo = client.getTorrent(hash);

      return c.json({
        success: true,
        torrent: updatedInfo,
      });
    } else {
      // Check if it's an HTTP download
      const httpDownloader = await getHTTPDownloader();
      const httpDownload = httpDownloader.getDownload(hash);
      
      if (httpDownload) {
        return c.json({ 
          error: 'Pause/resume not supported for HTTP downloads. Use cancel instead.' 
        }, 400);
      }
      
      return c.json({ error: 'Download not found' }, 404);
    }
  } catch (error: any) {
    console.error('Update download error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/downloads/:hash
 * Remove download (torrent or HTTP)
 * Query params: deleteFiles=true/false (default: false)
 */
router.delete('/:hash', async (c) => {
  try {
    const hash = c.req.param('hash');
    const deleteFiles = c.req.query('deleteFiles') === 'true';

    // Check if it's a torrent or HTTP download
    const client = getWebTorrentClient();
    const torrentInfo = client.getTorrent(hash);
    
    if (torrentInfo) {
      // It's a torrent
      await client.removeTorrent(hash, deleteFiles);
      return c.json({
        success: true,
        message: 'Torrent removed',
      });
    } else {
      // Try HTTP downloader
      const httpDownloader = await getHTTPDownloader();
      const httpDownload = httpDownloader.getDownload(hash);
      
      if (httpDownload) {
        await httpDownloader.cancelDownload(hash);
        return c.json({
          success: true,
          message: 'HTTP download cancelled',
        });
      }
      
      return c.json({ error: 'Download not found' }, 404);
    }
  } catch (error: any) {
    console.error('Delete download error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/downloads/stats
 * Get download statistics
 */
router.get('/stats', async (c) => {
  try {
    const client = getWebTorrentClient();
    const stats = client.getStats();
    
    const httpDownloader = await getHTTPDownloader();
    const httpDownloads = httpDownloader.getAllDownloads();
    const httpActive = httpDownloads.filter(d => d.status === 'downloading').length;
    
    return c.json({
      torrent: {
        active: stats.activeTorrents,
        total: stats.totalTorrents,
        downloadSpeed: stats.totalDownloadSpeed,
        uploadSpeed: stats.totalUploadSpeed,
      },
      http: {
        active: httpActive,
        total: httpDownloads.length,
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default router;
