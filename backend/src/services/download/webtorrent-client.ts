import WebTorrent from 'webtorrent';
import path from 'path';
import { promises as fs } from 'fs';
import { EventEmitter } from 'events';

export interface TorrentInfo {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  downloaded: number;
  uploaded: number;
  size: number;
  peers: number;
  seeders: number;
  leechers: number;
  state: 'downloading' | 'seeding' | 'paused' | 'error';
  savePath: string;
  addedTime: number;
}

/**
 * WebTorrent Client - Embedded torrent client
 * No external process needed, runs directly in Node.js
 */
export class WebTorrentClient extends EventEmitter {
  private client: WebTorrent.Instance;
  private torrents: Map<string, WebTorrent.Torrent> = new Map();
  private torrentsDir: string;
  private downloadsDir: string;

  constructor(torrentsDir?: string, downloadsDir?: string) {
    super();
    this.client = new WebTorrent();
    this.torrentsDir = torrentsDir || path.join(process.cwd(), 'downloads', 'torrents');
    this.downloadsDir = downloadsDir || path.join(process.cwd(), 'downloads');
    
    this.client.on('error', (err) => {
      console.error('WebTorrent error:', err);
      this.emit('error', err);
    });
    
    // Ensure directories exist
    this.ensureDirectories();
  }
  
  private async ensureDirectories() {
    try {
      await fs.mkdir(this.torrentsDir, { recursive: true });
      await fs.mkdir(this.downloadsDir, { recursive: true });
      console.log(`📁 Torrent directories ready: ${this.torrentsDir}`);
    } catch (error) {
      console.error('Failed to create torrent directories:', error);
    }
  }

  /**
   * Add torrent (magnet link, .torrent file URL, or Buffer)
   * Downloads to temporary downloads/ folder, persists .torrent file
   */
  async addTorrent(
    magnetOrFileOrBuffer: string | Buffer,
    finalPath: string,
    category?: 'movies' | 'tvshows'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Always download to downloads/ folder first
      const tempDownloadPath = this.downloadsDir;
      
      let torrent: WebTorrent.Torrent;
      
      try {
        torrent = this.client.add(magnetOrFileOrBuffer, {
          path: tempDownloadPath,
        }, async (torrent) => {
        console.log(`✅ Torrent added: ${torrent.name}`);
        console.log(`   InfoHash: ${torrent.infoHash}`);
        console.log(`   Size: ${this.formatBytes(torrent.length)}`);
        console.log(`   Files: ${torrent.files.length}`);
        console.log(`   Download to: ${tempDownloadPath}`);
        console.log(`   Final path: ${finalPath}`);
        
        this.torrents.set(torrent.infoHash, torrent);
        
        // Save .torrent file for persistence
        try {
          await this.saveTorrentFile(torrent, finalPath, category);
        } catch (error) {
          console.error('Failed to save .torrent file:', error);
        }
        
        // Setup event listeners
        torrent.on('download', () => {
          this.emit('progress', torrent.infoHash, torrent.progress);
        });
        
        torrent.on('done', async () => {
          console.log(`✅ Download complete: ${torrent.name}`);
          
          // Copy files to final destination (keep original for seeding)
          try {
            await this.copyTorrentFiles(torrent, finalPath);
            console.log(`📁 Copied to: ${finalPath}`);
          } catch (error) {
            console.error('Failed to copy files:', error);
          }
          
          // Emit completion event
          this.emit('complete', torrent.infoHash, torrent.name, finalPath, category);
          
          // Start monitoring seed ratio
          this.startRatioMonitoring(torrent.infoHash);
        });
        
        torrent.on('error', (err) => {
          console.error(`❌ Torrent error (${torrent.name}):`, err);
          this.emit('torrent-error', torrent.infoHash, err);
        });
        
        resolve(torrent.infoHash);
      });
      
        // Add error handler immediately after adding torrent
        torrent.on('error', (err) => {
          console.error('Failed to add torrent:', err);
          reject(err);
        });
      } catch (error) {
        console.error('Exception while adding torrent:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Copy torrent files to final destination
   */
  private async copyTorrentFiles(torrent: WebTorrent.Torrent, finalPath: string): Promise<void> {
    const { promises: fs } = await import('fs');
    const pathModule = await import('path');
    
    try {
      // Ensure final directory exists
      await fs.mkdir(finalPath, { recursive: true });
      
      // Copy all files
      for (const file of torrent.files) {
        const sourcePath = file.path;
        const fileName = pathModule.basename(file.path);
        const destPath = pathModule.join(finalPath, fileName);
        
        console.log(`  📄 Copying: ${fileName}`);
        
        // Use stream copy for large files
        const readStream = file.createReadStream();
        const writeStream = (await import('fs')).createWriteStream(destPath);
        
        await new Promise((resolve, reject) => {
          readStream.pipe(writeStream);
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
          readStream.on('error', reject);
        });
      }
      
      console.log(`✅ Copied ${torrent.files.length} file(s) to ${finalPath}`);
    } catch (error) {
      console.error('Copy failed:', error);
      throw error;
    }
  }
  
  /**
   * Start monitoring seed ratio for auto-cleanup
   */
  private startRatioMonitoring(infoHash: string): void {
    const checkInterval = setInterval(async () => {
      const torrent = this.torrents.get(infoHash);
      if (!torrent) {
        clearInterval(checkInterval);
        return;
      }
      
      // Calculate ratio
      const ratio = torrent.uploaded / torrent.downloaded;
      
      // Get settings (default ratio: 2.0)
      const { getSettings } = await import('../../routes/settings');
      const settings = await getSettings();
      const targetRatio = settings.torrents?.seedRatio || 2.0;
      const maxSeedTimeHours = settings.torrents?.seedTimeHours || 168;
      
      // Calculate seed time
      const seedTimeMs = Date.now() - ((torrent as any).created || 0);
      const seedTimeHours = seedTimeMs / (1000 * 60 * 60);
      
      // Check if we should stop seeding
      if (ratio >= targetRatio || seedTimeHours >= maxSeedTimeHours) {
        console.log(`🌱 Seed target reached for ${torrent.name}:`);
        console.log(`   Ratio: ${ratio.toFixed(2)} (target: ${targetRatio})`);
        console.log(`   Time: ${seedTimeHours.toFixed(1)}h (max: ${maxSeedTimeHours}h)`);
        
        clearInterval(checkInterval);
        
        // Remove torrent and delete files from downloads/
        try {
          await this.removeTorrent(infoHash, true);
          console.log(`🗑️ Cleaned up: ${torrent.name}`);
        } catch (error) {
          console.error('Failed to cleanup torrent:', error);
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Save .torrent file to disk with metadata
   */
  private async saveTorrentFile(
    torrent: WebTorrent.Torrent,
    finalPath: string,
    category?: string
  ): Promise<void> {
    const torrentFilePath = path.join(this.torrentsDir, `${torrent.infoHash}.torrent`);
    const metadataPath = path.join(this.torrentsDir, `${torrent.infoHash}.json`);
    
    try {
      // Save .torrent file
      const torrentFile = (torrent as any).torrentFile;
      if (torrentFile) {
        await fs.writeFile(torrentFilePath, torrentFile);
      }
      
      // Save metadata (final destination, category, etc.)
      const metadata = {
        infoHash: torrent.infoHash,
        name: torrent.name,
        finalPath,
        category,
        addedTime: Date.now(),
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(`💾 Saved torrent file: ${torrentFilePath}`);
    } catch (error) {
      console.error('Failed to save torrent file:', error);
    }
  }

  /**
   * Get all torrents
   */
  getTorrents(): TorrentInfo[] {
    return Array.from(this.torrents.values()).map(torrent => this.getTorrentInfo(torrent));
  }

  /**
   * Get torrent by info hash
   */
  getTorrent(infoHash: string): TorrentInfo | null {
    const torrent = this.torrents.get(infoHash);
    if (!torrent) return null;
    return this.getTorrentInfo(torrent);
  }

  /**
   * Remove torrent
   */
  async removeTorrent(infoHash: string, deleteFiles: boolean = false): Promise<void> {
    const torrent = this.torrents.get(infoHash);
    if (!torrent) {
      throw new Error(`Torrent not found: ${infoHash}`);
    }

    return new Promise((resolve, reject) => {
      torrent.destroy({ destroyStore: deleteFiles }, async (err) => {
        if (err) {
          reject(err);
        } else {
          this.torrents.delete(infoHash);
          console.log(`🗑️ Torrent removed: ${torrent.name}`);
          
          // Remove persisted .torrent file
          await this.removeTorrentFile(infoHash);
          
          resolve();
        }
      });
    });
  }

  /**
   * Pause torrent
   */
  pauseTorrent(infoHash: string): void {
    const torrent = this.torrents.get(infoHash);
    if (!torrent) {
      throw new Error(`Torrent not found: ${infoHash}`);
    }
    torrent.pause();
    console.log(`⏸️ Torrent paused: ${torrent.name}`);
  }

  /**
   * Resume torrent
   */
  resumeTorrent(infoHash: string): void {
    const torrent = this.torrents.get(infoHash);
    if (!torrent) {
      throw new Error(`Torrent not found: ${infoHash}`);
    }
    torrent.resume();
    console.log(`▶️ Torrent resumed: ${torrent.name}`);
  }

  /**
   * Get download statistics
   */
  getStats() {
    const torrents = this.getTorrents();
    const active = torrents.filter(t => t.state === 'downloading' || t.state === 'seeding');
    
    return {
      totalDownloadSpeed: torrents.reduce((sum, t) => sum + t.downloadSpeed, 0),
      totalUploadSpeed: torrents.reduce((sum, t) => sum + t.uploadSpeed, 0),
      activeTorrents: active.length,
      totalTorrents: torrents.length,
    };
  }

  /**
   * Load persisted torrents on startup
   */
  async loadPersistedTorrents(): Promise<void> {
    try {
      const files = await fs.readdir(this.torrentsDir);
      const torrentFiles = files.filter(f => f.endsWith('.torrent'));
      
      if (torrentFiles.length === 0) {
        console.log(`📦 No persisted torrents to load`);
        return;
      }
      
      console.log(`🔄 Loading ${torrentFiles.length} persisted torrents...`);
      
      let loaded = 0;
      let failed = 0;
      
      for (const file of torrentFiles) {
        const infoHash = path.basename(file, '.torrent');
        const torrentPath = path.join(this.torrentsDir, file);
        const metadataPath = path.join(this.torrentsDir, `${infoHash}.json`);
        
        try {
          // Load metadata
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          const metadata = JSON.parse(metadataContent);
          
          // Load .torrent file
          const torrentBuffer = await fs.readFile(torrentPath);
          
          // Re-add torrent with a small delay to prevent overload
          await this.addTorrent(torrentBuffer, metadata.finalPath, metadata.category);
          console.log(`  ✅ Restored: ${metadata.name}`);
          loaded++;
          
          // Small delay between torrents to prevent crashes
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // If torrent is complete, start ratio monitoring
          const restoredTorrent = this.torrents.get(infoHash);
          if (restoredTorrent && restoredTorrent.done) {
            this.startRatioMonitoring(infoHash);
            console.log(`  🌱 Seeding (ratio monitoring started)`);
          }
        } catch (error: any) {
          console.error(`  ❌ Failed to restore ${file}:`, error.message || error);
          failed++;
          
          // Delete corrupted torrent files to prevent future crashes
          try {
            await fs.unlink(torrentPath).catch(() => {});
            await fs.unlink(metadataPath).catch(() => {});
            console.log(`  🗑️ Removed corrupted torrent files: ${file}`);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
      
      console.log(`✅ Loaded ${loaded} torrents (${failed} failed)`);
    } catch (error) {
      console.error('Failed to load persisted torrents:', error);
    }
  }
  
  /**
   * Remove torrent file from disk
   */
  async removeTorrentFile(infoHash: string): Promise<void> {
    try {
      const torrentPath = path.join(this.torrentsDir, `${infoHash}.torrent`);
      const metadataPath = path.join(this.torrentsDir, `${infoHash}.json`);
      
      await fs.unlink(torrentPath).catch(() => {});
      await fs.unlink(metadataPath).catch(() => {});
      
      console.log(`🗑️ Removed torrent file: ${infoHash}`);
    } catch (error) {
      console.error('Failed to remove torrent file:', error);
    }
  }
  
  /**
   * Shutdown client
   */
  async destroy(): Promise<void> {
    return new Promise((resolve) => {
      this.client.destroy((err) => {
        if (err) console.error('Error destroying WebTorrent client:', err);
        console.log('🛑 WebTorrent client stopped');
        resolve();
      });
    });
  }

  /**
   * Convert torrent to TorrentInfo
   */
  private getTorrentInfo(torrent: WebTorrent.Torrent): TorrentInfo {
    let state: TorrentInfo['state'] = 'downloading';
    if (torrent.done) {
      state = 'seeding';
    } else if (torrent.paused) {
      state = 'paused';
    }

    // Count seeders and leechers
    // Seeders = peers we're actively downloading from (they have pieces we need)
    // Leechers = other connected peers
    let seeders = 0;
    let leechers = 0;
    
    if (torrent.wires && torrent.wires.length > 0) {
      torrent.wires.forEach((wire: any) => {
        // If we're interested in this peer and they're not choking us,
        // they're likely a seeder (have pieces we want)
        if (wire.amInterested && !wire.peerChoking) {
          seeders++;
        } else {
          leechers++;
        }
      });
    }
    
    // Note: This is an approximation. True seeder/leecher counts
    // would require tracker scrape data, which WebTorrent doesn't expose directly.

    return {
      infoHash: torrent.infoHash,
      name: torrent.name || 'Unknown',
      progress: torrent.progress,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed,
      downloaded: torrent.downloaded,
      uploaded: torrent.uploaded,
      size: torrent.length,
      peers: torrent.numPeers,
      seeders,
      leechers,
      state,
      savePath: torrent.path || '',
      addedTime: (torrent as any).created || Date.now(),
    };
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Global singleton instance
let instance: WebTorrentClient | null = null;

export function getWebTorrentClient(): WebTorrentClient {
  if (!instance) {
    instance = new WebTorrentClient();
    
    // Load persisted torrents asynchronously (don't block)
    instance.loadPersistedTorrents().catch(err => {
      console.error('Failed to load persisted torrents:', err);
    });
    
    // Cleanup on process exit
    process.on('SIGINT', async () => {
      if (instance) await instance.destroy();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      if (instance) await instance.destroy();
      process.exit(0);
    });
  }
  return instance;
}
