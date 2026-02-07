import { BaseProvider, TorrentResult } from './base';
import { YTSProvider } from './yts';

export class ProviderManager {
  private providers: Map<string, BaseProvider> = new Map();
  
  constructor() {
    // Register providers
    this.registerProvider(new YTSProvider());
  }
  
  registerProvider(provider: BaseProvider) {
    this.providers.set(provider.name, provider);
  }
  
  getProvider(name: string): BaseProvider | undefined {
    return this.providers.get(name);
  }
  
  getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values());
  }
  
  async searchAll(query: string): Promise<TorrentResult[]> {
    const promises = Array.from(this.providers.values()).map(provider =>
      provider.search(query).catch(err => {
        console.error(`Provider ${provider.name} failed:`, err);
        return [];
      })
    );
    
    const results = await Promise.all(promises);
    return results.flat().sort((a, b) => b.seeders - a.seeders);
  }
  
  async searchMovies(title: string, year?: number): Promise<TorrentResult[]> {
    const promises = Array.from(this.providers.values())
      .filter(p => p.capabilities.movieSearch && p.searchMovies)
      .map(provider =>
        provider.searchMovies!(title, year).catch(err => {
          console.error(`Provider ${provider.name} failed:`, err);
          return [];
        })
      );
    
    const results = await Promise.all(promises);
    return results.flat().sort((a, b) => b.seeders - a.seeders);
  }
  
  async searchTV(title: string, season?: number, episode?: number): Promise<TorrentResult[]> {
    const promises = Array.from(this.providers.values())
      .filter(p => p.capabilities.tvSearch && p.searchTV)
      .map(provider =>
        provider.searchTV!(title, season, episode).catch(err => {
          console.error(`Provider ${provider.name} failed:`, err);
          return [];
        })
      );
    
    const results = await Promise.all(promises);
    return results.flat().sort((a, b) => b.seeders - a.seeders);
  }
}

export const providerManager = new ProviderManager();
