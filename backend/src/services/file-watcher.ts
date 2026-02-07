import chokidar from 'chokidar';
import { folderScanner } from './folder-scanner';
import { autoMatchFolder } from './auto-matcher';
import { db } from '../db';
import { files } from '../db/schema';
import { eq } from 'drizzle-orm';

interface WatcherConfig {
  moviesPath?: string;
  tvShowsPath?: string;
}

let watcher: chokidar.FSWatcher | null = null;
let scanTimeout: NodeJS.Timeout | null = null;

/**
 * Debounced scan - wait for file operations to complete
 */
const debouncedScan = (path: string, type: 'movies' | 'tv') => {
  if (scanTimeout) {
    clearTimeout(scanTimeout);
  }
  
  scanTimeout = setTimeout(async () => {
    console.log(`🔄 Auto-scanning ${type} folder: ${path}`);
    
    try {
      let result;
      if (type === 'movies') {
        result = await folderScanner.scanMovies(path);
      } else {
        result = await folderScanner.scanTVShows(path);
      }
      
      console.log(`✅ Auto-scan complete: ${result.added} added, ${result.updated} updated`);
      
      // Auto-match new files
      if (result.added > 0) {
        console.log('🎯 Auto-matching new files...');
        const unmatched = await db.query.files.findMany({
          where: eq(files.matched, 0),
        });
        
        let matched = 0;
        for (const file of unmatched.slice(0, 10)) { // Limit to prevent spam
          const success = await autoMatchFolder(file.id);
          if (success) matched++;
          await new Promise(resolve => setTimeout(resolve, 250)); // Rate limit
        }
        
        if (matched > 0) {
          console.log(`✅ Auto-matched ${matched} new files`);
        }
      }
    } catch (error) {
      console.error('Auto-scan error:', error);
    }
  }, 5000); // Wait 5 seconds after last change
};

/**
 * Start watching media folders for changes
 */
export function startFileWatcher(config: WatcherConfig) {
  // Stop existing watcher
  if (watcher) {
    watcher.close();
  }
  
  const pathsToWatch: string[] = [];
  
  if (config.moviesPath) {
    pathsToWatch.push(config.moviesPath);
  }
  
  if (config.tvShowsPath) {
    pathsToWatch.push(config.tvShowsPath);
  }
  
  if (pathsToWatch.length === 0) {
    console.log('⚠️ No media paths configured for file watching');
    return;
  }
  
  console.log(`👁️ Starting file watcher for: ${pathsToWatch.join(', ')}`);
  
  watcher = chokidar.watch(pathsToWatch, {
    ignored: /(^|[\/\\])\../, // Ignore hidden files
    persistent: true,
    ignoreInitial: true, // Don't trigger on startup
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    },
    depth: 3, // Watch up to 3 levels deep
  });
  
  // File/folder added
  watcher.on('add', (path) => {
    console.log(`📁 File added: ${path}`);
    
    const isMovies = config.moviesPath && path.startsWith(config.moviesPath);
    const isTvShows = config.tvShowsPath && path.startsWith(config.tvShowsPath);
    
    if (isMovies) {
      debouncedScan(config.moviesPath!, 'movies');
    } else if (isTvShows) {
      debouncedScan(config.tvShowsPath!, 'tv');
    }
  });
  
  // File/folder added (directory)
  watcher.on('addDir', (path) => {
    console.log(`📂 Folder added: ${path}`);
    
    const isMovies = config.moviesPath && path.startsWith(config.moviesPath);
    const isTvShows = config.tvShowsPath && path.startsWith(config.tvShowsPath);
    
    if (isMovies && path !== config.moviesPath) {
      debouncedScan(config.moviesPath!, 'movies');
    } else if (isTvShows && path !== config.tvShowsPath) {
      debouncedScan(config.tvShowsPath!, 'tv');
    }
  });
  
  // File/folder deleted
  watcher.on('unlink', (path) => {
    console.log(`🗑️ File deleted: ${path}`);
    removeDeletedFile(path);
  });
  
  watcher.on('unlinkDir', (path) => {
    console.log(`🗑️ Folder deleted: ${path}`);
    removeDeletedFile(path);
  });
  
  watcher.on('error', (error) => {
    console.error('File watcher error:', error);
  });
  
  console.log('✅ File watcher started');
}

/**
 * Remove deleted files from database
 */
async function removeDeletedFile(path: string) {
  try {
    // Find and delete file record
    const file = await db.query.files.findFirst({
      where: eq(files.path, path),
    });
    
    if (file) {
      await db.delete(files).where(eq(files.id, file.id));
      console.log(`🗑️ Removed from database: ${path}`);
    }
  } catch (error) {
    console.error('Error removing deleted file:', error);
  }
}

/**
 * Stop file watcher
 */
export function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('⏹️ File watcher stopped');
  }
  
  if (scanTimeout) {
    clearTimeout(scanTimeout);
    scanTimeout = null;
  }
}

/**
 * Get watcher status
 */
export function getWatcherStatus() {
  return {
    running: watcher !== null,
    watching: watcher?.getWatched() || {},
  };
}
