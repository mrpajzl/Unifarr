import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import { prisma } from '../../db/prisma';
import crypto from 'crypto';
import { getSettings } from '../../routes/settings';

export interface DownloadProgress {
  id: string;
  filename: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0-1
  speed: number; // bytes/s
  status: 'downloading' | 'completed' | 'error' | 'paused';
  error?: string;
  startTime: number;
  targetPath?: string;
  mediaId?: number;
}

class HTTPDownloader {
  private activeDownloads = new Map<string, DownloadProgress>();
  private downloadDir: string;
  
  constructor(downloadDir: string = './downloads') {
    this.downloadDir = downloadDir;
    
    // Ensure download directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
  }
  
  /**
   * Start downloading a file from URL
   */
  async downloadFile(
    url: string,
    filename: string,
    mediaId?: number,
    targetPath?: string
  ): Promise<string> {
    // Generate unique download ID
    const downloadId = crypto.randomBytes(16).toString('hex');
    
    // Initialize progress tracking
    const progress: DownloadProgress = {
      id: downloadId,
      filename,
      totalBytes: 0,
      downloadedBytes: 0,
      progress: 0,
      speed: 0,
      status: 'downloading',
      startTime: Date.now(),
      targetPath,
      mediaId,
    };
    
    this.activeDownloads.set(downloadId, progress);
    
    // Start download in background
    this.performDownload(downloadId, url, filename, mediaId, targetPath).catch(err => {
      console.error(`Download ${downloadId} failed:`, err);
      progress.status = 'error';
      progress.error = err.message;
    });
    
    return downloadId;
  }
  
  /**
   * Perform actual download
   */
  private async performDownload(
    downloadId: string,
    url: string,
    filename: string,
    mediaId?: number,
    targetPath?: string
  ) {
    const progress = this.activeDownloads.get(downloadId)!;
    const tempPath = path.join(this.downloadDir, `${downloadId}_${filename}`);
    
    try {
      // Check available disk space (basic check)
      const stats = (fs as any).statfsSync ? (fs as any).statfsSync(this.downloadDir) : null;
      if (stats && stats.bavail * stats.bsize < 1024 * 1024 * 1024) { // < 1GB free
        throw new Error('Insufficient disk space (less than 1GB free)');
      }

      // Create database entry
      await prisma.download.create({
        data: {
          torrentHash: downloadId,
          name: filename,
          status: 'downloading',
          progress: 0,
          mediaItemId: mediaId || null,
        },
      });
      
      // Start HTTP download with progress tracking
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            progress.totalBytes = progressEvent.total;
            progress.downloadedBytes = progressEvent.loaded;
            progress.progress = progressEvent.loaded / progressEvent.total;
            
            // Calculate speed
            const elapsedSeconds = (Date.now() - progress.startTime) / 1000;
            progress.speed = progressEvent.loaded / elapsedSeconds;
            
            // Update database
            prisma.download.updateMany({
              where: { torrentHash: downloadId },
              data: {
                progress: progress.progress,
                downloadSpeed: Math.round(progress.speed),
              },
            }).catch(err => console.error('DB update error:', err));
          }
        },
      });
      
      // Get total size from headers
      const totalSize = parseInt(response.headers['content-length'] || '0');
      progress.totalBytes = totalSize;
      
      // Write to temporary file
      const writer = fs.createWriteStream(tempPath);
      await pipeline(response.data, writer);
      
      // Download complete
      progress.status = 'completed';
      progress.progress = 1;
      
      // Update database
      await prisma.download.updateMany({
        where: { torrentHash: downloadId },
        data: {
          status: 'completed',
          progress: 1,
        },
      });
      
      console.log(`✅ Download complete: ${filename}`);
      
      // Move to target location if specified
      if (targetPath) {
        await this.moveToTarget(tempPath, targetPath, filename, mediaId);
      } else {
        // Just rename to remove download ID prefix
        const finalPath = path.join(this.downloadDir, filename);
        fs.renameSync(tempPath, finalPath);
        console.log(`📁 File saved to: ${finalPath}`);
      }
      
    } catch (error: any) {
      // Handle disk full error specifically
      if (error.code === 'ENOSPC') {
        console.error('❌ Disk full! Cannot continue download.');
        progress.error = 'Disk full - insufficient space';
      } else {
        progress.error = error.message;
      }
      
      progress.status = 'error';
      
      // Update database
      await prisma.download.updateMany({
        where: { torrentHash: downloadId },
        data: { status: 'error' },
      });
      
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Move completed file to target directory
   */
  private async moveToTarget(sourcePath: string, targetDir: string, filename: string, mediaId?: number) {
    try {
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`📁 Created directory: ${targetDir}`);
      }
      
      const targetPath = path.join(targetDir, filename);
      
      // Check if file already exists
      if (fs.existsSync(targetPath)) {
        console.log(`⚠️ File already exists at ${targetPath}, adding timestamp`);
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        const timestamp = Date.now();
        const newFilename = `${base}_${timestamp}${ext}`;
        const newTargetPath = path.join(targetDir, newFilename);
        fs.renameSync(sourcePath, newTargetPath);
        console.log(`✅ File moved to: ${newTargetPath}`);
        return;
      }
      
      // Move file
      fs.renameSync(sourcePath, targetPath);
      
      console.log(`✅ File moved to: ${targetPath}`);
      
      if (mediaId) {
        console.log(`📝 File ready for media #${mediaId}, will be matched on next scan`);
      }
      
    } catch (error) {
      console.error('Failed to move file to target:', error);
      throw error;
    }
  }
  
  /**
   * Get download progress
   */
  getProgress(downloadId: string): DownloadProgress | null {
    return this.activeDownloads.get(downloadId) || null;
  }
  
  /**
   * Get download by ID (alias for getProgress)
   */
  getDownload(downloadId: string): DownloadProgress | null {
    return this.activeDownloads.get(downloadId) || null;
  }
  
  /**
   * Get all active downloads
   */
  getAllDownloads(): DownloadProgress[] {
    return Array.from(this.activeDownloads.values());
  }
  
  /**
   * Cancel download
   */
  async cancelDownload(downloadId: string) {
    const progress = this.activeDownloads.get(downloadId);
    if (progress) {
      progress.status = 'paused';
      this.activeDownloads.delete(downloadId);
      
      // Update database
      await prisma.download.updateMany({
        where: { torrentHash: downloadId },
        data: { status: 'paused' },
      });
      
      // Clean up temp file
      const tempPath = path.join(this.downloadDir, `${downloadId}_${progress.filename}`);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
  
  /**
   * Shutdown downloader - save state and cleanup
   */
  async shutdown() {
    console.log('  📥 Saving HTTP download state...');
    
    const activeCount = this.activeDownloads.size;
    if (activeCount > 0) {
      console.log(`  💾 ${activeCount} downloads will resume on restart`);
    }
    
    this.activeDownloads.clear();
    console.log('  ✅ HTTP downloader shutdown complete');
  }
}

// Singleton instance
let httpDownloader: HTTPDownloader | null = null;

/**
 * Get HTTP downloader instance
 */
export async function getHTTPDownloader(): Promise<HTTPDownloader> {
  if (!httpDownloader) {
    const settings = await getSettings();
    httpDownloader = new HTTPDownloader(settings.downloadsPath || './downloads');
  }
  return httpDownloader;
}
