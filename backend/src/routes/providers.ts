import { Hono } from 'hono';
import { providerManager } from '../services/providers';
import { WebshareService } from '../services/webshare';
import { getSettings } from './settings';

const app = new Hono();

// List all providers
app.get('/', (c) => {
  const providers = providerManager.getAllProviders().map(p => ({
    name: p.name,
    baseUrl: p.baseUrl,
    capabilities: p.capabilities,
  }));
  
  return c.json(providers);
});

// Search all providers (torrents + webshare)
app.get('/search', async (c) => {
  const query = c.req.query('query') || c.req.query('q'); // Accept both 'query' and 'q'
  const type = c.req.query('type'); // 'movie' | 'tv' | 'all'
  
  if (!query) {
    return c.json({ error: 'Query parameter "query" or "q" is required', results: [] }, 400);
  }
  
  let torrentResults = [];
  
  // Search torrent providers
  if (type === 'movie') {
    const year = c.req.query('year');
    torrentResults = await providerManager.searchMovies(query, year ? parseInt(year) : undefined);
  } else if (type === 'tv') {
    const season = c.req.query('season');
    const episode = c.req.query('episode');
    torrentResults = await providerManager.searchTV(
      query,
      season ? parseInt(season) : undefined,
      episode ? parseInt(episode) : undefined
    );
  } else {
    torrentResults = await providerManager.searchAll(query);
  }
  
  // Try Webshare if enabled
  try {
    const settings = await getSettings();
    if (settings.webshare?.enabled && settings.webshare?.username && settings.webshare?.password) {
      const webshare = new WebshareService({
        username: settings.webshare.username,
        password: settings.webshare.password,
      });
      
      // For movies, include year in query for better results
      let webshareQuery = query;
      if (type === 'movie') {
        const year = c.req.query('year');
        if (year) {
          webshareQuery = `${query} (${year})`;
        }
      }
      
      const webshareResult = await webshare.search(webshareQuery, 20, true); // videoOnly = true
      
      // Convert Webshare results to TorrentResult format
      const webshareConverted = webshareResult.files.map(file => ({
        title: file.name,
        magnetUrl: `webshare:${file.ident}`, // Special format to identify Webshare links
        size: file.size,
        seeders: file.positive,
        leechers: file.negative,
        provider: 'Webshare.cz',
        quality: extractQuality(file.name),
      }));
      
      torrentResults = [...torrentResults, ...webshareConverted];
    }
  } catch (error) {
    console.error('Webshare search failed:', error);
  }
  
  // Sort by seeders
  torrentResults.sort((a, b) => b.seeders - a.seeders);
  
  return c.json({ 
    results: torrentResults,
    query,
    provider_count: new Set(torrentResults.map(r => r.provider)).size
  });
});

// Helper to extract quality from filename
function extractQuality(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('2160p') || lower.includes('4k')) return '2160p';
  if (lower.includes('1080p')) return '1080p';
  if (lower.includes('720p')) return '720p';
  if (lower.includes('480p')) return '480p';
  return 'Unknown';
}

// Search specific provider
app.get('/:provider/search', async (c) => {
  const providerName = c.req.param('provider');
  const query = c.req.query('query') || c.req.query('q'); // Accept both 'query' and 'q'
  
  if (!query) {
    return c.json({ error: 'Query parameter "query" or "q" is required' }, 400);
  }
  
  const provider = providerManager.getProvider(providerName);
  if (!provider) {
    return c.json({ error: `Provider "${providerName}" not found` }, 404);
  }
  
  const results = await provider.search(query);
  return c.json(results);
});

export default app;
