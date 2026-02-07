/**
 * Text normalization utilities
 * Used for matching movie/TV show titles
 */

/**
 * Remove diacritics (Czech/Slovak/Polish/etc.)
 * á → a, č → c, ě → e, etc.
 */
export function removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalize title for comparison
 * - Remove diacritics (á → a, č → c)
 * - Lowercase
 * - Remove special characters
 * - Remove leading articles (the, a, an)
 * - Normalize whitespace
 */
export function normalizeTitle(title: string): string {
  return removeDiacritics(title)
    .toLowerCase()
    .trim()
    // Remove leading articles
    .replace(/^(the|a|an)\s+/i, '')
    // Remove special characters but keep spaces and numbers
    .replace(/[^\w\s\d]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize for search matching (removes year, quality info, subtitles)
 */
export function normalizeForSearch(title: string): string {
  let result = removeDiacritics(title)
    .toLowerCase()
    .trim()
    // Remove subtitles/secondary titles but preserve episode/season info
    // "Title: Subtitle S01E02" → "Title S01E02"
    // Match ": word(s)" but stop before S/E patterns
    .replace(/:\s+([a-z\s]+?)(?=\s*[se]\d|$)/gi, ' ')
    // Remove leading articles
    .replace(/^(the|a|an)\s+/i, '')
    // Remove year in various formats
    .replace(/\(\d{4}\)/g, '')
    .replace(/\[\d{4}\]/g, '')
    .replace(/\b\d{4}\b/g, '')
    // Remove quality/format info
    .replace(/\b(1080p|720p|2160p|4k|uhd|hdr|bluray|brrip|webrip|web-dl|dvdrip)\b/gi, '')
    // Remove special characters but keep spaces and numbers
    .replace(/[^\w\s\d]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return result;
}
