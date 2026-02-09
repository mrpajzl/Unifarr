import { db } from '../db';
import { mediaItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getTMDBApiKey } from '../routes/settings';

interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
}

/**
 * Auto-identify media item with TMDB if we have a high confidence match
 */
export async function autoIdentifyMedia(mediaItemId: number): Promise<boolean> {
  try {
    const mediaItem = await db.query.mediaItems.findFirst({
      where: eq(mediaItems.id, mediaItemId),
    });

    if (!mediaItem) {
      console.log(`⚠️ Auto-identify: Media item ${mediaItemId} not found`);
      return false;
    }

    if (mediaItem.tmdbId) {
      console.log(`⏭️ Auto-identify: ${mediaItem.title} already has TMDB ID ${mediaItem.tmdbId}`);
      return false;
    }

    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      console.log(`⚠️ Auto-identify: No TMDB API key configured`);
      return false;
    }

    const type = mediaItem.type === 'movie' ? 'movie' : 'tv';
    // Don't include year in search query - TMDB works better without it
    const searchQuery = mediaItem.title;

    console.log(`🔍 Auto-identifying: ${searchQuery}${mediaItem.year ? ` (${mediaItem.year})` : ''} (${type})`);

    // Search TMDB (without year in query, we'll filter by year later)
    const searchUrl = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}`;
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      console.log(`❌ Auto-identify: TMDB search failed with ${searchResponse.status}`);
      return false;
    }

    const searchData = await searchResponse.json();
    const results: TMDBSearchResult[] = searchData.results || [];

    if (results.length === 0) {
      console.log(`❌ Auto-identify: No results found for "${searchQuery}"`);
      return false;
    }

    console.log(`📋 Auto-identify: Found ${results.length} results for "${searchQuery}"`);

    // Find best match
    const bestMatch = findBestMatch(mediaItem, results, type);

    if (!bestMatch) {
      console.log(`❌ Auto-identify: No high-confidence match for "${mediaItem.title}"`);
      return false;
    }

    const matchTitle = type === 'movie' ? bestMatch.title : bestMatch.name;
    console.log(`✨ Auto-identify: High-confidence match found: "${matchTitle}" (ID: ${bestMatch.id})`);


    // Fetch full details
    const detailsUrl = `https://api.themoviedb.org/3/${type}/${bestMatch.id}?api_key=${apiKey}&append_to_response=credits,external_ids`;
    const detailsResponse = await fetch(detailsUrl);

    if (!detailsResponse.ok) {
      return false;
    }

    const tmdbData = await detailsResponse.json();

    // Update media item with TMDB data
    const updateData: any = {
      tmdbId: bestMatch.id,
      title: type === 'movie' ? tmdbData.title : tmdbData.name,
      originalTitle: type === 'movie' ? tmdbData.original_title : tmdbData.original_name,
      overview: tmdbData.overview,
      year: type === 'movie'
        ? tmdbData.release_date ? new Date(tmdbData.release_date).getFullYear() : mediaItem.year
        : tmdbData.first_air_date ? new Date(tmdbData.first_air_date).getFullYear() : mediaItem.year,
      releaseDate: type === 'movie' ? tmdbData.release_date : tmdbData.first_air_date,
      runtime: type === 'movie' ? tmdbData.runtime : tmdbData.episode_run_time?.[0],
      genres: tmdbData.genres?.map((g: any) => g.name).join(', '),
      posterPath: tmdbData.poster_path,
      backdropPath: tmdbData.backdrop_path,
      voteAverage: tmdbData.vote_average,
      voteCount: tmdbData.vote_count,
      status: tmdbData.status,
      tagline: tmdbData.tagline,
      imdbId: tmdbData.external_ids?.imdb_id,
      numberOfSeasons: type === 'tv' ? tmdbData.number_of_seasons : null,
      numberOfEpisodes: type === 'tv' ? tmdbData.number_of_episodes : null,
    };

    await db.update(mediaItems)
      .set(updateData)
      .where(eq(mediaItems.id, mediaItemId));

    console.log(`✅ Auto-identified: ${mediaItem.title} → ${updateData.title} (TMDB ${bestMatch.id})`);

    return true;
  } catch (error) {
    console.error(`Auto-identify failed for media ${mediaItemId}:`, error);
    return false;
  }
}

/**
 * Find best matching result with high confidence
 */
function findBestMatch(
  mediaItem: any,
  results: TMDBSearchResult[],
  type: 'movie' | 'tv'
): TMDBSearchResult | null {
  const normalizedTitle = normalizeTitle(mediaItem.title);

  // If only 1 result and it's not completely obscure, use it
  if (results.length === 1) {
    const result = results[0];
    const resultYear = type === 'movie'
      ? result.release_date ? new Date(result.release_date).getFullYear() : null
      : result.first_air_date ? new Date(result.first_air_date).getFullYear() : null;
    
    const yearMatch = !mediaItem.year || !resultYear || Math.abs(mediaItem.year - resultYear) <= 2;
    
    // Accept if year matches (or no year) and has some votes
    if (yearMatch && (result.vote_count || 0) >= 3) {
      const resultTitle = type === 'movie' ? result.title : result.name;
      console.log(`  → Single result match: "${resultTitle}" (year: ${resultYear}, votes: ${result.vote_count})`);
      return result;
    }
  }

  // Multiple results - need stricter matching
  for (const result of results) {
    const resultTitle = type === 'movie' ? result.title : result.name;
    if (!resultTitle) continue;

    const normalizedResultTitle = normalizeTitle(resultTitle);

    // Check for exact title match
    const titleMatch = normalizedTitle === normalizedResultTitle;

    // Check for year match (if we have a year)
    const resultYear = type === 'movie'
      ? result.release_date ? new Date(result.release_date).getFullYear() : null
      : result.first_air_date ? new Date(result.first_air_date).getFullYear() : null;

    const yearMatch = !mediaItem.year || !resultYear || Math.abs(mediaItem.year - resultYear) <= 1;

    // High confidence: exact title match + year match (or no year to compare)
    if (titleMatch && yearMatch) {
      // Also check vote count to avoid obscure matches
      if ((result.vote_count || 0) >= 5) {
        console.log(`  → Exact match: "${resultTitle}" (year: ${resultYear}, votes: ${result.vote_count})`);
        return result;
      }
    }
  }

  console.log(`  → No high-confidence match (${results.length} results)`);
  return null;
}

/**
 * Normalize title for comparison (lowercase, remove special chars)
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')    // Normalize spaces
    .trim();
}
