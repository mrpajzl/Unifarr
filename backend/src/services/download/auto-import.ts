import { getWebTorrentClient } from './webtorrent-client';
import { getHTTPDownloader } from './http-downloader';
import { scanLibrary } from '../scanner';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { parseMediaPath } from '../../lib/parser';

const MOVIES_PATH = process.env.MOVIES_PATH || '/data/movies';
const TVSHOWS_PATH = process.env.TVSHOWS_PATH || '/data/tvshows';

/**
 * Check for completed downloads and import them
 */
export async function checkCompletedDownloads() {
  try {
    // Check WebTorrent downloads
    const torrentClient = await getWebTorrentClient();
    const torrents = torrentClient.getTorrents();

    for (const torrent of torrents) {
      // Check if completed (seeding state means it's done downloading)
      if (torrent.state === 'seeding' && torrent.progress >= 1.0) {
        await processCompletedTorrent(torrent);
      }
    }

    // Check HTTP downloads
    const httpDownloader = await getHTTPDownloader();
    const httpDownloads = httpDownloader.getAllDownloads();

    for (const download of httpDownloads) {
      if (download.status === 'completed' && download.targetPath) {
        console.log(`✅ HTTP download completed: ${download.filename} at ${download.targetPath}`);
        // HTTP downloads are already placed in target location by http-downloader
        // Just trigger a library scan
        await scanLibrary();
      }
    }
  } catch (error) {
    console.error('Check completed downloads error:', error);
  }
}

/**
 * Process a completed torrent
 */
async function processCompletedTorrent(torrent: any) {
  try {
    console.log(`✅ Torrent completed: ${torrent.name} at ${torrent.savePath}`);
    
    // Files are already in savePath, just trigger library scan
    await scanLibrary();

  } catch (error) {
    console.error(`Error processing torrent ${torrent.infoHash}:`, error);
  }
}

interface DestinationInfo {
  type: 'movie' | 'tv';
  basePath: string;
  showTitle?: string; // For TV shows
  movieFolder?: string; // For movies
}

/**
 * Determine where files should go based on media type
 */
async function determineDestinationPath(torrent: any, mediaItem: any | null): Promise<DestinationInfo | null> {
  // If we have media item info, use that
  if (mediaItem) {
    if (mediaItem.type === 'movie') {
      const folderName = `${mediaItem.title} (${mediaItem.year || 'Unknown'})`;
      return {
        type: 'movie',
        basePath: MOVIES_PATH,
        movieFolder: folderName,
      };
    } else {
      return {
        type: 'tv',
        basePath: TVSHOWS_PATH,
        showTitle: mediaItem.title,
      };
    }
  }

  // Fallback: Try to detect from filename
  const name = torrent.name;
  const parsed = parseMediaPath(name);
  
  if (parsed.type === 'tv') {
    return {
      type: 'tv',
      basePath: TVSHOWS_PATH,
      showTitle: parsed.title,
    };
  } else if (parsed.type === 'movie') {
    const folderName = `${parsed.title} (${parsed.year || 'Unknown'})`;
    return {
      type: 'movie',
      basePath: MOVIES_PATH,
      movieFolder: folderName,
    };
  }

  return {
    type: 'movie',
    basePath: MOVIES_PATH,
    movieFolder: basename(name),
  };
}

/**
 * Move/copy torrent files to library
 */
async function importTorrentFiles(sourcePath: string, torrentName: string, destInfo: DestinationInfo) {
  const fullSourcePath = join(sourcePath, torrentName);

  try {
    const sourceStats = await fs.stat(fullSourcePath);

    if (destInfo.type === 'movie') {
      const destPath = join(destInfo.basePath, destInfo.movieFolder!);
      await fs.mkdir(destPath, { recursive: true });

      if (sourceStats.isDirectory()) {
        await copyDirectory(fullSourcePath, destPath);
      } else {
        const destFile = join(destPath, basename(fullSourcePath));
        await fs.copyFile(fullSourcePath, destFile);
      }

      console.log(`✅ Copied movie to ${destPath}`);
    } else {
      const showBasePath = join(destInfo.basePath, destInfo.showTitle!);
      await fs.mkdir(showBasePath, { recursive: true });

      if (sourceStats.isDirectory()) {
        await copyTVShowDirectory(fullSourcePath, showBasePath);
      } else {
        await copyTVShowFile(fullSourcePath, showBasePath);
      }

      console.log(`✅ Copied TV show to ${showBasePath}`);
    }
  } catch (error) {
    console.error(`Failed to import files: ${error}`);
    throw error;
  }
}

/**
 * Recursively copy directory (for movies)
 */
async function copyDirectory(source: string, dest: string) {
  await fs.mkdir(dest, { recursive: true });
  
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(source, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      const ext = entry.name.toLowerCase().split('.').pop();
      const videoExts = ['mkv', 'mp4', 'avi', 'mov', 'm4v', 'webm'];
      const subtitleExts = ['srt', 'sub', 'ass', 'ssa', 'vtt'];
      
      if (videoExts.includes(ext!) || subtitleExts.includes(ext!)) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

/**
 * Copy TV show file to correct Season folder
 */
async function copyTVShowFile(sourceFile: string, showBasePath: string) {
  const filename = basename(sourceFile);
  const parsed = parseMediaPath(sourceFile);
  
  const seasonNum = parsed.season || 1;
  const seasonFolder = `Season ${String(seasonNum).padStart(2, '0')}`;
  const destPath = join(showBasePath, seasonFolder);
  
  await fs.mkdir(destPath, { recursive: true });
  
  const destFile = join(destPath, filename);
  await fs.copyFile(sourceFile, destFile);
  
  console.log(`  📁 ${seasonFolder}/${filename}`);
}

/**
 * Recursively copy TV show directory, organizing by seasons
 */
async function copyTVShowDirectory(source: string, showBasePath: string) {
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(source, entry.name);

    if (entry.isDirectory()) {
      await copyTVShowDirectory(srcPath, showBasePath);
    } else {
      const ext = entry.name.toLowerCase().split('.').pop();
      const videoExts = ['mkv', 'mp4', 'avi', 'mov', 'm4v', 'webm'];
      const subtitleExts = ['srt', 'sub', 'ass', 'ssa', 'vtt'];
      
      if (videoExts.includes(ext!) || subtitleExts.includes(ext!)) {
        await copyTVShowFile(srcPath, showBasePath);
      }
    }
  }
}

let importInterval: NodeJS.Timeout | null = null;

/**
 * Start auto-import watcher
 * Checks every 5 minutes for completed downloads
 */
export function startAutoImport() {
  if (importInterval) {
    console.log('⚠️ Auto-import already running');
    return;
  }

  const INTERVAL = 5 * 60 * 1000; // 5 minutes

  console.log('🔄 Auto-import service started (checking every 5 minutes)');

  checkCompletedDownloads();

  importInterval = setInterval(() => {
    checkCompletedDownloads();
  }, INTERVAL);
}

/**
 * Stop auto-import watcher
 */
export function stopAutoImport() {
  if (importInterval) {
    clearInterval(importInterval);
    importInterval = null;
    console.log('⏹️ Auto-import service stopped');
  }
}

/**
 * Manual trigger for testing
 */
export async function triggerImport() {
  console.log('🔄 Manually triggering import check...');
  await checkCompletedDownloads();
}
