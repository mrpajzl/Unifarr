import { readdir, stat } from 'fs/promises';
import path from 'path';
import { prisma } from '../db/prisma';
import { parseMediaFolderName, parseMediaPath } from '../lib/parser';
import { getTMDBService } from '../routes/settings';

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
  
  private isVideoFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.supportedVideoExtensions.includes(ext);
  }
  
  private async getVideoFilesInDir(dirPath: string): Promise<string[]> {
    const videoFiles: string[] = [];
    
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
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
        if (entry.name.startsWith('.')) continue;
        
        result.scanned++;
        
        try {
          const folderPath = path.join(moviesPath, entry.name);
          scannedPaths.add(folderPath);
          
          const videoFiles = await this.getVideoFilesInDir(folderPath);
          const parsed = parseMediaFolderName(entry.name);
          
          if (videoFiles.length === 0) {
            console.log(`⚠️ Empty folder (skipping): ${entry.name}`);
            continue;
          }
          
          let mediaItem = await prisma.media.findFirst({
            where: { libraryPath: folderPath },
          });
          
          if (!mediaItem) {
            mediaItem = await prisma.media.create({
              data: {
                type: 'movie',
                title: parsed.title,
                year: parsed.year,
                libraryPath: folderPath,
                monitored: false,
              },
            });
            result.added++;
            console.log(`✨ Created movie: ${parsed.title}`);
            
            await this.autoIdentifyMovie(mediaItem, parsed.title, parsed.year);
          } else if (!mediaItem.tmdbId) {
            await this.autoIdentifyMovie(mediaItem, parsed.title, parsed.year);
            result.updated++;
          } else {
            result.updated++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`${entry.name}: ${errorMsg}`);
        }
      }
      
      // Check for deleted/moved folders
      const allDbFiles = await prisma.file.findMany();
      for (const dbFile of allDbFiles) {
        if (dbFile.path.startsWith(moviesPath) && !scannedPaths.has(dbFile.path)) {
          console.log(`🗑️ Removing stale entry: ${dbFile.filename}`);
          await prisma.file.delete({ where: { id: dbFile.id } });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Movies scan error: ${errorMsg}`);
    }
    
    return result;
  }
  
  /**
   * Scan TV shows directory - folder-based approach
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
        if (entry.name.startsWith('.')) continue;
        
        const showFolderPath = path.join(tvPath, entry.name);
        
        try {
          const videoFiles = await this.getVideoFilesInDir(showFolderPath);
          const folderParsed = parseMediaFolderName(entry.name);
          
          let mediaItem = await prisma.media.findFirst({
            where: { libraryPath: showFolderPath },
          });
          
          if (!mediaItem) {
            mediaItem = await prisma.media.create({
              data: {
                type: 'tv',
                title: folderParsed.title,
                year: folderParsed.year,
                libraryPath: showFolderPath,
                monitored: false,
              },
            });
            result.added++;
            console.log(`✨ Created TV show: ${folderParsed.title}`);
            
            await this.autoIdentifyShow(mediaItem, folderParsed.title, folderParsed.year);
          } else if (!mediaItem.tmdbId) {
            await this.autoIdentifyShow(mediaItem, folderParsed.title, folderParsed.year);
          }
          
          if (videoFiles.length === 0) {
            console.log(`⚠️ TV show has no episodes yet: ${entry.name}`);
            continue;
          }
          
          for (const videoFilePath of videoFiles) {
            result.scanned++;
            scannedPaths.add(videoFilePath);
            
            try {
              const filename = path.basename(videoFilePath);
              const fileParsed = parseMediaPath(videoFilePath);
              
              const stats = await stat(videoFilePath);
              const fileSize = BigInt(stats.size);
              
              const title = folderParsed.title;
              const year = folderParsed.year;
              
              const existing = await prisma.file.findFirst({
                where: { path: videoFilePath },
              });
              
              if (existing) {
                await prisma.file.update({
                  where: { id: existing.id },
                  data: {
                    filename,
                    parsedTitle: title,
                    parsedYear: year,
                    parsedSeason: fileParsed.season,
                    parsedEpisode: fileParsed.episode,
                    parsedQuality: fileParsed.quality || this.extractQuality(filename),
                    parsedCodec: fileParsed.codec,
                    parsedSource: fileParsed.source,
                    mediaItemId: mediaItem.id,
                    matched: true,
                    size: fileSize,
                    scannedAt: new Date(),
                  },
                });
                result.updated++;
              } else {
                await prisma.file.create({
                  data: {
                    path: videoFilePath,
                    filename,
                    size: fileSize,
                    parsedTitle: title,
                    parsedYear: year,
                    parsedSeason: fileParsed.season,
                    parsedEpisode: fileParsed.episode,
                    parsedQuality: fileParsed.quality || this.extractQuality(filename),
                    parsedCodec: fileParsed.codec,
                    parsedSource: fileParsed.source,
                    mediaItemId: mediaItem.id,
                    matched: true,
                    scannedAt: new Date(),
                  },
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
      
      // Check for deleted/moved files
      const allDbFiles = await prisma.file.findMany();
      for (const dbFile of allDbFiles) {
        if (dbFile.path.startsWith(tvPath) && !scannedPaths.has(dbFile.path)) {
          console.log(`🗑️ Removing stale entry: ${dbFile.filename}`);
          await prisma.file.delete({ where: { id: dbFile.id } });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`TV shows scan error: ${errorMsg}`);
    }
    
    return result;
  }
  
  private async autoIdentifyShow(mediaItem: any, title: string, year?: number): Promise<void> {
    if (mediaItem.tmdbId) return;
    
    try {
      const tmdb = await getTMDBService();
      if (!tmdb) return;
      
      const searchResults = await tmdb.searchTVShows(title, year);
      
      if (searchResults.length === 0) {
        console.log(`   ⚠️ No TMDB results for "${title}"`);
        return;
      }
      
      const firstResult = searchResults[0];
      const yearMatch = !year || !firstResult.year || firstResult.year === year;
      
      if (yearMatch) {
        const existingShow = await prisma.media.findFirst({
          where: { tmdbId: firstResult.id },
        });
        
        if (existingShow) {
          console.log(`   ⚠️ TMDB ID ${firstResult.id} already used by "${existingShow.title}" - skipping`);
          return;
        }
        
        console.log(`   🎬 Auto-matched to TMDB: "${firstResult.name}" (${firstResult.year})`);
        
        await prisma.media.update({
          where: { id: mediaItem.id },
          data: {
            tmdbId: firstResult.id,
            title: firstResult.name,
            year: firstResult.year,
            overview: firstResult.overview,
            posterPath: firstResult.poster_path,
            backdropPath: firstResult.backdrop_path,
            voteAverage: firstResult.vote_average,
          },
        });
      } else {
        console.log(`   ⚠️ Year mismatch for "${title}" (${year} vs ${firstResult.year}) - skipping`);
      }
    } catch (error: any) {
      console.error(`   ❌ Auto-identify failed for "${title}":`, error.message);
    }
  }
  
  private async autoIdentifyMovie(mediaItem: any, title: string, year?: number): Promise<void> {
    if (mediaItem.tmdbId) return;
    
    try {
      const tmdb = await getTMDBService();
      if (!tmdb) return;
      
      const searchResults = await tmdb.searchMovies(title, year);
      
      if (searchResults.length === 0) {
        console.log(`   ⚠️ No TMDB results for "${title}"`);
        return;
      }
      
      const firstResult = searchResults[0];
      const yearMatch = !year || !firstResult.year || firstResult.year === year;
      
      if (yearMatch) {
        const existingMovie = await prisma.media.findFirst({
          where: { tmdbId: firstResult.id },
        });
        
        if (existingMovie) {
          console.log(`   ⚠️ TMDB ID ${firstResult.id} already used by "${existingMovie.title}" - skipping`);
          return;
        }
        
        console.log(`   🎬 Auto-matched to TMDB: "${firstResult.title}" (${firstResult.year})`);
        
        await prisma.media.update({
          where: { id: mediaItem.id },
          data: {
            tmdbId: firstResult.id,
            title: firstResult.title,
            year: firstResult.year,
            overview: firstResult.overview,
            posterPath: firstResult.poster_path,
            backdropPath: firstResult.backdrop_path,
            voteAverage: firstResult.vote_average,
            runtime: firstResult.runtime,
          },
        });
      } else {
        console.log(`   ⚠️ Year mismatch for "${title}" (${year} vs ${firstResult.year}) - skipping`);
      }
    } catch (error: any) {
      console.error(`   ❌ Auto-identify failed for "${title}":`, error.message);
    }
  }
  
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

export const folderScanner = new FolderScanner();
