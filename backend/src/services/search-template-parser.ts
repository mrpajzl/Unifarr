/**
 * Search Template Parser
 * 
 * Supports placeholders:
 * 
 * Movies:
 * - {Movie Title} - localized title
 * - {Movie OriginalTitle} - original title
 * - {Movie CleanTitle} - title without articles (The, A, An)
 * - {Movie CleanOriginalTitle} - original title without articles
 * - {Movie TitleThe} - title with article moved to end
 * - {Movie Collection} - collection name
 * - {Release Year} - release year
 * - {ImdbId} - IMDB ID
 * - {TmdbId} - TMDB ID
 * 
 * TV Shows:
 * - {Series Title} - localized series title
 * - {Series OriginalTitle} - original series title
 * - {Series CleanTitle} - series title without articles
 * - {Season} - season number
 * - {Season:2} - season number, zero-padded to 2 digits
 * - {Episode} - episode number
 * - {Episode:2} - episode number, zero-padded to 2 digits
 * - {Episode Title} - episode title
 * - {Release Year} - first air date year
 * - {ImdbId} - IMDB ID
 * - {TmdbId} - TMDB ID
 * 
 * Language suffix:
 * - {Movie Title:DE} - German title
 * - {Movie Title:CZ} - Czech title
 * - etc.
 */

export interface MovieData {
  title: string;
  originalTitle?: string;
  releaseYear?: number;
  imdbId?: string;
  tmdbId: number;
  collection?: string;
}

export interface TVShowData {
  title: string;
  originalTitle?: string;
  season: number;
  episode: number;
  episodeTitle?: string;
  releaseYear?: number;
  imdbId?: string;
  tmdbId: number;
}

/**
 * Remove leading articles (The, A, An)
 */
function cleanTitle(title: string): string {
  return title.replace(/^(The|A|An)\s+/i, '').trim();
}

/**
 * Move leading article to the end
 */
function titleWithArticleAtEnd(title: string): string {
  const match = title.match(/^(The|A|An)\s+(.+)$/i);
  if (match) {
    return `${match[2]}, ${match[1]}`;
  }
  return title;
}

/**
 * Pad number with zeros
 */
function padNumber(num: number, width: number): string {
  return num.toString().padStart(width, '0');
}

/**
 * Parse movie search template
 */
export function parseMovieTemplate(template: string, data: MovieData): string {
  // Skip templates with OriginalTitle if it's missing or same as Title
  if (template.includes('{Movie OriginalTitle}') || template.includes('{Movie CleanOriginalTitle}')) {
    if (!data.originalTitle || data.originalTitle.toLowerCase() === data.title.toLowerCase()) {
      return ''; // Will be filtered out
    }
  }
  
  let result = template;
  
  // Simple replacements
  const replacements: Record<string, string> = {
    '{Movie Title}': data.title,
    '{Movie OriginalTitle}': data.originalTitle || '',
    '{Movie CleanTitle}': cleanTitle(data.title),
    '{Movie CleanOriginalTitle}': data.originalTitle ? cleanTitle(data.originalTitle) : '',
    '{Movie TitleThe}': titleWithArticleAtEnd(data.title),
    '{Movie Collection}': data.collection || '',
    '{Release Year}': data.releaseYear?.toString() || '',
    '{ImdbId}': data.imdbId || '',
    '{TmdbId}': data.tmdbId.toString(),
  };
  
  // Apply replacements
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  // TODO: Language-specific titles (requires TMDB API calls)
  // For now, just remove language-specific placeholders
  result = result.replace(/\{Movie [^:}]+:[A-Z]{2}\}/g, '');
  
  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Parse TV show search template
 */
export function parseTVTemplate(template: string, data: TVShowData): string {
  // Skip templates with OriginalTitle if it's missing or same as Title
  if (template.includes('{Series OriginalTitle}') || template.includes('{Series CleanOriginalTitle}')) {
    if (!data.originalTitle || data.originalTitle.toLowerCase() === data.title.toLowerCase()) {
      return ''; // Will be filtered out
    }
  }
  
  // Skip templates with Season/Episode if we don't have that data (whole series search)
  if (!data.season || !data.episode) {
    if (template.includes('{Season') || template.includes('{Episode')) {
      return ''; // Skip episode-specific templates when searching whole series
    }
  }
  
  let result = template;
  
  // Handle padded numbers: {Season:2}, {Episode:3}, etc.
  if (data.season) {
    result = result.replace(/\{Season:(\d+)\}/g, (_, width) => {
      return padNumber(data.season, parseInt(width));
    });
  }
  
  if (data.episode) {
    result = result.replace(/\{Episode:(\d+)\}/g, (_, width) => {
      return padNumber(data.episode, parseInt(width));
    });
  }
  
  // Simple replacements
  const replacements: Record<string, string> = {
    '{Series Title}': data.title,
    '{Series OriginalTitle}': data.originalTitle || '',
    '{Series CleanTitle}': cleanTitle(data.title),
    '{Season}': data.season?.toString() || '',
    '{Episode}': data.episode?.toString() || '',
    '{Episode Title}': data.episodeTitle || '',
    '{Release Year}': data.releaseYear?.toString() || '',
    '{ImdbId}': data.imdbId || '',
    '{TmdbId}': data.tmdbId.toString(),
  };
  
  // Apply replacements
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  // TODO: Language-specific titles
  result = result.replace(/\{Series [^:}]+:[A-Z]{2}\}/g, '');
  
  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Get all search queries for a movie
 */
export function getMovieSearchQueries(
  templates: string[],
  data: MovieData
): string[] {
  const queries = templates
    .map(template => parseMovieTemplate(template, data))
    .filter(query => query.length > 0);
  
  // Deduplicate queries (case-insensitive)
  const seen = new Set<string>();
  return queries.filter(query => {
    const normalized = query.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

/**
 * Get all search queries for a TV episode
 */
export function getTVSearchQueries(
  templates: string[],
  data: TVShowData
): string[] {
  const queries = templates
    .map(template => parseTVTemplate(template, data))
    .filter(query => query.length > 0);
  
  // Deduplicate queries (case-insensitive)
  const seen = new Set<string>();
  return queries.filter(query => {
    const normalized = query.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
