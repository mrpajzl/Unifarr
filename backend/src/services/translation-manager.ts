/**
 * Translation Manager
 * 
 * Manages media metadata translations with caching
 * - Fetches translations from TMDB on-demand
 * - Caches translations with 7-day TTL
 * - Rate limit protection via tmdb-rate-limiter
 * - Fallback to English if translation unavailable
 */

import { prisma } from '../db/prisma';
import { fetchFromTMDB } from './tmdb-rate-limiter';

const TRANSLATION_TTL_DAYS = 7;

interface TranslationData {
  title: string;
  overview?: string;
  tagline?: string;
}

/**
 * Get translation for media in specified language
 * Returns cached if available and fresh, otherwise fetches from TMDB
 */
export async function getMediaTranslation(
  mediaId: number,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  language: string,
  apiKey: string
): Promise<TranslationData | null> {
  // Check cache first
  const cached = await prisma.mediaTranslation.findUnique({
    where: {
      mediaId_language: {
        mediaId,
        language,
      },
    },
  });

  // Return cached if still fresh
  if (cached && cached.expiresAt > new Date()) {
    console.log(`📦 Cache hit: ${mediaType}/${tmdbId} (${language})`);
    return {
      title: cached.title,
      overview: cached.overview || undefined,
      tagline: cached.tagline || undefined,
    };
  }

  // Cache miss or expired - fetch from TMDB
  console.log(`🔍 Fetching translation: ${mediaType}/${tmdbId} (${language})`);

  try {
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${apiKey}&language=${language}`;

    const data = await fetchFromTMDB<any>(url);

    const translation: TranslationData = {
      title: data.title || data.name,
      overview: data.overview || undefined,
      tagline: data.tagline || undefined,
    };

    // Save to cache
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRANSLATION_TTL_DAYS);

    await prisma.mediaTranslation.upsert({
      where: {
        mediaId_language: {
          mediaId,
          language,
        },
      },
      create: {
        mediaId,
        language,
        title: translation.title,
        overview: translation.overview,
        tagline: translation.tagline,
        expiresAt,
      },
      update: {
        title: translation.title,
        overview: translation.overview,
        tagline: translation.tagline,
        cachedAt: new Date(),
        expiresAt,
      },
    });

    console.log(`✅ Cached translation: ${mediaType}/${tmdbId} (${language})`);

    return translation;
  } catch (error) {
    console.error(`Failed to fetch translation for ${mediaType}/${tmdbId} (${language}):`, error);
    return null;
  }
}

/**
 * Pre-warm translations for popular languages
 * Call after adding new media
 */
export async function prewarmTranslations(
  mediaId: number,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  apiKey: string,
  languages: string[] = ['cs', 'de', 'fr']
): Promise<void> {
  console.log(`🔥 Pre-warming translations for ${mediaType}/${tmdbId}`);

  for (const language of languages) {
    try {
      await getMediaTranslation(mediaId, tmdbId, mediaType, language, apiKey);
      
      // Small delay to avoid bursting requests
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Failed to pre-warm ${language} for ${mediaType}/${tmdbId}:`, error);
    }
  }
}

/**
 * Clean up expired translations (run periodically)
 */
export async function cleanupExpiredTranslations(): Promise<number> {
  const result = await prisma.mediaTranslation.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  console.log(`🧹 Cleaned up ${result.count} expired translations`);
  return result.count;
}

/**
 * Get translation statistics (for monitoring)
 */
export async function getTranslationStats() {
  const totalTranslations = await prisma.mediaTranslation.count();
  
  const byLanguage = await prisma.mediaTranslation.groupBy({
    by: ['language'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const expired = await prisma.mediaTranslation.count({
    where: { expiresAt: { lt: new Date() } },
  });

  return {
    total: totalTranslations,
    expired,
    byLanguage: byLanguage.map(item => ({
      language: item.language,
      count: item._count.id,
    })),
  };
}
