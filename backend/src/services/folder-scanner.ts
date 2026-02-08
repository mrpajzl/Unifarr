import { readdir, stat } from 'fs/promises';
import path from 'path';
import { db } from '../db';
import { files, mediaItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import { parseMediaFolderName, parseMediaPath } from '../lib/parser';

export interface FolderScanResult {
  scanned: number;
  added: number;
  updated: number;
  errors: string[];
}

export class FolderScanner {
  private supportedVideoExtensions = [
    '.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.m4v', '.mpg', '.mpeg', '.m2ts', '.ts'
  ];
  
  /**
   * Check if file is a supported video file
   */
  private isVideoFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.supportedVideoExtensions.includes(ext);
  }
  
  /**
   * Get all video files in a directory (recursive)
   */
  private async getVideoFilesInDir(dirPath: string): Promise<string[]> {
    const videoFiles: string[] = [];
    
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recurse into subdirectories (for TV show seasons, etc.)
          const subFiles = await this.getVideoFilesInDir(fullPath);
          videoFiles.push(...subFiles);
        } else if (entry.isFile() && this.isVideoFile(entry.name)) {
          videoFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
    
    return videoFiles;
  }
  
  /**
   * Scan movies directory - each folder = one movie
   */
  async scanMovies(moviesPath: string): Promise<FolderScanResult> {
    const result: FolderScanResult = {
      scanned: 0,
      added: 0,
      updated: 0,
      errors: [],
    };
    
    try {
      const entries = await readdir(moviesPath, { withFileTypes: true });
      const scannedPaths = new Set<string>();
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue; // Skip hidden folders
        
        result.scanned++;
        
        try {
          const folderPath = path.join(moviesPath, entry.name);
          scannedPaths.add(folderPath);
          
          const videoFiles = await this.getVideoFilesInDir(folderPath);
          
          if (videoFiles.length === 0) {
            result.errors.push(`${entry.name}: No video files found`);
            continue;
          }
          
          // Parse folder name
          const parsed = parseMediaFolderName(entry.name);
          
          // Calculate total size
          let totalSize = 0;
          for (const file of videoFiles) {
            const stats = await stat(file);
            totalSize += Number(stats.size);
          }
          
          // Check if folder already exists in DB by path
          const existing = await db.query.files.findFirst({
            where: eq(files.path, folderPath),
          });
          
          if (existing) {
            // Update existing record (includes handling renamed folders)
            await db.update(files)
              .set({
                filename: entry.name, // Update folder name if changed
                parsedTitle: parsed.title,
                parsedYear: parsed.year,
                size: totalSize,
                parsedQuality: videoFiles.length > 0 ? this.extractQuality(videoFiles[0]) : undefined,
                scannedAt: new Date(),
              })
              .where(eq(files.id, existing.id));
            result.updated++;
          } else {
            // Insert new record
            await db.insert(files).values({
              path: folderPath,
              filename: entry.name,
              size: totalSize,
              parsedTitle: parsed.title,
              parsedYear: parsed.year,
              parsedQuality: videoFiles.length > 0 ? this.extractQuality(videoFiles[0]) : undefined,
              matched: false,
              scannedAt: new Date(),
            });
            result.added++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`${entry.name}: ${errorMsg}`);
        }
      }
      
      // Check for deleted/moved folders (paths in DB but not on disk)
      const allDbFiles = await db.query.files.findMany();
      for (const dbFile of allDbFiles) {
        if (dbFile.path.startsWith(moviesPath) && !scannedPaths.has(dbFile.path)) {
          console.log(`🗑️ Removing stale entry: ${dbFile.filename} (path no longer exists)`);
          await db.delete(files).where(eq(files.id, dbFile.id));
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Movies scan error: ${errorMsg}`);
    }
    
    return result;
  }
  
  /**
   * Scan TV shows directory - scan individual episode files
   */
  async scanTVShows(tvPath: string): Promise<FolderScanResult> {
    const result: FolderScanResult = {
      scanned: 0,
      added: 0,
      updated: 0,
      errors: [],
    };
    
    try {
      const entries = await readdir(tvPath, { withFileTypes: true });
      const scannedPaths = new Set<string>();
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue; // Skip hidden folders
        
        const showFolderPath = path.join(tvPath, entry.name);
        
        try {
          const videoFiles = await this.getVideoFilesInDir(showFolderPath);
          
          if (videoFiles.length === 0) {
            result.errors.push(`${entry.name}: No video files found`);
            continue;
          }
          
          // Parse folder name for show title
          const folderParsed = parseMediaFolderName(entry.name);
          
          // Scan each video file individually
          for (const videoFilePath of videoFiles) {
            result.scanned++;
            scannedPaths.add(videoFilePath);
            
            try {
              const filename = path.basename(videoFilePath);
              const fileParsed = parseMediaPath(videoFilePath);
              
              // Get file size
              const stats = await stat(videoFilePath);
              const fileSize = Number(stats.size);
              
              // Use parsed episode info if available, otherwise fall back to folder name
              const title = fileParsed.title || folderParsed.title;
              const year = fileParsed.year || folderParsed.year;
              
              // Check if file already exists in DB by path
              const existing = await db.query.files.findFirst({
                where: eq(files.path, videoFilePath),
              });
              
              if (existing) {
                // Update existing record
                await db.update(files)
                  .set({
                    filename: filename,
                    parsedTitle: title,
                    parsedYear: year,
                    parsedSeason: fileParsed.season,
                    parsedEpisode: fileParsed.episode,
                    parsedQuality: fileParsed.quality || this.extractQuality(filename),
                    parsedCodec: fileParsed.codec,
                    parsedSource: fileParsed.source,
                    size: fileSize,
                    scannedAt: new Date(),
                  })
                  .where(eq(files.id, existing.id));
                result.updated++;
              } else {
                // Insert new record
                await db.insert(files).values({
                  path: videoFilePath,
                  filename: filename,
                  size: fileSize,
                  parsedTitle: title,
                  parsedYear: year,
                  parsedSeason: fileParsed.season,
                  parsedEpisode: fileParsed.episode,
                  parsedQuality: fileParsed.quality || this.extractQuality(filename),
                  parsedCodec: fileParsed.codec,
                  parsedSource: fileParsed.source,
                  matched: false,
                  scannedAt: new Date(),
                });
                result.added++;
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              result.errors.push(`${path.basename(videoFilePath)}: ${errorMsg}`);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`${entry.name}: ${errorMsg}`);
        }
      }
      
      // Check for deleted/moved files (paths in DB but not on disk)
      const allDbFiles = await db.query.files.findMany();
      for (const dbFile of allDbFiles) {
        if (dbFile.path.startsWith(tvPath) && !scannedPaths.has(dbFile.path)) {
          console.log(`🗑️ Removing stale entry: ${dbFile.filename} (path no longer exists)`);
          await db.delete(files).where(eq(files.id, dbFile.id));
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`TV shows scan error: ${errorMsg}`);
    }
    
    return result;
  }
  
  /**
   * Extract quality from filename
   */
  private extractQuality(filename: string): string | undefined {
    const qualityPatterns = [
      /2160p|4K|UHD/i,
      /1080p|FHD/i,
      /720p|HD/i,
      /480p|SD/i,
    ];
    
    for (const pattern of qualityPatterns) {
      const match = filename.match(pattern);
      if (match) return match[0];
    }
    
    return undefined;
  }
}

// Export singleton
export const folderScanner = new FolderScanner();
