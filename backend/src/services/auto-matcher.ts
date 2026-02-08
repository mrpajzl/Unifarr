import { db } from '../db';
import { files, mediaItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getTMDBService, getTMDBApiKey } from '../routes/settings';
import { normalizeTitle } from '../lib/normalize';

/**
 * Calculate string similarity (Levenshtein-based)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeTitle(str1);
  const s2 = normalizeTitle(str2);
  
  if (s1 === s2) return 1.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(s1, s2);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Auto-match a folder to TMDB
 * 
 * Strict matching logic:
 * - Title must match ≥95% similarity
 * - Year must match exactly (if provided)
 * - Only auto-match if confidence ≥ 0.95
 */
export async function autoMatchFolder(folderId: number): Promise<boolean> {
  try {
    // Get folder data
    const folder = await db.query.files.findFirst({
      where: eq(files.id, folderId),
    });
    
    if (!folder || !folder.parsedTitle) {
      console.log(`❌ Folder ${folderId} not found or has no parsed title`);
      return false;
    }
    
    if (folder.matched) {
      console.log(`⚠️ Folder ${folderId} already matched`);
      return false;
    }
    
    const { parsedTitle, parsedYear, path } = folder;
    
    // Determine type from path
    const isMovie = path.includes('/movies/') || path.includes('/Movies/');
    const isTv = path.includes('/tvshows/') || path.includes('/TV/') || path.includes('/tv/');
    
    if (!isMovie && !isTv) {
      console.log(`⚠️ Cannot determine media type for: ${path}`);
      return false;
    }
    
    // Get TMDB service
    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      console.log('❌ TMDB API key not configured');
      return false;
    }
    
    const tmdb = await getTMDBService();
    
    console.log(`🔍 Auto-matching: "${parsedTitle}" (${parsedYear || 'no year'}) - ${isMovie ? 'movie' : 'TV'}`);
    
    // Search TMDB
    let results;
    if (isMovie) {
      results = await tmdb.searchMovies(parsedTitle, parsedYear);
    } else {
      results = await tmdb.searchTVShows(parsedTitle, parsedYear);
    }
    
    if (results.length === 0) {
      console.log(`❌ No TMDB results for: ${parsedTitle}`);
      return false;
    }
    
    // Score each result
    const scored = results.map(result => {
      const tmdbTitle = 'title' in result ? result.title : result.name;
      const tmdbYear = result.year;
      
      let confidence = 0.0;
      
      // Title similarity
      const titleSim = stringSimilarity(parsedTitle, tmdbTitle);
      
      if (parsedYear) {
        // Has year: Title 60%, Year 40%
        confidence += titleSim * 0.6;
        
        if (tmdbYear === parsedYear) {
          confidence += 0.4; // Exact year match
        } else if (tmdbYear) {
          // Close year (±1 year) gets partial credit
          const yearDiff = Math.abs(tmdbYear - parsedYear);
          if (yearDiff === 1) confidence += 0.2;
        }
      } else {
        // No year: Title gets 100% weight, but require higher title similarity
        confidence = titleSim;
        
        // Bonus for high popularity (vote_count)
        const voteCount = result.vote_count || 0;
        if (voteCount > 1000) confidence += 0.02;
        if (voteCount > 5000) confidence += 0.03;
      }
      
      return {
        ...result,
        confidence,
        tmdbTitle,
      };
    });
    
    // Sort by confidence
    scored.sort((a, b) => b.confidence - a.confidence);
    
    const best = scored[0];
    
    console.log(`📊 Best match: "${best.tmdbTitle}" (${best.year}) - confidence: ${(best.confidence * 100).toFixed(1)}%`);
    
    // STRICT THRESHOLD: Only auto-match if ≥95% confident (or 92% if no year provided)
    const CONFIDENCE_THRESHOLD = parsedYear ? 0.95 : 0.92;
    
    if (best.confidence < CONFIDENCE_THRESHOLD) {
      console.log(`⚠️ Confidence ${(best.confidence * 100).toFixed(1)}% < ${(CONFIDENCE_THRESHOLD * 100)}% threshold - skipping auto-match`);
      console.log(`   Parsed: "${parsedTitle}" (${parsedYear || 'no year'})`);
      console.log(`   TMDB:   "${best.tmdbTitle}" (${best.year})`);
      return false;
    }
    
    // Check if media item already exists
    let mediaId: number | undefined;
    const existing = await db.query.mediaItems.findFirst({
      where: eq(mediaItems.tmdbId, best.id),
    });
    
    // Determine library path (for TV shows, use show folder, not episode file path)
    let libraryPath = path;
    if (!isMovie) {
      const parts = path.split('/');
      // Find Season folder and get parent (show folder)
      for (let i = parts.length - 1; i >= 0; i--) {
        if (/^Season\s+\d+$/i.test(parts[i])) {
          libraryPath = parts.slice(0, i).join('/') + '/';
          break;
        }
      }
      // If no Season folder found, use parent of file
      if (libraryPath === path) {
        libraryPath = parts.slice(0, -1).join('/') + '/';
      }
    }
    
    if (existing) {
      mediaId = existing.id;
      
      // Update library path if not set
      if (!existing.libraryPath) {
        await db.update(mediaItems)
          .set({ libraryPath })
          .where(eq(mediaItems.id, existing.id));
        console.log(`✅ Updated library path for existing media item: ${existing.title}`);
      }
      
      console.log(`✅ Using existing media item: ${existing.title} (ID: ${mediaId})`);
    } else {
      // Create new media item with library path
      const [inserted] = await db.insert(mediaItems).values({
        type: isMovie ? 'movie' : 'tv',
        title: best.tmdbTitle,
        year: best.year,
        tmdbId: best.id,
        overview: best.overview,
        posterPath: best.poster_path,
        backdropPath: best.backdrop_path,
        voteAverage: best.vote_average,
        voteCount: best.vote_count,
        genres: JSON.stringify(best.genres || []),
        runtime: 'runtime' in best ? best.runtime : undefined,
        numberOfSeasons: 'number_of_seasons' in best ? best.number_of_seasons : undefined,
        numberOfEpisodes: 'number_of_episodes' in best ? best.number_of_episodes : undefined,
        status: best.status,
        libraryPath, // Store the show folder path (for TV) or movie folder (for movies)
      }).returning();
      
      mediaId = inserted.id;
      console.log(`✅ Created media item: ${best.tmdbTitle} (ID: ${mediaId}) with library path: ${libraryPath}`);
    }
    
    // Link folder to media item
    await db.update(files)
      .set({
        mediaItemId: mediaId,
        matched: 1,
        matchConfidence: best.confidence,
      })
      .where(eq(files.id, folderId));
    
    // If it's a TV show, match all episodes in the same show folder
    if (!isMovie) {
      // Get the matched folder
      const folder = await db.query.files.findFirst({
        where: eq(files.id, folderId),
      });
      
      if (folder) {
        // Extract show folder from path
        let showFolder = folder.path;
        const parts = folder.path.split('/');
        
        // Find Season folder and get parent
        for (let i = parts.length - 1; i >= 0; i--) {
          if (/^Season\s+\d+$/i.test(parts[i])) {
            showFolder = parts.slice(0, i).join('/');
            break;
          }
        }
        
        // If no Season folder found, use parent of file
        if (showFolder === folder.path) {
          showFolder = parts.slice(0, -1).join('/');
        }
        
        console.log(`  📁 Show folder: ${showFolder}`);
        
        // Match ALL unmatched episodes in the same show folder
        const allUnmatched = await db.query.files.findMany({
          where: (files, { and, eq, isNotNull }) => and(
            eq(files.matched, false),
            isNotNull(files.parsedSeason)
          ),
        });
        
        // Filter by show folder
        const relatedEpisodes = allUnmatched.filter(ep => {
          let epShowFolder = ep.path;
          const epParts = ep.path.split('/');
          
          for (let i = epParts.length - 1; i >= 0; i--) {
            if (/^Season\s+\d+$/i.test(epParts[i])) {
              epShowFolder = epParts.slice(0, i).join('/');
              break;
            }
          }
          
          if (epShowFolder === ep.path) {
            epShowFolder = epParts.slice(0, -1).join('/');
          }
          
          return epShowFolder === showFolder;
        });
        
        if (relatedEpisodes.length > 0) {
          for (const episode of relatedEpisodes) {
            await db.update(files)
              .set({
                mediaItemId: mediaId,
                matched: 1,
                matchConfidence: best.confidence,
              })
              .where(eq(files.id, episode.id));
          }
          console.log(`  ✅ Also matched ${relatedEpisodes.length} related episodes in folder "${showFolder}"`);
        }
      }
    }
    
    console.log(`✅ Auto-matched: "${parsedTitle}" → "${best.tmdbTitle}" (confidence: ${(best.confidence * 100).toFixed(1)}%)`);
    return true;
    
  } catch (error) {
    console.error(`❌ Auto-match failed for folder ${folderId}:`, error);
    return false;
  }
}

/**
 * Auto-match all unmatched folders
 */
export async function autoMatchAll(): Promise<{ matched: number; skipped: number }> {
  const unmatched = await db.query.files.findMany({
    where: eq(files.matched, false),
  });
  
  let matched = 0;
  let skipped = 0;
  
  console.log(`🔍 Auto-matching ${unmatched.length} unmatched folders...`);
  
  for (const folder of unmatched) {
    const success = await autoMatchFolder(folder.id);
    if (success) {
      matched++;
    } else {
      skipped++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  console.log(`✅ Auto-match complete: ${matched} matched, ${skipped} skipped`);
  
  return { matched, skipped };
}
