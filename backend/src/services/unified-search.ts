/**
 * Unified search helper - used by episode monitor and other services
 */

import { getTrackerManager } from './trackers/tracker-manager';
import { rankSearchResults } from '../lib/match-scorer';

export async function performUnifiedSearch(
  query: string,
  type?: 'movie' | 'tv',
  year?: number,
  settings?: any
): Promise<any[]> {
  const results: any[] = [];

  // Search trackers
  try {
    const manager = await getTrackerManager();
    const trackerResults = await manager.searchAll({
      query,
      type,
      year,
      limit: 100,
    });
    results.push(...trackerResults.map((r: any) => ({
      ...r,
      provider: r.provider || 'Tracker',
    })));
  } catch (error) {
    console.error(`Tracker search error for "${query}":`, error);
  }

  // Search Webshare
  try {
    const webshareEnabled = settings?.webshare?.enabled;
    if (webshareEnabled && settings?.webshare?.username && settings?.webshare?.password) {
      const { WebshareService } = await import('./webshare');
      const webshare = new WebshareService({
        username: settings.webshare.username,
        password: settings.webshare.password,
      });
      
      const result = await webshare.search(query, 50);
      
      results.push(...result.files.map((f: any) => ({
        title: f.name,
        downloadUrl: `webshare:${f.ident}`,
        infoUrl: `https://webshare.cz/#/file/${f.ident}/overview`,
        size: f.size,
        seeders: 10000,
        leechers: 0,
        category: '',
        publishDate: undefined,
        poster: undefined,
        description: undefined,
        provider: 'Webshare',
      })));
    }
  } catch (error) {
    console.error(`Webshare search error for "${query}":`, error);
  }

  // Rank results
  const preferredLanguages = settings?.preferences?.languages || ['CZ', 'EN'];
  const minTitleScore = settings?.preferences?.minTitleScore || 50;

  const rankedResults = rankSearchResults(results, query, {
    expectedYear: year,
    preferredLanguages,
    minTitleScore,
  });

  return rankedResults;
}
