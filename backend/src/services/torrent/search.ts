import { TorrentProvider, TorrentResult, SearchQuery } from './providers/base';
import { Provider1337x } from './providers/1337x';
import { ProviderYTS } from './providers/yts';

// Initialize providers
const providers: TorrentProvider[] = [
  new ProviderYTS(),
  new Provider1337x(),
];

/**
 * Search all enabled providers in parallel
 */
export async function searchTorrents(query: SearchQuery): Promise<TorrentResult[]> {
  const enabledProviders = providers.filter(p => p.enabled);
  
  console.log(`🔍 Searching ${enabledProviders.length} providers for: ${query.query}`);

  const results = await Promise.allSettled(
    enabledProviders.map(provider => provider.search(query))
  );

  // Combine all results
  const allResults: TorrentResult[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    } else {
      console.error('Provider search failed:', result.reason);
    }
  }

  // Filter and sort results
  let filtered = allResults;

  if (query.minSeeders) {
    filtered = filtered.filter(r => r.seeders >= query.minSeeders!);
  }

  if (query.maxSize) {
    filtered = filtered.filter(r => r.size <= query.maxSize!);
  }

  // Sort by seeders (descending) and then by size (prefer smaller when seeders equal)
  filtered.sort((a, b) => {
    if (b.seeders !== a.seeders) {
      return b.seeders - a.seeders;
    }
    return a.size - b.size;
  });

  console.log(`✅ Found ${filtered.length} results from ${enabledProviders.length} providers`);
  return filtered;
}

/**
 * Get all available providers
 */
export function getProviders(): TorrentProvider[] {
  return providers;
}

/**
 * Test all providers
 */
export async function testProviders(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (const provider of providers) {
    console.log(`Testing ${provider.name}...`);
    results[provider.name] = await provider.test();
  }

  return results;
}

/**
 * Search for movie torrents with smart filtering
 */
export async function searchMovieTorrents(title: string, year?: number, minQuality: string = '720p') {
  const query = year ? `${title} ${year}` : title;
  
  const results = await searchTorrents({
    query,
    category: 'movie',
    minSeeders: 5,
  });

  // Filter by quality preference
  const qualityOrder = ['2160p', '1080p', '720p', '480p'];
  const minQualityIndex = qualityOrder.indexOf(minQuality);
  
  if (minQualityIndex !== -1) {
    return results.filter(r => {
      if (!r.quality) return true;
      const qualityIndex = qualityOrder.indexOf(r.quality);
      return qualityIndex !== -1 && qualityIndex <= minQualityIndex;
    });
  }

  return results;
}

/**
 * Search for TV show torrents
 */
export async function searchTvShowTorrents(title: string, season?: number, episode?: number) {
  let query = title;
  
  if (season !== undefined && episode !== undefined) {
    query += ` S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`;
  } else if (season !== undefined) {
    query += ` S${season.toString().padStart(2, '0')}`;
  }

  return await searchTorrents({
    query,
    category: 'tv',
    minSeeders: 5,
  });
}
