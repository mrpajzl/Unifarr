/**
 * Base provider interface - inspired by Prowlarr's indexer architecture
 */

export interface TorrentResult {
  title: string;
  infoHash?: string;
  magnetUrl?: string;
  torrentUrl?: string;
  size: number; // bytes
  seeders: number;
  leechers: number;
  uploadDate?: Date;
  category?: string;
  provider: string;
}

export interface ProviderCapabilities {
  search: boolean;
  movieSearch: boolean;
  tvSearch: boolean;
}

export abstract class BaseProvider {
  abstract name: string;
  abstract baseUrl: string;
  abstract capabilities: ProviderCapabilities;
  
  abstract search(query: string): Promise<TorrentResult[]>;
  
  // Optional: More specific search methods
  async searchMovies?(title: string, year?: number): Promise<TorrentResult[]>;
  async searchTV?(title: string, season?: number, episode?: number): Promise<TorrentResult[]>;
  
  // Helper to calculate match score
  protected calculateMatchScore(result: string, query: string): number {
    const resultLower = result.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (resultLower === queryLower) return 1.0;
    if (resultLower.includes(queryLower)) return 0.8;
    
    // Simple word matching
    const resultWords = resultLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    const matchedWords = queryWords.filter(word => resultWords.includes(word));
    
    return matchedWords.length / queryWords.length;
  }
}
