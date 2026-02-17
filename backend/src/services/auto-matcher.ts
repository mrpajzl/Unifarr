import { prisma } from '../db/prisma';
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
 */
export async function autoMatchFolder(folderId: number): Promise<boolean> {
  try {
    const folder = await prisma.file.findUnique({
      where: { id: folderId },
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
    const isMovie = path.toLowerCase().includes('/movies/');
    const isTv = path.toLowerCase().includes('/tvshows/') || 
                 path.toLowerCase().includes('/tv shows/') ||
                 path.toLowerCase().includes('/tv/') ||
                 path.toLowerCase().includes('/series/') ||
                 /Season\s+\d+/i.test(path);
    
    if (!isMovie && !isTv) {
      console.log(`⚠️ Cannot determine media type for: ${path}`);
      return false;
    }
    
    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      console.log('❌ TMDB API key not configured');
      return false;
    }
    
    const tmdb = await getTMDBService();
    
    console.log(`🔍 Auto-matching folder ${folderId}:`);
    console.log(`   Path: ${path}`);
    console.log(`   Title: "${parsedTitle}"`);
    console.log(`   Year: ${parsedYear || 'not parsed'}`);
    console.log(`   Type: ${isMovie ? 'movie' : 'TV show'}`);
    
    let results: any[];
    try {
      if (isMovie) {
        results = await tmdb.searchMovies(parsedTitle, parsedYear ?? undefined);
      } else {
        results = await tmdb.searchTVShows(parsedTitle, parsedYear ?? undefined);
      }
    } catch (err: any) {
      console.log(`❌ TMDB search failed: ${err.message}`);
      return false;
    }
    
    if (results.length === 0) {
      console.log(`❌ No TMDB results for: "${parsedTitle}"`);
      return false;
    }
    
    console.log(`📊 Found ${results.length} TMDB results for "${parsedTitle}"`);
    
    // Score each result
    const scored = results.map((result: any) => {
      const tmdbTitle = 'title' in result ? result.title : result.name;
      const tmdbYear = result.year;
      
      let confidence = 0.0;
      const titleSim = stringSimilarity(parsedTitle, tmdbTitle);
      
      if (parsedYear) {
        confidence += titleSim * 0.6;
        if (tmdbYear === parsedYear) {
          confidence += 0.4;
        } else if (tmdbYear) {
          const yearDiff = Math.abs(tmdbYear - parsedYear);
          if (yearDiff === 1) confidence += 0.2;
        }
      } else {
        confidence = titleSim;
        const voteCount = result.vote_count || 0;
        if (voteCount > 1000) confidence += 0.02;
        if (voteCount > 5000) confidence += 0.03;
      }
      
      return { ...result, confidence, tmdbTitle };
    });
    
    scored.sort((a: any, b: any) => b.confidence - a.confidence);
    const best = scored[0];
    
    console.log(`📊 Best match: "${best.tmdbTitle}" (${best.year}) - confidence: ${(best.confidence * 100).toFixed(1)}%`);
    
    const CONFIDENCE_THRESHOLD = isTv ? 0.85 : (parsedYear ? 0.90 : 0.88);
    
    if (best.confidence < CONFIDENCE_THRESHOLD) {
      console.log(`⚠️ Confidence ${(best.confidence * 100).toFixed(1)}% < ${(CONFIDENCE_THRESHOLD * 100)}% threshold - skipping`);
      return false;
    }
    
    // Check if media item already exists
    let mediaId: number;
    const existing = await prisma.media.findFirst({
      where: { tmdbId: best.id },
    });
    
    // Determine library path
    let libraryPath = path;
    if (!isMovie) {
      const parts = path.split('/');
      for (let i = parts.length - 1; i >= 0; i--) {
        if (/^Season\s+\d+$/i.test(parts[i])) {
          libraryPath = parts.slice(0, i).join('/') + '/';
          break;
        }
      }
      if (libraryPath === path) {
        libraryPath = parts.slice(0, -1).join('/') + '/';
      }
    }
    
    if (existing) {
      mediaId = existing.id;
      
      if (!existing.libraryPath) {
        await prisma.media.update({
          where: { id: existing.id },
          data: { libraryPath },
        });
        console.log(`✅ Updated library path for existing media item: ${existing.title}`);
      }
      
      console.log(`✅ Using existing media item: ${existing.title} (ID: ${mediaId})`);
    } else {
      const inserted = await prisma.media.create({
        data: {
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
          libraryPath,
        },
      });
      
      mediaId = inserted.id;
      console.log(`✅ Created media item: ${best.tmdbTitle} (ID: ${mediaId})`);
    }
    
    // Link folder to media item
    await prisma.file.update({
      where: { id: folderId },
      data: {
        mediaItemId: mediaId,
        matched: true,
        matchConfidence: best.confidence,
      },
    });
    
    // If it's a TV show, match all episodes in the same show folder
    if (!isMovie) {
      const currentFolder = await prisma.file.findUnique({
        where: { id: folderId },
      });
      
      if (currentFolder) {
        let showFolder = currentFolder.path;
        const parts = currentFolder.path.split('/');
        
        for (let i = parts.length - 1; i >= 0; i--) {
          if (/^Season\s+\d+$/i.test(parts[i])) {
            showFolder = parts.slice(0, i).join('/');
            break;
          }
        }
        
        if (showFolder === currentFolder.path) {
          showFolder = parts.slice(0, -1).join('/');
        }
        
        console.log(`  📁 Show folder: ${showFolder}`);
        
        // Match ALL unmatched episodes in the same show folder
        const allUnmatched = await prisma.file.findMany({
          where: {
            matched: false,
            parsedSeason: { not: null },
          },
        });
        
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
            await prisma.file.update({
              where: { id: episode.id },
              data: {
                mediaItemId: mediaId,
                matched: true,
                matchConfidence: best.confidence,
              },
            });
          }
          console.log(`  ✅ Also matched ${relatedEpisodes.length} related episodes`);
        }
      }
    }
    
    console.log(`✅ Auto-matched: "${parsedTitle}" → "${best.tmdbTitle}" (${(best.confidence * 100).toFixed(1)}%)`);
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
  const unmatched = await prisma.file.findMany({
    where: { matched: false },
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
    
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  console.log(`✅ Auto-match complete: ${matched} matched, ${skipped} skipped`);
  
  return { matched, skipped };
}
