import { glob } from 'glob';
import { stat, readdir } from 'fs/promises';
import { parseMediaPath, parseMediaFolderName } from '../lib/parser';
import { prisma } from '../db/prisma';

export interface ScanResult {
  scanned: number;
  added: number;
  updated: number;
  errors: string[];
  tvShows?: number;
}

export class LibraryScanner {
  private supportedExtensions = [
    '.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.m4v', '.mpg', '.mpeg', '.m2ts', '.ts'
  ];
  
  /**
   * Scan TV shows directory - folder-based approach
   * Each top-level folder = one TV show
   */
  async scanTVShows(tvPath: string): Promise<ScanResult> {
    const result: ScanResult = {
      scanned: 0,
      added: 0,
      updated: 0,
      errors: [],
      tvShows: 0,
    };
    
    try {
      const entries = await readdir(tvPath, { withFileTypes: true });
      const showFolders = entries.filter(e => e.isDirectory());
      
      for (const showFolder of showFolders) {
        const showPath = `${tvPath}/${showFolder.name}`;
        const parsed = parseMediaFolderName(showFolder.name);
        
        try {
          // Find or create mediaItem for this TV show
          let mediaItem = await prisma.media.findFirst({
            where: {
              type: 'tv',
              libraryPath: showPath,
            },
          });
          
          if (!mediaItem) {
            mediaItem = await prisma.media.create({
              data: {
                type: 'tv',
                title: parsed.title,
                year: parsed.year,
                libraryPath: showPath,
                monitored: false,
              },
            });
            result.tvShows!++;
          }
          
          // Now scan all episodes in this show folder
          const pattern = `${showPath}/**/*{${this.supportedExtensions.join(',')}}`;
          const filePaths = await glob(pattern, { nodir: true, absolute: true });
          
          for (const filePath of filePaths) {
            result.scanned++;
            
            try {
              const fileStats = await stat(filePath);
              const parsedFile = parseMediaPath(filePath);
              
              const existing = await prisma.file.findFirst({
                where: { path: filePath },
              });
              
              if (existing) {
                await prisma.file.update({
                  where: { id: existing.id },
                  data: {
                    parsedTitle: parsed.title,
                    parsedYear: parsed.year,
                    parsedSeason: parsedFile.season,
                    parsedEpisode: parsedFile.episode,
                    parsedQuality: parsedFile.quality,
                    parsedEdition: parsedFile.edition,
                    parsedCodec: parsedFile.codec,
                    parsedSource: parsedFile.source,
                    mediaItemId: mediaItem.id,
                    size: BigInt(fileStats.size),
                    scannedAt: new Date(),
                  },
                });
                result.updated++;
              } else {
                await prisma.file.create({
                  data: {
                    path: filePath,
                    filename: filePath.split('/').pop() || '',
                    size: BigInt(fileStats.size),
                    parsedTitle: parsed.title,
                    parsedYear: parsed.year,
                    parsedSeason: parsedFile.season,
                    parsedEpisode: parsedFile.episode,
                    parsedQuality: parsedFile.quality,
                    parsedEdition: parsedFile.edition,
                    parsedCodec: parsedFile.codec,
                    parsedSource: parsedFile.source,
                    mediaItemId: mediaItem.id,
                    matched: false,
                    scannedAt: new Date(),
                  },
                });
                result.added++;
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              result.errors.push(`${filePath}: ${errorMsg}`);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`TV show ${showFolder.name}: ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`TV scan error: ${errorMsg}`);
    }
    
    return result;
  }
  
  /**
   * Scan movies directory - file-based approach
   */
  async scanDirectory(path: string): Promise<ScanResult> {
    const result: ScanResult = {
      scanned: 0,
      added: 0,
      updated: 0,
      errors: [],
    };
    
    try {
      const pattern = `${path}/**/*{${this.supportedExtensions.join(',')}}`;
      const filePaths = await glob(pattern, { nodir: true, absolute: true });
      
      for (const filePath of filePaths) {
        result.scanned++;
        
        try {
          const fileStats = await stat(filePath);
          const parsed = parseMediaPath(filePath);
          
          const existing = await prisma.file.findFirst({
            where: { path: filePath },
          });
          
          if (existing) {
            await prisma.file.update({
              where: { id: existing.id },
              data: {
                parsedTitle: parsed.title,
                parsedYear: parsed.year,
                parsedSeason: parsed.season,
                parsedEpisode: parsed.episode,
                parsedQuality: parsed.quality,
                parsedEdition: parsed.edition,
                parsedCodec: parsed.codec,
                parsedSource: parsed.source,
                size: BigInt(fileStats.size),
                scannedAt: new Date(),
              },
            });
            result.updated++;
          } else {
            await prisma.file.create({
              data: {
                path: filePath,
                filename: filePath.split('/').pop() || '',
                size: BigInt(fileStats.size),
                parsedTitle: parsed.title,
                parsedYear: parsed.year,
                parsedSeason: parsed.season,
                parsedEpisode: parsed.episode,
                parsedQuality: parsed.quality,
                parsedEdition: parsed.edition,
                parsedCodec: parsed.codec,
                parsedSource: parsed.source,
                matched: false,
                scannedAt: new Date(),
              },
            });
            result.added++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`${filePath}: ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Scan error: ${errorMsg}`);
    }
    
    return result;
  }
  
  async getUnmatchedFiles() {
    return await prisma.file.findMany({
      where: { matched: false },
    });
  }
}

// Export singleton instance helper
const scanner = new LibraryScanner();

export async function scanLibrary(): Promise<ScanResult> {
  const moviesPath = process.env.MOVIES_PATH || '/data/movies';
  const tvshowsPath = process.env.TVSHOWS_PATH || '/data/tvshows';
  
  const moviesResult = await scanner.scanDirectory(moviesPath);
  const tvResult = await scanner.scanTVShows(tvshowsPath);
  
  return {
    scanned: moviesResult.scanned + tvResult.scanned,
    added: moviesResult.added + tvResult.added,
    updated: moviesResult.updated + tvResult.updated,
    errors: [...moviesResult.errors, ...tvResult.errors],
    tvShows: tvResult.tvShows,
  };
}
