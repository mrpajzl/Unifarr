/**
 * qBittorrent REST API v2 Client
 *
 * Replaces WebTorrent with a proper download client running as a sidecar container.
 * The backend auto-configures qBittorrent on startup; users never touch it manually.
 */

export interface TorrentInfo {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  downloaded: number;
  uploaded: number;
  size: number;
  peers: number;
  seeders: number;
  leechers: number;
  state: 'downloading' | 'seeding' | 'paused' | 'error';
  savePath: string;
  addedTime: number;
}

interface QBTorrent {
  hash: string;
  name: string;
  progress: number;
  dlspeed: number;
  upspeed: number;
  downloaded: number;
  uploaded: number;
  size: number;
  num_seeds: number;
  num_leechs: number;
  num_complete: number;
  num_incomplete: number;
  state: string;
  save_path: string;
  added_on: number;
}

function mapState(qbtState: string): TorrentInfo['state'] {
  switch (qbtState) {
    case 'downloading':
    case 'stalledDL':
    case 'checkingDL':
    case 'queuedDL':
    case 'allocating':
    case 'metaDL':
    case 'forcedDL':
      return 'downloading';
    case 'uploading':
    case 'stalledUP':
    case 'seeding':
    case 'queuedUP':
    case 'checkingUP':
    case 'forcedUP':
      return 'seeding';
    case 'pausedDL':
    case 'pausedUP':
      return 'paused';
    default:
      return 'error';
  }
}

function mapTorrent(t: QBTorrent): TorrentInfo {
  return {
    infoHash: t.hash,
    name: t.name,
    progress: t.progress,
    downloadSpeed: t.dlspeed,
    uploadSpeed: t.upspeed,
    downloaded: t.downloaded,
    uploaded: t.uploaded,
    size: t.size,
    seeders: t.num_seeds,
    leechers: t.num_leechs,
    peers: t.num_complete + t.num_incomplete,
    state: mapState(t.state),
    savePath: t.save_path,
    addedTime: t.added_on * 1000, // unix seconds → ms
  };
}

export class QBittorrentClient {
  private host: string;
  private port: number;
  private username: string;
  private password: string;
  private sid: string | null = null;
  private baseUrl: string;

  constructor(host: string, port: number, username: string, password: string) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.baseUrl = `http://${host}:${port}/api/v2`;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  private async login(): Promise<void> {
    const body = new URLSearchParams({
      username: this.username,
      password: this.password,
    });

    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`qBittorrent login HTTP error: ${res.status}`);
    }

    const text = await res.text();
    if (text.trim() !== 'Ok.') {
      throw new Error(`qBittorrent login failed: ${text}`);
    }

    // Extract SID cookie
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) {
      throw new Error('qBittorrent login: no Set-Cookie header returned');
    }

    const match = setCookie.match(/SID=([^;]+)/);
    if (!match) {
      throw new Error('qBittorrent login: SID not found in Set-Cookie');
    }

    this.sid = match[1];
    console.log('✅ qBittorrent authenticated');
  }

  private cookieHeader(): Record<string, string> {
    if (!this.sid) return {};
    return { Cookie: `SID=${this.sid}` };
  }

  /**
   * Perform an authenticated fetch. Re-login once on 403 or "Fails." response.
   */
  private async authFetch(
    url: string,
    options: RequestInit = {},
    retried = false
  ): Promise<Response> {
    if (!this.sid) {
      await this.login();
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.cookieHeader(),
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    if (res.status === 403 && !retried) {
      console.warn('qBittorrent session expired — re-logging in');
      this.sid = null;
      await this.login();
      return this.authFetch(url, options, true);
    }

    return res;
  }

  // ── Torrent queries ───────────────────────────────────────────────────────

  /**
   * Get all torrents (cached from last API call — call refreshTorrents() for live data).
   * NOTE: This is synchronous as required by the interface. Internally we rely on
   * a cached snapshot; callers that need up-to-date data should use refreshTorrents().
   */
  private cachedTorrents: TorrentInfo[] = [];

  async refreshTorrents(): Promise<TorrentInfo[]> {
    const res = await this.authFetch(`${this.baseUrl}/torrents/info`);
    if (!res.ok) throw new Error(`torrents/info failed: ${res.status}`);
    const list = (await res.json()) as QBTorrent[];
    this.cachedTorrents = list.map(mapTorrent);
    return this.cachedTorrents;
  }

  getTorrents(): TorrentInfo[] {
    // Return the last refreshed snapshot synchronously.
    // The routes already do await getQBittorrentClient() which triggers an initial
    // refresh; subsequent calls use the cache. For live data, call refreshTorrents().
    return this.cachedTorrents;
  }

  getTorrent(hash: string): TorrentInfo | null {
    return this.cachedTorrents.find(t => t.infoHash === hash) ?? null;
  }

  /**
   * Fetch a single torrent from the API (always live).
   */
  async fetchTorrent(hash: string): Promise<TorrentInfo | null> {
    const res = await this.authFetch(
      `${this.baseUrl}/torrents/info?hashes=${encodeURIComponent(hash)}`
    );
    if (!res.ok) throw new Error(`torrents/info?hashes failed: ${res.status}`);
    const list = (await res.json()) as QBTorrent[];
    if (list.length === 0) return null;
    const info = mapTorrent(list[0]);
    // Update cache entry
    const idx = this.cachedTorrents.findIndex(t => t.infoHash === hash);
    if (idx >= 0) {
      this.cachedTorrents[idx] = info;
    } else {
      this.cachedTorrents.push(info);
    }
    return info;
  }

  // ── Torrent management ────────────────────────────────────────────────────

  async addTorrent(
    magnetOrBuffer: string | Buffer,
    savePath: string,
    category?: 'movies' | 'tvshows'
  ): Promise<string> {
    const form = new FormData();
    form.append('savepath', savePath);
    if (category) form.append('category', category);

    if (typeof magnetOrBuffer === 'string') {
      // Magnet link (or http .torrent URL)
      form.append('urls', magnetOrBuffer);
    } else {
      // .torrent file as Buffer — copy into a typed array so TypeScript is happy
      // with Blob's BlobPart constraint (Buffer.buffer may be SharedArrayBuffer).
      const blob = new Blob([new Uint8Array(magnetOrBuffer)], { type: 'application/x-bittorrent' });
      form.append('torrents', blob, 'upload.torrent');
    }

    const res = await this.authFetch(`${this.baseUrl}/torrents/add`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) throw new Error(`torrents/add failed: ${res.status}`);
    const text = await res.text();
    if (text.trim() !== 'Ok.') throw new Error(`torrents/add returned: ${text}`);

    // qBittorrent doesn't return the hash directly — we need to poll for the
    // newly added torrent. For magnet links we can extract the hash from the URI.
    if (typeof magnetOrBuffer === 'string' && magnetOrBuffer.startsWith('magnet:')) {
      const match = magnetOrBuffer.match(/xt=urn:btih:([0-9a-fA-F]{40}|[2-7A-Z]{32})/i);
      if (match) {
        const hash = match[1].toLowerCase();
        // Wait briefly and refresh cache
        await this.waitForTorrent(hash, 10_000);
        return hash;
      }
    }

    // For .torrent buffers (or magnet without legible hash), poll the list for
    // a newly appeared torrent (compare before/after).
    const before = new Set(this.cachedTorrents.map(t => t.infoHash));
    await new Promise(r => setTimeout(r, 1500));
    const after = await this.refreshTorrents();
    const newOne = after.find(t => !before.has(t.infoHash));
    if (!newOne) throw new Error('Torrent added but could not determine infoHash');
    return newOne.infoHash;
  }

  private async waitForTorrent(hash: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await this.refreshTorrents();
      if (this.cachedTorrents.some(t => t.infoHash === hash)) return;
      await new Promise(r => setTimeout(r, 500));
    }
    // Not found — not fatal, just log
    console.warn(`waitForTorrent: ${hash} not found after ${timeoutMs}ms`);
  }

  async removeTorrent(hash: string, deleteFiles = false): Promise<void> {
    const body = new URLSearchParams({
      hashes: hash,
      deleteFiles: deleteFiles ? 'true' : 'false',
    });

    const res = await this.authFetch(`${this.baseUrl}/torrents/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) throw new Error(`torrents/delete failed: ${res.status}`);

    // Remove from cache
    this.cachedTorrents = this.cachedTorrents.filter(t => t.infoHash !== hash);
    console.log(`🗑️ Torrent removed: ${hash}`);
  }

  async pauseTorrent(hash: string): Promise<void> {
    const body = new URLSearchParams({ hashes: hash });
    const res = await this.authFetch(`${this.baseUrl}/torrents/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`torrents/pause failed: ${res.status}`);
    console.log(`⏸️ Torrent paused: ${hash}`);
  }

  async resumeTorrent(hash: string): Promise<void> {
    const body = new URLSearchParams({ hashes: hash });
    const res = await this.authFetch(`${this.baseUrl}/torrents/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`torrents/resume failed: ${res.status}`);
    console.log(`▶️ Torrent resumed: ${hash}`);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  getStats(): {
    totalDownloadSpeed: number;
    totalUploadSpeed: number;
    activeTorrents: number;
    totalTorrents: number;
  } {
    const torrents = this.cachedTorrents;
    const active = torrents.filter(
      t => t.state === 'downloading' || t.state === 'seeding'
    );
    return {
      totalDownloadSpeed: torrents.reduce((s, t) => s + t.downloadSpeed, 0),
      totalUploadSpeed: torrents.reduce((s, t) => s + t.uploadSpeed, 0),
      activeTorrents: active.length,
      totalTorrents: torrents.length,
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Poll qBittorrent's /api/v2/app/version until it responds (or timeout).
   */
  async waitUntilReady(timeoutMs = 60_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;

    while (Date.now() < deadline) {
      attempt++;
      try {
        const res = await fetch(`${this.baseUrl}/app/version`, {
          signal: AbortSignal.timeout(3_000),
        });
        if (res.ok) {
          const version = await res.text();
          console.log(`✅ qBittorrent ready (version ${version.trim()}) after ${attempt} attempts`);
          return;
        }
      } catch {
        // Connection refused, timeout, etc. — keep polling
      }

      const delay = Math.min(2_000 * attempt, 10_000);
      console.log(`⏳ Waiting for qBittorrent (attempt ${attempt})…`);
      await new Promise(r => setTimeout(r, delay));
    }

    throw new Error(`qBittorrent did not become ready within ${timeoutMs}ms`);
  }

  /**
   * Apply global preferences via /app/setPreferences.
   */
  async configure(options: {
    downloadPath: string;
    seedRatio?: number;
    seedTimeMinutes?: number;
  }): Promise<void> {
    const prefs: Record<string, unknown> = {
      save_path: options.downloadPath,
      // Disable the internal auto-management so we control paths
      use_subcategories: false,
    };

    if (options.seedRatio !== undefined) {
      prefs.max_ratio_enabled = true;
      prefs.max_ratio = options.seedRatio;
      prefs.max_ratio_act = 1; // 1 = remove torrent when ratio reached
    }

    if (options.seedTimeMinutes !== undefined) {
      prefs.max_seeding_time_enabled = true;
      prefs.max_seeding_time = options.seedTimeMinutes;
    }

    const body = new URLSearchParams({ json: JSON.stringify(prefs) });

    const res = await this.authFetch(`${this.baseUrl}/app/setPreferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) throw new Error(`app/setPreferences failed: ${res.status}`);
    console.log('⚙️  qBittorrent preferences applied');
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let instance: QBittorrentClient | null = null;

export async function getQBittorrentClient(): Promise<QBittorrentClient> {
  if (!instance) {
    const host = process.env.QBITTORRENT_HOST ?? 'qbittorrent';
    const port = parseInt(process.env.QBITTORRENT_PORT ?? '8080', 10);
    const username = process.env.QBITTORRENT_USERNAME ?? 'admin';
    const password = process.env.QBITTORRENT_PASSWORD ?? 'unifarr_qbt_2024';

    instance = new QBittorrentClient(host, port, username, password);

    // Eagerly refresh cache so getTorrents() returns live data after first await
    try {
      await instance.refreshTorrents();
    } catch {
      // qBittorrent may not be ready yet; setup will call waitUntilReady later
    }
  }
  return instance;
}
