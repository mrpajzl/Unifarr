import { glob } from 'glob';
import { stat } from 'fs/promises';
import { parseMediaPath } from '../lib/parser';
import { db } from '../db';
import { files } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface ScanResult {
  scanned: number;
  added: number;
  updated: number;
  errors: string[];
}

export class LibraryScanner {
  private supportedExtensions = [
    '.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.m4v', '.mpg', '.mpeg', '.m2ts', '.ts'
  ];
  
  async scanDirectory(path: string): Promise<ScanResult> {
    const result: ScanResult = {
      scanned: 0,
      added: 0,
      updated: 0,
      errors: [],
    };
    
    try {
      // Find all video files recursively
      const pattern = `${path}/**/*{${this.supportedExtensions.join(',')}}`;
      const filePaths = await glob(pattern, { nodir: true, absolute: true });
      
      for (const filePath of filePaths) {
        result.scanned++;
        
        try {
          const fileStats = await stat(filePath);
          const parsed = parseMediaPath(filePath);
          
          // Check if file already exists in DB
          const existing = await db.query.files.findFirst({
            where: eq(files.path, filePath),
          });
          
          if (existing) {
            // Update existing record
            await db.update(files)
              .set({
                parsedTitle: parsed.title,
                parsedYear: parsed.year,
                parsedSeason: parsed.season,
                parsedEpisode: parsed.episode,
                parsedQuality: parsed.quality,
                parsedEdition: parsed.edition,
                parsedCodec: parsed.codec,
                parsedSource: parsed.source,
                size: Number(fileStats.size),
                scannedAt: new Date(),
              })
              .where(eq(files.id, existing.id));
            result.updated++;
          } else {
            // Insert new record
            await db.insert(files).values({
              path: filePath,
              filename: filePath.split('/').pop() || '',
              size: Number(fileStats.size),
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
    return await db.query.files.findMany({
      where: eq(files.matched, false),
    });
  }
}

// Export singleton instance helper
const scanner = new LibraryScanner();

export async function scanLibrary(): Promise<ScanResult> {
  const moviesPath = process.env.MOVIES_PATH || '/data/movies';
  const tvshowsPath = process.env.TVSHOWS_PATH || '/data/tvshows';
  
  const moviesResult = await scanner.scanDirectory(moviesPath);
  const tvResult = await scanner.scanDirectory(tvshowsPath);
  
  return {
    scanned: moviesResult.scanned + tvResult.scanned,
    added: moviesResult.added + tvResult.added,
    updated: moviesResult.updated + tvResult.updated,
    errors: [...moviesResult.errors, ...tvResult.errors],
  };
}
