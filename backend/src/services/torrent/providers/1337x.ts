import { TorrentProvider, TorrentResult, SearchQuery } from './base';

/**
 * 1337x torrent provider
 */
export class Provider1337x extends TorrentProvider {
  name = '1337x';
  baseUrl = 'https://1337x.to';
  enabled = true;

  async search(query: SearchQuery): Promise<TorrentResult[]> {
    try {
      const searchUrl = `${this.baseUrl}/search/${encodeURIComponent(query.query)}/1/`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return this.parseResults(html);
    } catch (error) {
      console.error(`${this.name} search error:`, error);
      return [];
    }
  }

  private parseResults(html: string): TorrentResult[] {
    const results: TorrentResult[] = [];
    
    // Extract table rows (simplified regex parsing)
    const tableRowRegex = /<tr>(.*?)<\/tr>/gs;
    const rows = html.match(tableRowRegex) || [];

    for (const row of rows) {
      try {
        // Extract torrent page URL
        const linkMatch = row.match(/href="(\/torrent\/[^"]+)"/);
        if (!linkMatch) continue;

        // Extract title
        const titleMatch = row.match(/>([^<]+)<\/a>/);
        if (!titleMatch) continue;

        // Extract seeders
        const seedersMatch = row.match(/seeds[^>]*>(\d+)/i);
        const seeders = seedersMatch ? parseInt(seedersMatch[1]) : 0;

        // Extract leechers
        const leechersMatch = row.match(/leeches[^>]*>(\d+)/i);
        const leechers = leechersMatch ? parseInt(leechersMatch[1]) : 0;

        // Extract size
        const sizeMatch = row.match(/(\d+\.?\d*\s*[KMGT]B)/i);
        const sizeStr = sizeMatch ? sizeMatch[1] : '0 MB';

        results.push({
          title: titleMatch[1].trim(),
          size: this.parseSizeToBytes(sizeStr),
          seeders,
          leechers,
          magnetUrl: `magnet:?xt=urn:btih:PLACEHOLDER&dn=${encodeURIComponent(titleMatch[1])}`, // Would need to fetch detail page for real magnet
          provider: this.name,
        });
      } catch (error) {
        // Skip malformed entries
        continue;
      }
    }

    return results.filter(r => r.seeders > 0); // Only return results with seeders
  }
}
