import { TorrentProvider, TorrentResult, SearchQuery } from './base';

/**
 * YTS torrent provider (movies only, high quality, reliable API)
 */
export class ProviderYTS extends TorrentProvider {
  name = 'YTS';
  baseUrl = 'https://yts.mx';
  apiUrl = 'https://yts.mx/api/v2';
  enabled = true;

  async search(query: SearchQuery): Promise<TorrentResult[]> {
    // YTS only has movies
    if (query.category === 'tv') return [];

    try {
      const searchUrl = `${this.apiUrl}/list_movies.json?query_term=${encodeURIComponent(query.query)}&limit=20&sort_by=seeders`;
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.parseResults(data);
    } catch (error) {
      console.error(`${this.name} search error:`, error);
      return [];
    }
  }

  private parseResults(data: any): TorrentResult[] {
    const results: TorrentResult[] = [];

    if (!data.data || !data.data.movies) return results;

    for (const movie of data.data.movies) {
      if (!movie.torrents) continue;

      for (const torrent of movie.torrents) {
        results.push({
          title: `${movie.title_long} [${torrent.quality}] [${torrent.type}]`,
          size: torrent.size_bytes || 0,
          seeders: torrent.seeds || 0,
          leechers: torrent.peers || 0,
          magnetUrl: `magnet:?xt=urn:btih:${torrent.hash}&dn=${encodeURIComponent(movie.title)}&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://torrent.gresille.org:80/announce&tr=udp://p4p.arenabg.com:1337&tr=udp://tracker.leechers-paradise.org:6969`,
          infoHash: torrent.hash,
          quality: torrent.quality,
          category: 'movie',
          uploadDate: new Date(torrent.date_uploaded),
          provider: this.name,
        });
      }
    }

    return results;
  }
}
