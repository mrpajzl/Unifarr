import { normalizeForSearch } from './normalize';

/**
 * Match Scorer - Two-phase smart ranking for search results
 * Phase 1: Title match filter (eliminate wrong movies)
 * Phase 2: Quality ranking (rank correct movies by quality)
 */

interface MatchOptions {
  query: string;
  title: string;
  year?: number;
  expectedYear?: number;
  seeders?: number;
  size?: number; // File size in bytes
  languages?: string[];
  preferredLanguages?: string[];
}

interface MatchResult {
  score: number;
  titleScore: number; // Phase 1: title match (0-100)
  qualityScore: number; // Phase 2: quality score (0-100)
  breakdown: {
    titleMatch: number;
    yearMatch: number;
    languageBonus: number;
    sizeBonus: number;
    seedersBonus: number;
    resolutionBonus: number;
  };
}

/**
 * Calculate Levenshtein distance (edit distance)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Calculate similarity ratio (0-1)
 */
function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  return 1 - (distance / maxLength);
}

/**
 * Extract languages from title
 * Common patterns: (CZ), [EN], CZ/EN, Czech, English, etc.
 */
function extractLanguages(title: string): string[] {
  const languages: string[] = [];
  const patterns = [
    /\(([A-Z]{2}(?:\/[A-Z]{2})*)\)/g,  // (CZ), (CZ/EN)
    /\[([A-Z]{2}(?:\/[A-Z]{2})*)\]/g,  // [CZ], [CZ/EN]
    /\b(CZ|EN|SK|DE|FR|ES|IT|PL|RU)(?:\/([A-Z]{2}))*\b/g,  // CZ/EN standalone
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(title)) !== null) {
      const langs = match[1].split('/');
      languages.push(...langs);
    }
  }

  return [...new Set(languages.map(l => l.toUpperCase()))];
}

/**
 * Extract year from title if present
 */
function extractYear(title: string): number | undefined {
  const yearMatch = title.match(/\((\d{4})\)|\[(\d{4})\]|(\d{4})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1] || yearMatch[2] || yearMatch[3]);
    if (year >= 1900 && year <= 2100) {
      return year;
    }
  }
  return undefined;
}

/**
 * Extract video resolution from title
 */
function extractResolution(title: string): string | undefined {
  const resMatch = title.match(/\b(2160p|4k|1080p|720p|480p)\b/i);
  return resMatch ? resMatch[1].toLowerCase() : undefined;
}

/**
 * Calculate match score for a search result
 * Two-phase scoring: Title match filter + Quality ranking
 */
export function calculateMatchScore(options: MatchOptions): MatchResult {
  const {
    query,
    title,
    year: providedYear,
    expectedYear,
    seeders = 0,
    size = 0,
    languages = [],
    preferredLanguages = [],
  } = options;

  // Extract year from title if not provided
  const year = providedYear || extractYear(title);

  // Normalize titles for comparison (removes diacritics, special chars, year, quality info)
  const normalizedQuery = normalizeForSearch(query);
  const normalizedTitle = normalizeForSearch(title);

  // ===== PHASE 1: TITLE MATCH (0-100 points) =====
  // This determines if it's the RIGHT movie/show

  // 1. Title similarity (0-90 points)
  const titleSimilarity = similarityRatio(normalizedQuery, normalizedTitle);
  const titleMatch = titleSimilarity * 90;

  // 2. Year match (0-10 points)
  let yearMatch = 0;
  if (expectedYear && year) {
    const yearDiff = Math.abs(year - expectedYear);
    if (yearDiff === 0) {
      yearMatch = 10;
    } else if (yearDiff === 1) {
      yearMatch = 5; // ±1 year tolerance
    }
  }

  const titleScore = titleMatch + yearMatch;

  // ===== PHASE 2: QUALITY RANKING (0-100 points) =====
  // Only matters if titleScore passes threshold

  // 1. Language bonus (0-30 points)
  let languageBonus = 0;
  if (preferredLanguages.length > 0) {
    const titleLanguages = languages.length > 0 ? languages : extractLanguages(title);
    const matchingLangs = titleLanguages.filter(lang => 
      preferredLanguages.includes(lang.toUpperCase())
    );

    if (matchingLangs.length > 0) {
      // Full bonus if all preferred languages are present
      if (matchingLangs.length === preferredLanguages.length) {
        languageBonus = 30;
      } else {
        // Partial bonus
        languageBonus = (matchingLangs.length / preferredLanguages.length) * 30;
      }
    }
  }

  // 2. Resolution bonus (0-30 points)
  let resolutionBonus = 0;
  const resolution = extractResolution(title);
  if (resolution) {
    const resMap: Record<string, number> = {
      '2160p': 30,
      '4k': 30,
      '1080p': 20,
      '720p': 10,
      '480p': 5,
    };
    resolutionBonus = resMap[resolution] || 0;
  }

  // 3. Size bonus (0-20 points)
  // Larger files usually = better quality
  let sizeBonus = 0;
  if (size > 0) {
    const sizeGB = size / (1024 * 1024 * 1024);
    // Scale: 0.5GB=5pts, 2GB=10pts, 5GB=15pts, 10GB+=20pts
    if (sizeGB >= 10) sizeBonus = 20;
    else if (sizeGB >= 5) sizeBonus = 15;
    else if (sizeGB >= 2) sizeBonus = 10;
    else if (sizeGB >= 0.5) sizeBonus = 5;
  }

  // 4. Seeders/speed bonus (0-20 points)
  let seedersBonus = 0;
  if (seeders >= 10000) {
    // Webshare or very popular = max bonus
    seedersBonus = 20;
  } else if (seeders > 0) {
    // Logarithmic scale for torrents: 1 seed=4pts, 10=8pts, 100=12pts, 1000=16pts
    seedersBonus = Math.min(20, 4 + Math.log10(seeders) * 4);
  }

  const qualityScore = languageBonus + resolutionBonus + sizeBonus + seedersBonus;

  // Combined score (title score is more important, but quality matters)
  // We keep them separate for filtering
  const totalScore = titleScore + qualityScore;

  return {
    score: Math.round(totalScore * 100) / 100,
    titleScore: Math.round(titleScore * 100) / 100,
    qualityScore: Math.round(qualityScore * 100) / 100,
    breakdown: {
      titleMatch: Math.round(titleMatch * 100) / 100,
      yearMatch,
      languageBonus: Math.round(languageBonus * 100) / 100,
      sizeBonus: Math.round(sizeBonus * 100) / 100,
      seedersBonus: Math.round(seedersBonus * 100) / 100,
      resolutionBonus: Math.round(resolutionBonus * 100) / 100,
    },
  };
}

/**
 * Filter and sort search results by match score
 * Two-phase: Filter by titleScore, then sort by qualityScore
 */
export function rankSearchResults<T extends { title: string; seeders?: number; year?: number; size?: number }>(
  results: T[],
  query: string,
  options?: {
    expectedYear?: number;
    preferredLanguages?: string[];
    minTitleScore?: number; // Phase 1 threshold (default: 50)
    minQualityScore?: number; // Phase 2 threshold (optional)
  }
): Array<T & { matchScore: number; titleScore: number; qualityScore: number; matchBreakdown: any }> {
  const { 
    expectedYear, 
    preferredLanguages = [], 
    minTitleScore = 50,
    minQualityScore = 0,
  } = options || {};

  // Calculate score for each result
  const scored = results.map(result => {
    const matchResult = calculateMatchScore({
      query,
      title: result.title,
      year: result.year,
      expectedYear,
      seeders: result.seeders,
      size: result.size,
      preferredLanguages,
    });

    return {
      ...result,
      matchScore: matchResult.score,
      titleScore: matchResult.titleScore,
      qualityScore: matchResult.qualityScore,
      matchBreakdown: matchResult.breakdown,
    };
  });

  // Phase 1: Filter by title score (eliminate wrong movies)
  const titleFiltered = scored.filter(r => r.titleScore >= minTitleScore);

  console.log(`  📊 Title filter: ${scored.length} → ${titleFiltered.length} (threshold: ${minTitleScore})`);

  // Phase 2: Filter by quality score (optional) and sort by quality
  const qualityFiltered = titleFiltered.filter(r => r.qualityScore >= minQualityScore);

  // Sort by quality score first (better quality on top), then by title score as tiebreaker
  return qualityFiltered.sort((a, b) => {
    if (Math.abs(b.qualityScore - a.qualityScore) > 1) {
      return b.qualityScore - a.qualityScore; // Quality is primary sort
    }
    return b.titleScore - a.titleScore; // Title score as tiebreaker
  });
}
