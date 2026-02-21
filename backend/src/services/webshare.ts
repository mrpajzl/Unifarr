/**
 * Webshare.cz API Service
 * 
 * Integrace s Webshare.cz pro vyhledávání a stahování souborů
 */

import crypto from 'crypto';
import apacheMd5 from 'apache-md5';
import { parseFilename, ParsedMediaInfo } from '../lib/filename-parser';

export interface WebshareCredentials {
  username: string;
  password: string;
}

export interface WebshareAudioTrack {
  language: string;
  codec: string;
  channels?: string;
}

export interface WebshareSubtitleTrack {
  language: string;
  format?: string;
}

export interface WebshareFileInfo {
  audio?: WebshareAudioTrack[];
  subtitles?: WebshareSubtitleTrack[];
  video?: {
    resolution?: string;
    codec?: string;
    fps?: string;
  };
}

export interface WebshareFile {
  ident: string;
  name: string;
  size: number;
  type: string;
  positive: number; // rating
  negative: number;
  img?: string;
  info?: WebshareFileInfo; // Extended info from file_info API
}

export interface WebshareSearchResult {
  files: WebshareFile[];
  total: number;
}

export class WebshareService {
  private token: string | null = null;
  private baseUrl = 'https://webshare.cz';
  
  constructor(private credentials: WebshareCredentials) {}
  
  /**
   * Hash password with salt using Webshare's Apache MD5 + SHA1 pattern
   */
  private hashPassword(password: string, salt: string): string {
    // Webshare uses Apache MD5 Crypt followed by SHA1
    const saltString = `$1$${salt}$`;
    const md5CryptHash = apacheMd5(password, saltString);
    const finalHash = crypto.createHash('sha1').update(md5CryptHash).digest('hex');
    return finalHash;
  }

  /**
   * Get salt for authentication
   */
  private async getSalt(username: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/salt/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username_or_email: username,
        }),
      });
      
      const text = await response.text();
      const saltMatch = text.match(/<salt>([^<]+)<\/salt>/);
      
      if (saltMatch) {
        return saltMatch[1];
      }
      
      console.error('❌ Failed to get salt:', text);
      return null;
    } catch (error) {
      console.error('❌ Get salt error:', error);
      return null;
    }
  }

  /**
   * Login to Webshare and get auth token
   */
  async login(): Promise<boolean> {
    try {
      // Step 1: Get salt
      const salt = await this.getSalt(this.credentials.username);
      if (!salt) {
        return false;
      }
      
      // Step 2: Hash password with salt
      const hashedPassword = this.hashPassword(this.credentials.password, salt);
      
      // Step 3: Login with hashed password
      const response = await fetch(`${this.baseUrl}/api/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username_or_email: this.credentials.username,
          password: hashedPassword,
          keep_logged_in: '1',
        }),
      });
      
      const text = await response.text();
      
      // Parse XML response
      const tokenMatch = text.match(/<token>([^<]+)<\/token>/);
      if (tokenMatch) {
        this.token = tokenMatch[1];
        console.log('✅ Webshare login successful');
        return true;
      }
      
      console.error('❌ Webshare login failed:', text.substring(0, 200));
      return false;
    } catch (error) {
      console.error('❌ Webshare login error:', error);
      return false;
    }
  }
  
  /**
   * Ensure we're logged in
   */
  private async ensureLoggedIn(): Promise<boolean> {
    if (!this.token) {
      return await this.login();
    }
    return true;
  }
  
  /**
   * Search for files on Webshare
   * @param query - Search query
   * @param limit - Max results
   * @param videoOnly - Filter only video files (categories: video, archive, document, music, image, other)
   */
  async search(query: string, limit = 50, videoOnly = true): Promise<WebshareSearchResult> {
    try {
      // Build search parameters
      const params: Record<string, string> = {
        what: query,
        category: videoOnly ? 'video' : '', // Filter only video files
        limit: limit.toString(),
        offset: '0',
        sort: 'largest', // Sort by size (largest first)
      };
      
      // Try to add token if logged in (for better results/limits), but don't require it
      if (this.token) {
        params.wst = this.token;
      } else {
        // Try to login, but continue even if it fails (public search works without auth)
        try {
          await this.login();
          if (this.token) {
            params.wst = this.token;
          }
        } catch (loginError) {
          console.log('⚠️ Webshare login failed, continuing with public search');
        }
      }
      
      console.log(`🔍 Webshare search: "${query}" (authenticated: ${!!params.wst})`);
      
      const response = await fetch(`${this.baseUrl}/api/search/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams(params),
      });
      
      const text = await response.text();
      
      // Parse XML response
      const files: WebshareFile[] = [];
      const fileMatches = text.matchAll(/<file>([\s\S]*?)<\/file>/g);
      
      for (const match of fileMatches) {
        const fileXml = match[1];
        const ident = fileXml.match(/<ident>([^<]+)<\/ident>/)?.[1];
        const name = fileXml.match(/<name>([^<]+)<\/name>/)?.[1];
        const size = fileXml.match(/<size>(\d+)<\/size>/)?.[1];
        const type = fileXml.match(/<type>([^<]+)<\/type>/)?.[1];
        const positive = fileXml.match(/<positive>(\d+)<\/positive>/)?.[1];
        const negative = fileXml.match(/<negative>(\d+)<\/negative>/)?.[1];
        const img = fileXml.match(/<img>([^<]+)<\/img>/)?.[1];
        
        if (ident && name && size) {
          files.push({
            ident,
            name,
            size: parseInt(size),
            type: type || 'unknown',
            positive: positive ? parseInt(positive) : 0,
            negative: negative ? parseInt(negative) : 0,
            img,
          });
        }
      }
      
      const totalMatch = text.match(/<total>(\d+)<\/total>/);
      const total = totalMatch ? parseInt(totalMatch[1]) : files.length;
      
      console.log(`🔍 Webshare search: "${query}" - found ${files.length}/${total} files`);
      
      return { files, total };
    } catch (error) {
      console.error('❌ Webshare search error:', error);
      return { files: [], total: 0 };
    }
  }
  
  /**
   * Get download link for a file
   */
  async getDownloadLink(ident: string): Promise<string | null> {
    try {
      // Ensure we're logged in
      if (!this.token) {
        const success = await this.login();
        if (!success) {
          throw new Error('Failed to login to Webshare');
        }
      }
      
      const response = await fetch(`${this.baseUrl}/api/file_link/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          ident,
          password: '', // Empty for public files
          wst: this.token!,
        }),
      });
      
      const text = await response.text();
      
      // Check for errors
      const statusMatch = text.match(/<status>([^<]+)<\/status>/);
      if (statusMatch && statusMatch[1] !== 'OK') {
        const errorMatch = text.match(/<message>([^<]+)<\/message>/);
        const errorMsg = errorMatch ? errorMatch[1] : 'Unknown error';
        console.error('❌ Webshare API error:', errorMsg);
        return null;
      }
      
      // Parse XML response
      const linkMatch = text.match(/<link>([^<]+)<\/link>/);
      if (linkMatch) {
        console.log('✅ Got download link for:', ident);
        return linkMatch[1];
      }
      
      console.error('❌ Failed to get download link:', text.substring(0, 200));
      return null;
    } catch (error) {
      console.error('❌ Webshare get link error:', error);
      return null;
    }
  }
  
  /**
   * Score a file based on name, size, and rating
   * Returns 0-1 confidence score
   */
  scoreFile(file: WebshareFile, searchQuery: string, preferredQuality = '1080p'): number {
    let score = 0.0;
    
    const nameLower = file.name.toLowerCase();
    const queryLower = searchQuery.toLowerCase();
    
    // Name match (40%)
    if (nameLower.includes(queryLower)) {
      score += 0.4;
    }
    
    // Quality match (30%)
    if (nameLower.includes(preferredQuality.toLowerCase())) {
      score += 0.3;
    } else if (nameLower.includes('720p')) {
      score += 0.15;
    } else if (nameLower.includes('2160p') || nameLower.includes('4k')) {
      score += 0.2;
    }
    
    // Size check (10%) - reasonable movie size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 500 && sizeMB < 15000) {
      score += 0.1;
    }
    
    // Rating (20%)
    const totalVotes = file.positive + file.negative;
    if (totalVotes > 0) {
      const ratingRatio = file.positive / totalVotes;
      score += ratingRatio * 0.2;
    }
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Find best file from search results
   */
  findBestFile(files: WebshareFile[], searchQuery: string, preferredQuality = '1080p'): WebshareFile | null {
    if (files.length === 0) return null;
    
    const scored = files.map(file => ({
      file,
      score: this.scoreFile(file, searchQuery, preferredQuality),
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    console.log(`🎯 Best file: "${scored[0].file.name}" (score: ${(scored[0].score * 100).toFixed(1)}%)`);
    
    return scored[0].file;
  }

  /**
   * Get detailed file info (audio tracks, subtitles, video info)
   * Parses info from filename since Webshare API doesn't provide audio/subtitle details
   */
  async getFileInfo(ident: string): Promise<WebshareFileInfo | null> {
    try {
      // Ensure we're logged in
      if (!this.token) {
        const success = await this.login();
        if (!success) {
          console.error('❌ Failed to login to Webshare for file info');
          return null;
        }
      }

      const response = await fetch(`${this.baseUrl}/api/file_info/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          ident,
          wst: this.token!,
        }),
      });

      const text = await response.text();

      // Check for errors
      const statusMatch = text.match(/<status>([^<]+)<\/status>/);
      if (statusMatch && statusMatch[1] !== 'OK') {
        console.error('❌ Webshare file_info error:', text);
        return null;
      }

      // Get filename from response
      const nameMatch = text.match(/<name>([^<]+)<\/name>/);
      if (!nameMatch) {
        console.error('❌ No filename in Webshare response');
        return null;
      }

      const filename = nameMatch[1];
      console.log(`🔍 Parsing file info from filename: "${filename}"`);

      // Parse media info from filename
      const parsed = parseFilename(filename);

      // Convert parsed data to WebshareFileInfo format
      const info: WebshareFileInfo = {};

      if (parsed.audio && parsed.audio.length > 0) {
        info.audio = parsed.audio.map(track => ({
          language: track.language,
          codec: track.codec || '',
          channels: track.channels,
        }));
      }

      if (parsed.subtitles && parsed.subtitles.length > 0) {
        info.subtitles = parsed.subtitles.map(lang => ({
          language: lang,
        }));
      }

      if (parsed.video) {
        info.video = {
          resolution: parsed.video.resolution,
          codec: parsed.video.codec,
        };
      }

      console.log(`ℹ️ Parsed file info for ${ident}:`, {
        filename,
        audio: info.audio?.length || 0,
        subtitles: info.subtitles?.length || 0,
        video: info.video?.resolution || 'N/A',
      });

      return info;
    } catch (error) {
      console.error('❌ Webshare getFileInfo error:', error);
      return null;
    }
  }
}

/**
 * Global Webshare instance
 */
let webshareInstance: WebshareService | null = null;

/**
 * Initialize Webshare service with credentials
 */
export function initWebshare(credentials: WebshareCredentials): WebshareService {
  webshareInstance = new WebshareService(credentials);
  return webshareInstance;
}

/**
 * Get Webshare instance
 */
export function getWebshare(): WebshareService | null {
  return webshareInstance;
}
