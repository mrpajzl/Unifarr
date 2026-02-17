/**
 * Episode Monitor - Check for new episodes of monitored TV shows
 */

import { prisma } from '../db/prisma';
import { getTMDBService } from '../routes/settings';
import { createTMDBRateLimiter } from '../lib/rate-limiter';

interface NewEpisode {
  mediaId: number;
  showTitle: string;
  season: number;
  episode: number;
  episodeTitle: string;
  airDate: string;
}

/**
 * Check for new episodes of all monitored TV shows
 */
export async function checkNewEpisodes(): Promise<NewEpisode[]> {
  console.log('📺 Checking for new episodes...');
  
  try {
    // Get all monitored TV shows
    const monitoredShows = await prisma.media.findMany({
      where: {
        type: 'tv',
        monitored: true,
      },
    });
    
    if (monitoredShows.length === 0) {
      console.log('  No monitored TV shows');
      return [];
    }
    
    console.log(`  Found ${monitoredShows.length} monitored shows`);
    
    const tmdb = await getTMDBService();
    
    if (!tmdb) {
      console.error('  TMDB service not available - skipping episode check');
      return [];
    }
    
    // Create rate limiter (30 requests per 10 seconds)
    const rateLimiter = createTMDBRateLimiter();
    
    const newEpisodes: NewEpisode[] = [];
    const today = new Date().toISOString().split('T')[0];
    
    for (const show of monitoredShows) {
      if (!show.tmdbId) continue;
      
      try {
        // Rate limit TMDB API calls
        await rateLimiter.waitIfNeeded();
        
        // Get show details to find latest season
        const details = await tmdb.getTVShowDetails(show.tmdbId);
        
        if (!details || !details.number_of_seasons) continue;
        
        // Check last 2 seasons for new episodes
        const seasonsToCheck = [
          details.number_of_seasons,
          details.number_of_seasons - 1,
        ].filter(s => s > 0);
        
        for (const seasonNum of seasonsToCheck) {
          try {
            // Rate limit TMDB API calls
            await rateLimiter.waitIfNeeded();
            
            const season = await tmdb.getTVSeason(show.tmdbId, seasonNum);
            
            if (!season || !season.episodes) continue;
            
            // Find episodes that aired today or recently (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
            
            for (const episode of season.episodes) {
              if (!episode.air_date) continue;
              
              // Episode aired in last 7 days
              if (episode.air_date >= sevenDaysAgoStr && episode.air_date <= today) {
                // Check if we already have this episode
                const existingFiles = await db.query.files.findMany({
                  where: (files, { eq, and }) => 
                    and(
                      eq(files.mediaItemId, show.id),
                      eq(files.parsedSeason, seasonNum),
                      eq(files.parsedEpisode, episode.episode_number)
                    ),
                });
                
                if (existingFiles.length === 0) {
                  console.log(`  🆕 New episode: ${show.title} S${seasonNum}E${episode.episode_number}`);
                  
                  newEpisodes.push({
                    mediaId: show.id,
                    showTitle: show.title,
                    season: seasonNum,
                    episode: episode.episode_number,
                    episodeTitle: episode.name || '',
                    airDate: episode.air_date,
                  });
                }
              }
            }
          } catch (seasonError) {
            console.error(`  Error checking season ${seasonNum} of ${show.title}:`, seasonError);
          }
        }
      } catch (showError) {
        console.error(`  Error checking show ${show.title}:`, showError);
      }
    }
    
    if (newEpisodes.length > 0) {
      console.log(`✅ Found ${newEpisodes.length} new episodes`);
      
      // Auto-download each new episode
      for (const episode of newEpisodes) {
        try {
          await autoDownloadEpisode(episode);
        } catch (error) {
          console.error(`Failed to auto-download ${episode.showTitle} S${episode.season}E${episode.episode}:`, error);
        }
      }
    } else {
      console.log('  No new episodes');
    }
    
    return newEpisodes;
  } catch (error) {
    console.error('Episode monitor error:', error);
    return [];
  }
}

/**
 * Auto-download new episodes
 */
export async function autoDownloadEpisode(episode: NewEpisode): Promise<boolean> {
  console.log(`📥 Auto-downloading: ${episode.showTitle} S${episode.season}E${episode.episode}`);
  
  try {
    // Get media details for template search
    const media = await db.query.mediaItems.findFirst({
      where: eq(mediaItems.id, episode.mediaId),
    });
    
    if (!media) {
      console.error('  ❌ Media not found');
      return false;
    }
    
    // Search using template
    const searchData = {
      tmdbId: media.tmdbId,
      title: media.title,
      originalTitle: media.originalTitle,
      releaseYear: media.year,
      imdbId: media.imdbId,
      season: episode.season,
      episode: episode.episode,
      episodeTitle: episode.episodeTitle,
    };
    
    // Import search function dynamically to avoid circular dependency
    const { getTVSearchQueries } = await import('./search-template-parser');
    const { getSettings } = await import('../routes/settings');
    const settings = await getSettings();
    
    // Get templates
    const showOverride = settings.searchTemplates?.overrides?.[media.tmdbId || 0];
    const templates = showOverride || settings.searchTemplates?.tv || [
      '{Series Title} S{Season:2}E{Episode:2}',
      '{Series OriginalTitle} S{Season:2}E{Episode:2}',
    ];
    
    const queries = getTVSearchQueries(templates, searchData);
    console.log(`  🔍 Generated ${queries.length} search queries:`, queries);
    
    if (queries.length === 0) {
      console.error('  ❌ No search queries generated');
      return false;
    }
    
    // Search using unified search (trackers + webshare)
    const { performUnifiedSearch } = await import('./unified-search');
    const results = await performUnifiedSearch(queries[0], 'tv', media.year, settings);
    
    if (results.length === 0) {
      console.log('  ⚠️ No results found');
      return false;
    }
    
    // Sort by match score and take the best one
    results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    const bestResult = results[0];
    
    console.log(`  ✅ Found best match: ${bestResult.title} (score: ${bestResult.matchScore})`);
    
    // Download it
    const downloadUrl = bestResult.downloadUrl;
    
    if (!downloadUrl) {
      console.error('  ❌ No download URL');
      return false;
    }
    
    // Create save path
    const safeName = media.title.replace(/[/\\?%*:|"<>]/g, '-');
    const seasonStr = episode.season.toString().padStart(2, '0');
    const savePath = `${settings.tvPath}/${safeName}/Season ${seasonStr}`;
    
    // Determine download type
    if (downloadUrl.startsWith('webshare:')) {
      // Webshare direct download
      const ident = downloadUrl.replace('webshare:', '');
      const { WebshareService } = await import('./webshare');
      const webshare = new WebshareService({
        username: settings.webshare.username,
        password: settings.webshare.password,
      });
      
      try {
        const downloadLink = await webshare.getDownloadLink(ident);
        
        if (!downloadLink) {
          console.error('  ❌ Failed to get Webshare download link');
          return false;
        }
        
        // Use HTTP downloader
        const { getHTTPDownloader } = await import('./download/http-downloader');
        const downloader = await getHTTPDownloader();
        
        const filename = `${bestResult.title}.${episode.season}x${episode.episode}.mkv`;
        await downloader.downloadFile(downloadLink, filename, episode.mediaId, savePath);
        
        console.log(`  ✅ Download started via Webshare: ${filename}`);
        return true;
      } catch (error: any) {
        console.error('  ❌ Webshare download failed:', error.message);
        return false;
      }
    } else {
      // Torrent download (sktorrent: or magnet:)
      const { getWebTorrentClient } = await import('./download/webtorrent-client');
      const client = await getWebTorrentClient();
      
      let torrentInput: string | Buffer = downloadUrl;
      
      // Handle sktorrent: URLs
      if (downloadUrl.startsWith('sktorrent:')) {
        const torrentUrl = downloadUrl.replace('sktorrent:', '');
        const { getTrackerManager } = await import('./trackers/tracker-manager');
        const manager = await getTrackerManager();
        const tracker = manager.getTracker('sktorrent');
        
        if (tracker) {
          try {
            const torrentBuffer = await (tracker as any).downloadTorrentFile(torrentUrl);
            torrentInput = torrentBuffer;
            console.log(`  ✅ Downloaded .torrent file (${torrentBuffer.length} bytes)`);
          } catch (error: any) {
            console.error('  ❌ Failed to download .torrent file:', error);
            return false;
          }
        }
      }
      
      const infoHash = await client.addTorrent(torrentInput, savePath, 'tvshows');
      console.log(`  ✅ Torrent added: ${infoHash}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('  ❌ Auto-download failed:', error);
    return false;
  }
}

/**
 * Start episode monitor (runs every hour)
 */
let monitorInterval: NodeJS.Timeout | null = null;

export function startEpisodeMonitor() {
  if (monitorInterval) {
    console.log('⚠️ Episode monitor already running');
    return;
  }
  
  console.log('📺 Starting episode monitor (checks every hour)');
  
  // Initial check
  checkNewEpisodes();
  
  // Check every hour
  monitorInterval = setInterval(() => {
    checkNewEpisodes();
  }, 60 * 60 * 1000); // 1 hour
}

export function stopEpisodeMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('⏹️ Episode monitor stopped');
  }
}
