import { BaseTracker, TrackerConfig, TrackerSearchParams, TrackerSearchResult } from './base-tracker';
import { SKTorrentTracker } from './sktorrent';
import { getSettings } from '../../routes/settings';

/**
 * Tracker Manager
 * Manages all configured trackers
 */
export class TrackerManager {
  private trackers: Map<string, BaseTracker> = new Map();

  /**
   * Initialize trackers from settings
   */
  async initialize() {
    const settings = await getSettings();
    
    // Initialize SKTorrent if configured
    if (settings.trackers?.sktorrent?.enabled) {
      const config: TrackerConfig = {
        id: 'sktorrent',
        name: 'Sk-CzTorrent',
        enabled: settings.trackers.sktorrent.enabled,
        credentials: {
          username: settings.trackers.sktorrent.username,
          password: settings.trackers.sktorrent.password,
        },
      };

      const tracker = new SKTorrentTracker(config);
      this.trackers.set('sktorrent', tracker);
    }

    console.log(`✅ Tracker Manager: Initialized ${this.trackers.size} trackers`);
  }

  /**
   * Get all available tracker definitions (for catalog)
   */
  getAvailableTrackers() {
    return [
      {
        id: 'sktorrent',
        name: 'Sk-CzTorrent',
        description: 'CZECH/SLOVAK Semi-Private Torrent Tracker for MOVIES / TV / GENERAL',
        language: 'cs-CZ',
        type: 'semi-private',
        url: 'https://sktorrent.eu/',
        requiresAuth: true,
        capabilities: {
          search: true,
          movieSearch: true,
          tvSearch: true,
          musicSearch: true,
        },
        categories: [
          'Movies', 'TV Shows', 'Music', 'Books', 'Games', 'Software',
        ],
      },
      // Add more trackers here in the future
    ];
  }

  /**
   * Get configured tracker instance
   */
  getTracker(trackerId: string): BaseTracker | undefined {
    return this.trackers.get(trackerId);
  }

  /**
   * Get all enabled trackers
   */
  getEnabledTrackers(): BaseTracker[] {
    return Array.from(this.trackers.values()).filter(t => t.isEnabled());
  }

  /**
   * Test tracker connection
   */
  async testTracker(trackerId: string, config?: TrackerConfig): Promise<boolean> {
    let tracker = this.trackers.get(trackerId);
    
    // If tracker not in memory, create temporary instance for testing
    if (!tracker) {
      if (!config) {
        // Try to get config from settings
        const settings = await getSettings();
        if (settings.trackers?.[trackerId]) {
          config = {
            id: trackerId,
            name: trackerId,
            enabled: settings.trackers[trackerId].enabled,
            credentials: settings.trackers[trackerId],
          };
        }
      }
      
      if (!config) {
        throw new Error(`Tracker not found and no config provided: ${trackerId}`);
      }
      
      // Create temporary tracker instance
      if (trackerId === 'sktorrent') {
        tracker = new SKTorrentTracker(config);
      } else {
        throw new Error(`Unknown tracker: ${trackerId}`);
      }
    }

    return await tracker.test();
  }

  /**
   * Search all enabled trackers
   */
  async searchAll(params: TrackerSearchParams): Promise<TrackerSearchResult[]> {
    const enabledTrackers = this.getEnabledTrackers();
    
    if (enabledTrackers.length === 0) {
      console.warn('No enabled trackers available');
      return [];
    }

    // Search all trackers in parallel
    const searchPromises = enabledTrackers.map(async (tracker) => {
      try {
        console.log(`🔍 Searching ${tracker.getName()} for: ${params.query}`);
        return await tracker.search(params);
      } catch (error) {
        console.error(`Error searching ${tracker.getName()}:`, error);
        return [];
      }
    });

    const allResults = await Promise.all(searchPromises);
    
    // Flatten and sort by seeders
    const results = allResults
      .flat()
      .sort((a, b) => b.seeders - a.seeders);

    console.log(`✅ Found ${results.length} total results from ${enabledTrackers.length} trackers`);
    
    // Apply limit if specified
    if (params.limit && params.limit > 0) {
      return results.slice(0, params.limit);
    }

    return results;
  }

  /**
   * Search specific tracker
   */
  async searchTracker(trackerId: string, params: TrackerSearchParams): Promise<TrackerSearchResult[]> {
    const tracker = this.trackers.get(trackerId);
    if (!tracker) {
      throw new Error(`Tracker not found: ${trackerId}`);
    }

    if (!tracker.isEnabled()) {
      throw new Error(`Tracker is not enabled: ${trackerId}`);
    }

    return await tracker.search(params);
  }

  /**
   * Add or update tracker configuration
   */
  async configureTracker(trackerId: string, config: TrackerConfig) {
    // TODO: Save to settings
    // For now, just update in memory
    
    if (trackerId === 'sktorrent') {
      const tracker = new SKTorrentTracker(config);
      this.trackers.set(trackerId, tracker);
    }

    console.log(`✅ Tracker configured: ${trackerId}`);
  }

  /**
   * Remove tracker
   */
  removeTracker(trackerId: string) {
    this.trackers.delete(trackerId);
    console.log(`🗑️ Tracker removed: ${trackerId}`);
  }
}

// Global singleton instance
let instance: TrackerManager | null = null;

export async function getTrackerManager(): Promise<TrackerManager> {
  if (!instance) {
    instance = new TrackerManager();
    await instance.initialize();
  }
  return instance;
}
