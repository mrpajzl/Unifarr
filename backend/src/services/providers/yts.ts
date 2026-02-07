import { BaseProvider, TorrentResult, ProviderCapabilities } from './base';
import axios from 'axios';

interface YTSMovie {
  id: number;
  title: string;
  year: number;
  torrents: Array<{
    url: string;
    hash: string;
    quality: string;
    type: string;
    seeds: number;
    peers: number;
    size: string;
    size_bytes: number;
    date_uploaded: string;
  }>;
}

/**
 * YTS Provider - Movies only, excellent quality
 */
export class YTSProvider extends BaseProvider {
  name = 'YTS';
  baseUrl = 'https://yts.mx';
  capabilities: ProviderCapabilities = {
    search: true,
    movieSearch: true,
    tvSearch: false,
  };
  
  private apiUrl = 'https://yts.mx/api/v2';
  
  async search(query: string): Promise<TorrentResult[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/list_movies.json`, {
        params: {
          query_term: query,
          limit: 50,
        },
        timeout: 10000,
      });
      
      if (!response.data?.data?.movies) {
        return [];
      }
      
      const results: TorrentResult[] = [];
      
      for (const movie of response.data.data.movies as YTSMovie[]) {
        for (const torrent of movie.torrents) {
          results.push({
            title: `${movie.title} (${movie.year}) [${torrent.quality}]`,
            infoHash: torrent.hash,
            magnetUrl: this.buildMagnetUrl(torrent.hash, movie.title),
            torrentUrl: torrent.url,
            size: torrent.size_bytes,
            seeders: torrent.seeds,
            leechers: torrent.peers,
            uploadDate: new Date(torrent.date_uploaded),
            category: 'Movies',
            provider: this.name,
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('YTS search error:', error);
      return [];
    }
  }
  
  async searchMovies(title: string, year?: number): Promise<TorrentResult[]> {
    const query = year ? `${title} ${year}` : title;
    return this.search(query);
  }
  
  private buildMagnetUrl(hash: string, title: string): string {
    const trackers = [
      'udp://open.demonii.com:1337/announce',
      'udp://tracker.openbittorrent.com:80',
      'udp://tracker.coppersurfer.tk:6969',
      'udp://glotorrents.pw:6969/announce',
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://torrent.gresille.org:80/announce',
      'udp://p4p.arenabg.com:1337',
      'udp://tracker.leechers-paradise.org:6969',
    ];
    
    const trackerParams = trackers.map(t => `tr=${encodeURIComponent(t)}`).join('&');
    return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}&${trackerParams}`;
  }
}
