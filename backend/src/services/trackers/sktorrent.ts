import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import {
  BaseTracker,
  TrackerCapabilities,
  TrackerCategory,
  TrackerConfig,
  TrackerSearchParams,
  TrackerSearchResult,
} from './base-tracker';

/**
 * SKTorrent (Sk-CzTorrent) Tracker
 * Semi-Private Czech/Slovak Tracker
 */
export class SKTorrentTracker extends BaseTracker {
  private baseUrl = 'https://sktorrent.eu';
  private client: AxiosInstance;
  private cookies: string[] = [];
  private loggedIn = false;

  constructor(config: TrackerConfig) {
    super(config);
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });
  }

  getCapabilities(): TrackerCapabilities {
    return {
      search: true,
      movieSearch: true,
      tvSearch: true,
      musicSearch: true,
      requiresAuth: true,
      categories: [
        { id: 1, name: 'Filmy CZ/SK dabing', type: 'movie' },
        { id: 5, name: 'Filmy Kreslené', type: 'movie' },
        { id: 15, name: 'Filmy s titulkama', type: 'movie' },
        { id: 19, name: 'Filmy HD', type: 'movie' },
        { id: 20, name: 'Filmy DVD', type: 'movie' },
        { id: 28, name: 'Filmy Blu-ray', type: 'movie' },
        { id: 31, name: 'Filmy bez titulků', type: 'movie' },
        { id: 43, name: 'Filmy UHD', type: 'movie' },
        { id: 3, name: 'Filmy 3D', type: 'movie' },
        { id: 16, name: 'TV Seriál', type: 'tv' },
        { id: 17, name: 'TV Dokument', type: 'tv' },
        { id: 42, name: 'TV Pořad', type: 'tv' },
        { id: 44, name: 'TV Sport', type: 'tv' },
        { id: 2, name: 'Hudba', type: 'music' },
        { id: 22, name: 'Hudba DJ\'s Mix', type: 'music' },
        { id: 26, name: 'Hudební videa', type: 'music' },
        { id: 45, name: 'Soundtrack', type: 'music' },
        { id: 23, name: 'Knihy a Časopisy', type: 'book' },
        { id: 18, name: 'Hry na Windows', type: 'other' },
        { id: 30, name: 'Hry na Konzole', type: 'other' },
        { id: 21, name: 'Programy', type: 'other' },
        { id: 25, name: 'Ostatní', type: 'other' },
      ],
    };
  }

  async test(): Promise<boolean> {
    try {
      const success = await this.login();
      if (success) {
        console.log(`✅ SKTorrent: Authentication successful`);
        return true;
      } else {
        console.log(`❌ SKTorrent: Authentication failed`);
        return false;
      }
    } catch (error) {
      console.error('SKTorrent test error:', error);
      return false;
    }
  }

  protected async login(): Promise<boolean> {
    if (this.loggedIn) {
      return true;
    }

    if (!this.config.credentials?.username || !this.config.credentials?.password) {
      throw new Error('SKTorrent: Username and password required');
    }

    // Retry login with exponential backoff
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.attemptLogin();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⚠️ SKTorrent login attempt ${attempt} failed, retrying in ${waitTime / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    console.error(`❌ SKTorrent login failed after ${maxRetries} attempts:`, lastError);
    return false;
  }
  
  private async attemptLogin(): Promise<boolean> {
    try {
      // POST to login form
      const response = await this.client.post(
        '/torrent/login.php',
        new URLSearchParams({
          uid: this.config.credentials!.username!,
          pwd: this.config.credentials!.password!,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Save cookies
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        this.cookies = setCookies;
        this.client.defaults.headers.Cookie = this.cookies.join('; ');
      }

      // Test if logged in by checking user profile link
      const testResponse = await this.client.get('/torrent/index.php');
      const $ = cheerio.load(testResponse.data);
      
      // Check for user profile link (successful login indicator)
      const userLink = $('a[href^="usercp.php"]');
      
      if (userLink.length > 0) {
        this.loggedIn = true;
        console.log(`✅ SKTorrent: Logged in as ${this.config.credentials!.username}`);
        return true;
      }

      // Check for error message
      const errorMsg = $('font:contains("Incorrect")');
      if (errorMsg.length > 0) {
        console.error('SKTorrent: Invalid credentials');
        return false;
      }

      return false;
    } catch (error) {
      console.error('SKTorrent login error:', error);
      return false;
    }
  }

  async search(params: TrackerSearchParams): Promise<TrackerSearchResult[]> {
    try {
      // Ensure we're logged in
      if (!this.loggedIn) {
        const success = await this.login();
        if (!success) {
          throw new Error('SKTorrent: Login required');
        }
      }

      // Determine categories based on type
      let categories: string[] = [];
      if (params.type === 'movie') {
        categories = ['1', '5', '15', '19', '20', '28', '31', '43', '3'];
      } else if (params.type === 'tv') {
        categories = ['16', '17', '42', '44'];
      } else if (params.type === 'music') {
        categories = ['2', '22', '26', '45'];
      }

      // Build search params
      const searchParams: any = {
        search: params.query,
        active: '0', // 0=all, 1=active only, 2=dead only
      };

      if (categories.length > 0) {
        searchParams.category = categories.join(';');
      }

      // Execute search
      const response = await this.client.get('/torrent/torrents.php', {
        params: searchParams,
      });

      // Parse results
      const $ = cheerio.load(response.data);
      const results: TrackerSearchResult[] = [];

      // Find torrent rows
      $('table.lista > tbody > tr > td > table.lista > tbody > tr:has(a[href^="download.php?id="])').each((_, row) => {
        try {
          const $row = $(row);

          // Extract data
          const titleEl = $row.find('a[href^="details.php?id="]');
          const downloadEl = $row.find('a[href^="download.php?id="]');
          const sizeText = $row.find('td:nth-child(3)').text();
          const dateText = $row.find('td:nth-child(3)').text();
          const seedersText = $row.find('td:nth-child(5)').text();
          const leechersText = $row.find('td:nth-child(6)').text();
          const posterEl = $row.find('a[href^="#"]');

          const title = this.cleanTitle(titleEl.attr('title') || '');
          const downloadUrl = this.baseUrl + '/torrent/' + downloadEl.attr('href');
          const infoUrl = this.baseUrl + '/torrent/' + titleEl.attr('href');

          // Parse size (format: "Velkost 1.23 GB | ...")
          const sizeMatch = sizeText.match(/Velkost\s+(.+?)\s*\|/);
          const size = sizeMatch ? this.parseSize(sizeMatch[1]) : 0;

          // Parse date (format: "Pridany DD/MM/YYYY o HH:MM")
          const dateMatch = dateText.match(/Pridany\s+(\d{2}\/\d{2}\/\d{4})\s+o\s+(\d{2}:\d{2})/);
          let publishDate: Date | undefined;
          if (dateMatch) {
            const [_, date, time] = dateMatch;
            const [day, month, year] = date.split('/');
            publishDate = new Date(`${year}-${month}-${day}T${time}:00+01:00`);
          }

          // Parse seeders/leechers
          const seeders = parseInt(seedersText.trim()) || 0;
          const leechers = parseInt(leechersText.trim()) || 0;

          // Extract poster
          const posterMatch = posterEl.attr('onmouseover')?.match(/src=(.+?)\swidth/);
          const poster = posterMatch ? 'https:' + posterMatch[1] : undefined;

          if (title && downloadUrl) {
            results.push({
              title,
              downloadUrl,
              infoUrl,
              size,
              seeders,
              leechers,
              publishDate,
              poster,
            });
          }
        } catch (error) {
          console.error('Error parsing SKTorrent row:', error);
        }
      });

      console.log(`SKTorrent: Found ${results.length} results for "${params.query}"`);
      return results;

    } catch (error) {
      console.error('SKTorrent search error:', error);
      throw error;
    }
  }

  /**
   * Clean title (remove CSFD ratings, fix season formats, etc.)
   */
  private cleanTitle(title: string): string {
    return title
      // Remove CSFD ratings
      .replace(/\|\s*\d+\%\s*CSFD\.cz\/|CSFD\s*=*\s*\d+\%/gi, '')
      // Remove leading VA |
      .replace(/^VA\s*\|/, 'VA -')
      // Remove leading junk
      .replace(/^.*?\s*\/\s*|^.*?\s*\|\s*/, '')
      .trim();
  }

  /**
   * Parse size string to bytes
   */
  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      TB: 1024 * 1024 * 1024 * 1024,
    };

    return Math.round(value * (multipliers[unit] || 1));
  }

  /**
   * Download .torrent file with authentication
   * Used for proxy downloads since .torrent files require cookies
   */
  async downloadTorrentFile(downloadUrl: string): Promise<Buffer> {
    try {
      // Ensure we're logged in
      if (!this.loggedIn) {
        const success = await this.login();
        if (!success) {
          throw new Error('SKTorrent: Login required to download .torrent file');
        }
      }

      // Download .torrent file
      const response = await this.client.get(downloadUrl, {
        responseType: 'arraybuffer',
      });

      if (response.status !== 200) {
        throw new Error(`Failed to download .torrent file: ${response.status}`);
      }

      return Buffer.from(response.data);
    } catch (error) {
      console.error('SKTorrent download torrent file error:', error);
      throw error;
    }
  }
}
