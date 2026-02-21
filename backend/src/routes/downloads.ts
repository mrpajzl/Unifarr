import { Hono } from 'hono';
import { dirname } from 'path';
import { getQBittorrentClient } from '../services/download/qbittorrent-client';
import { getHTTPDownloader } from '../services/download/http-downloader';
import { prisma } from '../db/prisma';
import { getSettings } from './settings';

const router = new Hono();

/**
 * GET /api/downloads
 * List all downloads (both torrent and HTTP).
 */
router.get('/', async (c) => {
  try {
    const client = await getQBittorrentClient();
    const httpDownloader = await getHTTPDownloader();
    
    // Refresh so the caller always gets live data
    await client.refreshTorrents();
    const activeTorrents = client.getTorrents();

    const torrentDownloads = activeTorrents.map(t => ({
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
    }));
    
    // Add HTTP downloads
    const httpDownloads = httpDownloader.getAllDownloads().map(d => ({
      id: d.id,
      type: 'http' as const,
      name: d.filename,
      status: d.status,
      progress: d.progress,
      downloadSpeed: d.speed,
      uploadSpeed: 0,
      size: d.totalBytes,
      peers: 0,
      seeders: 0,
      leechers: 0,
      savePath: d.targetPath || '',
      addedTime: d.startTime,
    }));

    const allDownloads = [...torrentDownloads, ...httpDownloads];

    return c.json({ downloads: allDownloads });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('List downloads error:', error);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/downloads/active
 * List active (downloading / seeding) downloads (both torrent and HTTP)
 */
router.get('/active', async (c) => {
  try {
    const client = await getQBittorrentClient();
    const httpDownloader = await getHTTPDownloader();
    
    await client.refreshTorrents();
    const torrents = client.getTorrents();

    const activeTorrents = torrents
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
    
    // Add HTTP downloads
    const activeHTTP = httpDownloader.getAllDownloads()
      .filter(d => d.status === 'downloading')
      .map(d => ({
        id: d.id,
        name: d.filename,
        status: d.status,
        progress: d.progress,
        downloadSpeed: d.speed,
        uploadSpeed: 0,
        size: d.totalBytes,
        peers: 0,
        seeders: 0,
        leechers: 0,
        savePath: d.targetPath || '',
      }));

    const activeDownloads = [...activeTorrents, ...activeHTTP];

    return c.json({ downloads: activeDownloads });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('List active downloads error:', error);
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/downloads
 * Add a new download (torrent or direct HTTP).
 *
 * Body:
 *   Torrent: { type: 'torrent', magnetUrl: string, savePath?: string, mediaId?: number, category?: 'movies' | 'tvshows' }
 *   HTTP:    { type: 'http', url: string, savePath?: string, mediaId?: number, filename?: string }
 *
 *   savePath is optional when mediaId is provided — the backend resolves it from
 *   existing library files (or falls back to the configured movies/tv root).
 */
router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { type, magnetUrl, url, category, filename } = body;
    let { savePath, mediaId } = body as { savePath?: string; mediaId?: number };

    // ── Resolve save path server-side if not provided ──────────────────────
    if (!savePath) {
      if (mediaId) {
        // Look up existing library path from the media item's files
        const media = await prisma.media.findUnique({
          where: { id: Number(mediaId) },
          include: { files: { take: 1, orderBy: { id: 'asc' } } },
        });

        if (media) {
          // Prefer explicitly stored path, then derive from first file
          savePath = media.libraryPath ?? undefined;
          if (!savePath && media.files.length > 0) {
            savePath = dirname(media.files[0].path);
          }
          // Last resort: use the category root from settings
          if (!savePath) {
            const settings = await getSettings() as Record<string, unknown>;
            if (media.type === 'movie') {
              savePath = (settings.moviesPath as string) ?? process.env.MOVIES_PATH ?? '/data/movies';
            } else {
              savePath = (settings.tvPath as string) ?? process.env.TV_PATH ?? '/data/tvshows';
            }
          }
        }
      }

      // If still no path, use category-based root from settings
      if (!savePath) {
        const settings = await getSettings() as Record<string, unknown>;
        if (category === 'movies') {
          savePath = (settings.moviesPath as string) ?? process.env.MOVIES_PATH ?? '/data/movies';
        } else if (category === 'tvshows') {
          savePath = (settings.tvPath as string) ?? process.env.TV_PATH ?? '/data/tvshows';
        } else {
          return c.json({ error: 'savePath is required when mediaId and category are not provided' }, 400);
        }
      }
    }

    // ── Torrent download ───────────────────────────────────────────────────
    if (type === 'torrent' || magnetUrl) {
      if (!magnetUrl) {
        return c.json({ error: 'Magnet URL or torrent URL is required' }, 400);
      }

      const client = await getQBittorrentClient();
      let torrentInput: string | Buffer = magnetUrl;

      // Check if it's a SKTorrent download URL (requires proxy)
      if (magnetUrl.startsWith('sktorrent:')) {
        const downloadUrl = magnetUrl.replace('sktorrent:', '');

        const { getTrackerManager } = await import('../services/trackers/tracker-manager');
        const manager = await getTrackerManager();
        const tracker = manager.getTracker('sktorrent');

        if (!tracker) {
          return c.json({ error: 'SKTorrent tracker not configured' }, 400);
        }

        const SKTorrentTracker = await import('../services/trackers/sktorrent');
        const sktorrent = tracker as InstanceType<typeof SKTorrentTracker.SKTorrentTracker>;

        try {
          const torrentBuffer = await (sktorrent as { downloadTorrentFile(url: string): Promise<Buffer> }).downloadTorrentFile(downloadUrl);
          torrentInput = torrentBuffer;
          console.log(`✅ Downloaded .torrent file from SKTorrent (${torrentBuffer.length} bytes)`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Failed to download .torrent file from SKTorrent:', error);
          return c.json({ error: `Failed to download from SKTorrent: ${message}` }, 500);
        }
      } else if (!magnetUrl.startsWith('magnet:') && !magnetUrl.startsWith('http')) {
        return c.json({ error: 'Invalid torrent URL (must be magnet:, http://, or sktorrent:)' }, 400);
      }

      const infoHash = await client.addTorrent(torrentInput, savePath, category);

      // Refresh and fetch the just-added torrent
      await client.refreshTorrents();
      const torrentInfo = await client.fetchTorrent(infoHash);

      if (!torrentInfo) {
        return c.json({ error: 'Torrent added but info not yet available' }, 500);
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

    // ── HTTP download ──────────────────────────────────────────────────────
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

    return c.json(
      { error: 'Invalid download type. Specify "type" as "torrent" or "http", or provide magnetUrl/url' },
      400
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Add download error:', error);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/downloads/:hash
 * Get specific torrent info (always live from qBittorrent)
 */
router.get('/:hash', async (c) => {
  try {
    const hash = c.req.param('hash');

    const client = await getQBittorrentClient();
    const torrentInfo = await client.fetchTorrent(hash);

    if (!torrentInfo) {
      return c.json({ error: 'Torrent not found' }, 404);
    }

    return c.json({ torrent: torrentInfo });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Get download error:', error);
    return c.json({ error: message }, 500);
  }
});

/**
 * PATCH /api/downloads/:hash
 * Pause or resume a torrent.
 * Body: { action: 'pause' | 'resume' }
 */
router.patch('/:hash', async (c) => {
  try {
    const hash = c.req.param('hash');
    const body = await c.req.json();
    const { action } = body;

    if (!action || !['pause', 'resume'].includes(action)) {
      return c.json({ error: 'Invalid action. Must be "pause" or "resume"' }, 400);
    }

    const client = await getQBittorrentClient();

    // Check if it's a known torrent (live lookup)
    const torrentInfo = await client.fetchTorrent(hash);

    if (torrentInfo) {
      if (action === 'pause') {
        await client.pauseTorrent(hash);
      } else {
        await client.resumeTorrent(hash);
      }

      // Return fresh info
      const updatedInfo = await client.fetchTorrent(hash);
      return c.json({ success: true, torrent: updatedInfo });
    }

    // Check HTTP downloader
    const httpDownloader = await getHTTPDownloader();
    const httpDownload = httpDownloader.getDownload(hash);

    if (httpDownload) {
      return c.json(
        { error: 'Pause/resume not supported for HTTP downloads. Use cancel instead.' },
        400
      );
    }

    return c.json({ error: 'Download not found' }, 404);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Update download error:', error);
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /api/downloads/:hash
 * Remove a download (torrent or HTTP).
 * Query params: deleteFiles=true/false (default: false)
 */
router.delete('/:hash', async (c) => {
  try {
    const hash = c.req.param('hash');
    const deleteFiles = c.req.query('deleteFiles') === 'true';

    const client = await getQBittorrentClient();
    const torrentInfo = await client.fetchTorrent(hash);

    if (torrentInfo) {
      await client.removeTorrent(hash, deleteFiles);
      return c.json({ success: true, message: 'Torrent removed' });
    }

    // Try HTTP downloader
    const httpDownloader = await getHTTPDownloader();
    const httpDownload = httpDownloader.getDownload(hash);

    if (httpDownload) {
      await httpDownloader.cancelDownload(hash);
      return c.json({ success: true, message: 'HTTP download cancelled' });
    }

    return c.json({ error: 'Download not found' }, 404);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Delete download error:', error);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/downloads/stats
 * Download statistics (torrent + HTTP)
 */
router.get('/stats', async (c) => {
  try {
    const client = await getQBittorrentClient();
    await client.refreshTorrents();
    const stats = client.getStats();

    const httpDownloader = await getHTTPDownloader();
    const httpDownloads = httpDownloader.getAllDownloads();
    const httpActive = (httpDownloads as Array<{ status: string }>).filter(
      d => d.status === 'downloading'
    ).length;

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Get stats error:', error);
    return c.json({ error: message }, 500);
  }
});

export default router;
