/**
 * Media file parser - inspired by Radarr and Sonarr
 * Extracts metadata from filenames and paths
 */

export interface ParsedMedia {
  type: 'movie' | 'tv' | 'unknown';
  title: string;
  year?: number;
  season?: number;
  episode?: number;
  quality?: string;
  resolution?: string;
  source?: string;
  codec?: string;
  edition?: string;
  group?: string;
  original: string;
}

// Quality/Resolution patterns
const resolutionPatterns = [
  { regex: /\b2160p\b|4k|UHD/i, value: '2160p' },
  { regex: /\b1080p\b/i, value: '1080p' },
  { regex: /\b720p\b/i, value: '720p' },
  { regex: /\b480p\b/i, value: '480p' },
  { regex: /\b360p\b/i, value: '360p' },
];

const sourcePatterns = [
  { regex: /\bBlu-?Ray\b|BDRip|BD(?!$)|BDISO/i, value: 'BluRay' },
  { regex: /\bWEB-?DL\b|WEBDL/i, value: 'WEB-DL' },
  { regex: /\bWEBRip\b/i, value: 'WEBRip' },
  { regex: /\bHDTV\b/i, value: 'HDTV' },
  { regex: /\bDVD\b|DVDRip/i, value: 'DVD' },
];

const codecPatterns = [
  { regex: /\bx264\b/i, value: 'x264' },
  { regex: /\bx265\b|HEVC/i, value: 'x265' },
  { regex: /\bh\.?264\b/i, value: 'h264' },
  { regex: /\bXviD\b/i, value: 'XviD' },
];

const editionPatterns = [
  /\b(Director'?s? Cut|EXTENDED|Unrated|Uncut|Remastered|IMAX|Theatrical)\b/gi,
];

// TV Show patterns (inspired by Sonarr + extended for common formats)
const tvPatterns = [
  // S01E05, S01E05E06, S01E05-E06, S1E5
  /(?<title>.+?)[\s._-]+S(?<season>\d{1,2})[\s._-]?E(?<episode>\d{1,3})(?:[\s._-]?E(?<episode2>\d{1,3}))?/i,
  // Season 1 Episode 5, Season 01 Episode 05
  /(?<title>.+?)[\s._-]+Season[\s._-]?(?<season>\d{1,2})[\s._-]+Episode[\s._-]?(?<episode>\d{1,3})/i,
  // 1x05, 1x05x06, 1x05-06
  /(?<title>.+?)[\s._-]+(?<season>\d{1,2})x(?<episode>\d{1,3})(?:[\s._-]?x?(?<episode2>\d{1,3}))?/i,
  // Show.Name.105 (season 1, episode 5) - must be 3 digits, first is season
  /(?<title>.+?)[\s._-]+(?<season>\d{1})(?<episode>\d{2})(?![\dp])/i,
  // [01x05] or (1x05) - brackets variation
  /(?<title>.+?)[\s._-]*[\[\(](?<season>\d{1,2})x(?<episode>\d{1,3})[\]\)]/i,
  // Episode 5, Ep 5, E05 (when in Season subfolder, fallback to episode only)
  /(?<title>.+?)[\s._-]+(?:Episode|Ep|E)[\s._-]?(?<episode>\d{1,3})\b/i,
];

// Movie patterns (inspired by Radarr)
const moviePatterns = [
  // Movie.Title.2023.1080p.BluRay
  /^(?<title>(?![(\[]).+?)[\s._-]+(?<year>(?:19|20)\d{2})(?!p|i|\d)/i,
  // Movie Title (2023)
  /^(?<title>.+?)[\s._-]*\((?<year>(?:19|20)\d{2})\)/i,
  // Movie.Title.YEAR.Edition
  /^(?<title>.+?)[\s._-]+(Director'?s|Extended|Unrated)[\s._-]+(?<year>(?:19|20)\d{2})/i,
];

function cleanTitle(title: string): string {
  return title
    .replace(/[\s._-]+/g, ' ')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();
}

function extractQuality(filename: string) {
  const resolution = resolutionPatterns.find(p => p.regex.test(filename))?.value;
  const source = sourcePatterns.find(p => p.regex.test(filename))?.value;
  const codec = codecPatterns.find(p => p.regex.test(filename))?.value;
  
  const parts = [source, resolution, codec].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

function extractEdition(filename: string): string | undefined {
  for (const pattern of editionPatterns) {
    const match = filename.match(pattern);
    if (match) return match[0];
  }
  return undefined;
}

function extractGroup(filename: string): string | undefined {
  // Release group usually at the end: Movie.Title.2023.1080p.BluRay-GROUP
  const match = filename.match(/[-_]([a-z0-9]+)$/i);
  return match ? match[1] : undefined;
}

export function parseMediaFile(filename: string): ParsedMedia {
  const original = filename;
  
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[a-z0-9]{2,4}$/i, '');
  
  // Try TV patterns first
  for (const pattern of tvPatterns) {
    const match = nameWithoutExt.match(pattern);
    if (match?.groups) {
      const { title, season, episode, episode2 } = match.groups;
      return {
        type: 'tv',
        title: cleanTitle(title),
        season: parseInt(season),
        episode: parseInt(episode),
        quality: extractQuality(nameWithoutExt),
        resolution: resolutionPatterns.find(p => p.regex.test(nameWithoutExt))?.value,
        source: sourcePatterns.find(p => p.regex.test(nameWithoutExt))?.value,
        codec: codecPatterns.find(p => p.regex.test(nameWithoutExt))?.value,
        group: extractGroup(nameWithoutExt),
        original,
      };
    }
  }
  
  // Try movie patterns
  for (const pattern of moviePatterns) {
    const match = nameWithoutExt.match(pattern);
    if (match?.groups) {
      const { title, year } = match.groups;
      return {
        type: 'movie',
        title: cleanTitle(title),
        year: parseInt(year),
        quality: extractQuality(nameWithoutExt),
        resolution: resolutionPatterns.find(p => p.regex.test(nameWithoutExt))?.value,
        source: sourcePatterns.find(p => p.regex.test(nameWithoutExt))?.value,
        codec: codecPatterns.find(p => p.regex.test(nameWithoutExt))?.value,
        edition: extractEdition(nameWithoutExt),
        group: extractGroup(nameWithoutExt),
        original,
      };
    }
  }
  
  // Fallback: couldn't parse
  return {
    type: 'unknown',
    title: cleanTitle(nameWithoutExt),
    quality: extractQuality(nameWithoutExt),
    original,
  };
}

// Parse a full path and determine type based on folder structure too
export function parseMediaPath(fullPath: string): ParsedMedia {
  const filename = fullPath.split('/').pop() || fullPath;
  const parsed = parseMediaFile(filename);
  
  // Additional hints from path structure
  // /Movies/Movie.Title.2023/ -> likely movie
  // /TV Shows/Show Name/Season 01/ -> likely TV
  if (parsed.type === 'unknown') {
    if (/\/Movies?\//i.test(fullPath)) {
      parsed.type = 'movie';
    } else if (/\/TV Shows?|\/Series\//i.test(fullPath) || /\/Season \d+/i.test(fullPath)) {
      parsed.type = 'tv';
    }
  }
  
  // Extract season number from parent folder if not found in filename
  // e.g., /Show Name/Season 1/Episode.mkv or /Show/S01/Episode.mkv
  if (parsed.type === 'tv' && !parsed.season) {
    const seasonFolderMatch = fullPath.match(/\/Season[\s._-]?(\d{1,2})\//i) || 
                              fullPath.match(/\/S(\d{1,2})\//i);
    if (seasonFolderMatch) {
      parsed.season = parseInt(seasonFolderMatch[1]);
    }
  }
  
  return parsed;
}

/**
 * Parse folder name (simpler than file parsing)
 * Examples:
 * - "Titanic (1997)" -> { title: "Titanic", year: 1997 }
 * - "Breaking Bad" -> { title: "Breaking Bad" }
 * - "Avatar.2009" -> { title: "Avatar", year: 2009 }
 */
export interface ParsedFolder {
  title: string;
  year?: number;
  original: string;
}

export function parseMediaFolderName(folderName: string): ParsedFolder {
  const original = folderName;
  
  // Pattern 1: "Title (YYYY)"
  let match = folderName.match(/^(.+?)\s*\((\d{4})\)$/);
  if (match) {
    return {
      title: cleanTitle(match[1]),
      year: parseInt(match[2]),
      original,
    };
  }
  
  // Pattern 2: "Title.YYYY" or "Title - YYYY"
  match = folderName.match(/^(.+?)[\s._-]+(\d{4})$/);
  if (match) {
    return {
      title: cleanTitle(match[1]),
      year: parseInt(match[2]),
      original,
    };
  }
  
  // Pattern 3: "Title YYYY" (year at end with space)
  match = folderName.match(/^(.+?)\s+(\d{4})$/);
  if (match) {
    return {
      title: cleanTitle(match[1]),
      year: parseInt(match[2]),
      original,
    };
  }
  
  // No year found, just clean the title
  return {
    title: cleanTitle(folderName),
    original,
  };
}
