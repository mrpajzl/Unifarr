export interface TorrentResult {
  title: string;
  size: number; // bytes
  seeders: number;
  leechers: number;
  magnetUrl: string;
  infoHash?: string;
  quality?: string;
  category?: string;
  uploadDate?: Date;
  provider: string;
}

export interface SearchQuery {
  query: string;
  category?: 'movie' | 'tv' | 'all';
  minSeeders?: number;
  maxSize?: number; // bytes
}

/**
 * Base class for torrent providers
 */
export abstract class TorrentProvider {
  abstract name: string;
  abstract baseUrl: string;
  abstract enabled: boolean;

  /**
   * Search for torrents
   */
  abstract search(query: SearchQuery): Promise<TorrentResult[]>;

  /**
   * Test if provider is accessible
   */
  async test(): Promise<boolean> {
    try {
      const results = await this.search({ query: 'test', category: 'movie' });
      return results !== null;
    } catch {
      return false;
    }
  }

  /**
   * Parse size string to bytes (e.g., "1.5 GB" -> bytes)
   */
  protected parseSizeToBytes(sizeStr: string): number {
    const match = sizeStr.match(/(\d+\.?\d*)\s*(GB|MB|KB|TB)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers: Record<string, number> = {
      TB: 1024 * 1024 * 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      MB: 1024 * 1024,
      KB: 1024,
    };

    return Math.round(value * (multipliers[unit] || 1));
  }

  /**
   * Format bytes to human-readable size
   */
  protected formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Extract info hash from magnet URL
   */
  protected extractInfoHash(magnetUrl: string): string | undefined {
    const match = magnetUrl.match(/btih:([a-f0-9]{40})/i);
    return match ? match[1].toLowerCase() : undefined;
  }
}
