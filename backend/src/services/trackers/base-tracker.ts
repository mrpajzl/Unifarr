/**
 * Base Tracker Interface
 * All trackers must implement this interface
 */

export interface TrackerConfig {
  id: string;
  name: string;
  enabled: boolean;
  credentials?: {
    username?: string;
    password?: string;
    apiKey?: string;
    [key: string]: any;
  };
}

export interface TrackerSearchResult {
  title: string;
  downloadUrl: string; // Magnet link or .torrent URL
  infoUrl?: string; // Details page URL
  size: number; // Bytes
  seeders: number;
  leechers: number;
  category?: string;
  publishDate?: Date;
  poster?: string;
  description?: string;
}

export interface TrackerSearchParams {
  query: string;
  type?: 'movie' | 'tv' | 'music' | 'all';
  season?: number;
  episode?: number;
  year?: number;
  categories?: string[];
  limit?: number;
}

export interface TrackerCapabilities {
  search: boolean;
  movieSearch: boolean;
  tvSearch: boolean;
  musicSearch: boolean;
  categories: TrackerCategory[];
  requiresAuth: boolean;
}

export interface TrackerCategory {
  id: string | number;
  name: string;
  type: 'movie' | 'tv' | 'music' | 'book' | 'xxx' | 'other';
}

export abstract class BaseTracker {
  protected config: TrackerConfig;

  constructor(config: TrackerConfig) {
    this.config = config;
  }

  /**
   * Get tracker ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get tracker name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Check if tracker is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get tracker capabilities
   */
  abstract getCapabilities(): TrackerCapabilities;

  /**
   * Test tracker connection/authentication
   */
  abstract test(): Promise<boolean>;

  /**
   * Search for torrents
   */
  abstract search(params: TrackerSearchParams): Promise<TrackerSearchResult[]>;

  /**
   * Login/authenticate (if required)
   */
  protected abstract login(): Promise<boolean>;
}
