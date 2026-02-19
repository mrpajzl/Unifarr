/**
 * qBittorrent Auto-Setup Service
 *
 * Called once on backend startup. Waits for qBittorrent to be ready, then
 * applies preferences from the database (download path, seed ratio/time).
 * Failures are non-fatal — the backend keeps running; downloads may just use
 * qBittorrent's built-in defaults until the next restart.
 */

import { getQBittorrentClient } from './qbittorrent-client';
import { getSettings } from '../../routes/settings';

export async function setupQBittorrent(): Promise<void> {
  try {
    console.log('🔧 Setting up qBittorrent sidecar…');

    const client = await getQBittorrentClient();

    // Wait up to 60 s for qBittorrent container to be ready
    await client.waitUntilReady(60_000);

    // Load paths / seed policy from database (falls back to env defaults)
    const settings = await getSettings();

    const downloadPath: string = (settings as Record<string, unknown>).downloadsPath as string
      ?? process.env.DOWNLOADS_PATH
      ?? '/data/downloads';

    const torrents = (settings as Record<string, unknown>).torrents as
      | { seedRatio?: number; seedTimeHours?: number }
      | undefined;

    const seedRatio: number | undefined = torrents?.seedRatio;
    const seedTimeMinutes: number | undefined =
      torrents?.seedTimeHours !== undefined
        ? Math.round(torrents.seedTimeHours * 60)
        : undefined;

    await client.configure({ downloadPath, seedRatio, seedTimeMinutes });

    // Refresh cache after configuration
    await client.refreshTorrents();

    console.log('✅ qBittorrent sidecar configured successfully');
  } catch (err) {
    // Non-fatal — log and move on
    console.error('⚠️  qBittorrent setup failed (non-fatal):', err);
  }
}
