import { glob } from 'glob';
import { stat } from 'fs/promises';
import { queries } from '../../db/database';
import { parseFilename, VIDEO_EXTENSIONS } from './fileParser';

export interface ScanResult {
  totalFiles: number;
  newFiles: number;
  existingFiles: number;
  errors: string[];
}

/**
 * Scan a directory for media files
 */
export async function scanDirectory(directory: string): Promise<ScanResult> {
  console.log(`📂 Scanning directory: ${directory}`);
  
  const result: ScanResult = {
    totalFiles: 0,
    newFiles: 0,
    existingFiles: 0,
    errors: [],
  };

  try {
    // Find all video files
    const extensions = VIDEO_EXTENSIONS.join(',');
    const pattern = `${directory}/**/*{${extensions}}`;
    const files = await glob(pattern, { nodir: true, absolute: true });
    
    result.totalFiles = files.length;
    console.log(`Found ${files.length} video files`);

    for (const filePath of files) {
      try {
        // Check if file already exists in database
        const existing = queries.getFileByPath.get(filePath);
        if (existing) {
          result.existingFiles++;
          continue;
        }

        // Parse filename
        const parsed = parseFilename(filePath);
        if (!parsed) {
          result.errors.push(`Failed to parse: ${filePath}`);
          continue;
        }

        // Get file size
        const stats = await stat(filePath);
        const size = stats.size;

        // Insert file into database (without media_id initially)
        queries.insertFile.run(
          null, // media_id will be set later during matching
          filePath,
          filePath.split('/').pop() || '',
          size,
          parsed.quality || null,
          parsed.codec || null,
          parsed.resolution || null,
          parsed.releaseGroup || null
        );

        result.newFiles++;
        console.log(`✅ Added: ${parsed.title} ${parsed.year || `S${parsed.season}E${parsed.episode}` || ''}`);
      } catch (error) {
        result.errors.push(`Error processing ${filePath}: ${error}`);
      }
    }

    console.log(`✅ Scan complete: ${result.newFiles} new, ${result.existingFiles} existing`);
    return result;
  } catch (error) {
    result.errors.push(`Scan failed: ${error}`);
    return result;
  }
}

/**
 * Get all unmatched files (files without media_id)
 */
export function getUnmatchedFiles() {
  return queries.getUnmatchedFiles.all();
}

/**
 * Auto-match files to media using TMDB
 */
export async function autoMatchFiles() {
  const unmatchedFiles = getUnmatchedFiles();
  console.log(`🔍 Auto-matching ${unmatchedFiles.length} files...`);
  
  // This will be implemented with TMDB matcher
  return unmatchedFiles;
}
