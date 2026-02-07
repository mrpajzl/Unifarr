import { basename, extname } from 'path';

export interface ParsedFile {
  title: string;
  year?: number;
  season?: number;
  episode?: number;
  quality?: string;
  resolution?: string;
  codec?: string;
  releaseGroup?: string;
  isMovie: boolean;
  isTvShow: boolean;
}

// Video extensions to scan
export const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

// Quality patterns
const QUALITY_PATTERNS = {
  '2160p': /2160p|4k|uhd/i,
  '1080p': /1080p|fhd/i,
  '720p': /720p|hd/i,
  '480p': /480p|sd/i,
  'WEBDL': /web-?dl|webdl/i,
  'WEBRip': /web-?rip|webrip/i,
  'BluRay': /blu-?ray|bluray|bdrip|brrip/i,
  'DVDRip': /dvdrip|dvd-rip/i,
  'HDTV': /hdtv/i,
};

// Codec patterns
const CODEC_PATTERNS = {
  'x264': /x\.?264|h\.?264/i,
  'x265': /x\.?265|h\.?265|hevc/i,
  'XviD': /xvid/i,
  'DivX': /divx/i,
};

/**
 * Parse filename to extract media information
 */
export function parseFilename(filename: string): ParsedFile | null {
  const name = basename(filename, extname(filename));
  
  // Remove common junk
  let cleanName = name
    .replace(/[\[\](){}]/g, ' ')  // Remove brackets
    .replace(/[._-]/g, ' ')        // Replace separators with spaces
    .replace(/\s+/g, ' ')          // Normalize spaces
    .trim();

  // Try to detect TV show pattern: S01E02 or 1x02
  const tvPattern = /(.+?)\s+(?:S(\d{1,2})E(\d{1,2})|(\d{1,2})x(\d{1,2}))/i;
  const tvMatch = cleanName.match(tvPattern);
  
  if (tvMatch) {
    // TV Show
    const title = tvMatch[1].trim();
    const season = parseInt(tvMatch[2] || tvMatch[4]);
    const episode = parseInt(tvMatch[3] || tvMatch[5]);
    
    return {
      title: cleanTitle(title),
      season,
      episode,
      quality: detectQuality(name),
      resolution: detectResolution(name),
      codec: detectCodec(name),
      releaseGroup: detectReleaseGroup(name),
      isMovie: false,
      isTvShow: true,
    };
  }

  // Try to detect movie pattern: Title (Year) or Title Year
  const moviePattern = /(.+?)\s+(?:\()?(\d{4})(?:\))?/;
  const movieMatch = cleanName.match(moviePattern);
  
  if (movieMatch) {
    // Movie
    const title = movieMatch[1].trim();
    const year = parseInt(movieMatch[2]);
    
    // Validate year is reasonable
    if (year >= 1900 && year <= new Date().getFullYear() + 2) {
      return {
        title: cleanTitle(title),
        year,
        quality: detectQuality(name),
        resolution: detectResolution(name),
        codec: detectCodec(name),
        releaseGroup: detectReleaseGroup(name),
        isMovie: true,
        isTvShow: false,
      };
    }
  }

  // Fallback: assume it's a movie without year
  return {
    title: cleanTitle(cleanName.split(/\d{4}/)[0] || cleanName),
    quality: detectQuality(name),
    resolution: detectResolution(name),
    codec: detectCodec(name),
    releaseGroup: detectReleaseGroup(name),
    isMovie: true,
    isTvShow: false,
  };
}

/**
 * Clean up title (remove quality info, etc.)
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\b(1080p|720p|480p|2160p|4k|uhd|hd|sd|bluray|brrip|bdrip|dvdrip|web-?dl|web-?rip|hdtv|x264|x265|h264|h265|hevc|xvid|divx)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect video quality
 */
function detectQuality(name: string): string | undefined {
  for (const [quality, pattern] of Object.entries(QUALITY_PATTERNS)) {
    if (pattern.test(name)) {
      return quality;
    }
  }
  return undefined;
}

/**
 * Detect resolution
 */
function detectResolution(name: string): string | undefined {
  if (/2160p|4k|uhd/i.test(name)) return '2160p';
  if (/1080p/i.test(name)) return '1080p';
  if (/720p/i.test(name)) return '720p';
  if (/480p/i.test(name)) return '480p';
  return undefined;
}

/**
 * Detect codec
 */
function detectCodec(name: string): string | undefined {
  for (const [codec, pattern] of Object.entries(CODEC_PATTERNS)) {
    if (pattern.test(name)) {
      return codec;
    }
  }
  return undefined;
}

/**
 * Detect release group (usually at the end in brackets or after dash)
 */
function detectReleaseGroup(name: string): string | undefined {
  // Try to find group in brackets at the end
  const bracketMatch = name.match(/[\[\(]([a-z0-9]+)[\]\)]$/i);
  if (bracketMatch) {
    return bracketMatch[1];
  }
  
  // Try to find group after dash at the end
  const dashMatch = name.match(/-([a-z0-9]+)$/i);
  if (dashMatch && dashMatch[1].length < 20) {
    return dashMatch[1];
  }
  
  return undefined;
}

/**
 * Calculate confidence score for parsed result
 */
export function calculateConfidence(parsed: ParsedFile): number {
  let score = 0.5; // Base confidence
  
  if (parsed.year) score += 0.2;
  if (parsed.season !== undefined && parsed.episode !== undefined) score += 0.2;
  if (parsed.quality) score += 0.1;
  if (parsed.title.length >= 3) score += 0.1;
  
  return Math.min(score, 1.0);
}
