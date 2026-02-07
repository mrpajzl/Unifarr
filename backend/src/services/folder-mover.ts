import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { db } from '../db';
import { mediaItems, files } from '../db/schema';
import { eq } from 'drizzle-orm';

interface MoveResult {
  success: boolean;
  oldPath: string;
  newPath: string;
  filesMoved: number;
  error?: string;
}

/**
 * Move media folder to a new location
 * @param mediaId - ID of the media item
 * @param newPath - New folder path
 * @param autoMove - If true, automatically move files. If false, just update DB.
 */
export async function moveMediaFolder(
  mediaId: number,
  newPath: string,
  autoMove: boolean
): Promise<MoveResult> {
  try {
    // Get media item
    const media = await db.query.mediaItems.findFirst({
      where: eq(mediaItems.id, mediaId),
    });

    if (!media) {
      return {
        success: false,
        oldPath: '',
        newPath,
        filesMoved: 0,
        error: 'Media item not found',
      };
    }

    const oldPath = media.libraryPath;
    if (!oldPath) {
      return {
        success: false,
        oldPath: '',
        newPath,
        filesMoved: 0,
        error: 'No library path set for this media item',
      };
    }

    // Check if old path exists
    try {
      await fs.access(oldPath);
    } catch {
      console.warn(`Old path does not exist: ${oldPath}`);
      // Continue anyway - just update DB
    }

    let filesMoved = 0;

    if (autoMove) {
      try {
        // Create new directory
        await fs.mkdir(newPath, { recursive: true });

        // Get all entries in old directory
        const entries = await fs.readdir(oldPath, { withFileTypes: true });

        // Move all files and directories
        for (const entry of entries) {
          const oldItemPath = join(oldPath, entry.name);
          const newItemPath = join(newPath, entry.name);

          await fs.rename(oldItemPath, newItemPath);
          filesMoved++;
          console.log(`Moved: ${oldItemPath} → ${newItemPath}`);
        }

        // Remove old directory if empty
        try {
          await fs.rmdir(oldPath);
          console.log(`Removed old directory: ${oldPath}`);
        } catch (err) {
          console.warn(`Failed to remove old directory (may not be empty): ${oldPath}`);
        }
      } catch (error) {
        return {
          success: false,
          oldPath,
          newPath,
          filesMoved: 0,
          error: `Failed to move files: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    // Update media item library path
    await db.update(mediaItems)
      .set({
        libraryPath: newPath,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(mediaItems.id, mediaId));

    // Update all file paths in database
    const relatedFiles = await db.query.files.findMany({
      where: eq(files.mediaItemId, mediaId),
    });

    for (const file of relatedFiles) {
      // Replace old path prefix with new path
      const relativePath = file.path.replace(oldPath, '');
      const newFilePath = join(newPath, relativePath);

      await db.update(files)
        .set({ path: newFilePath })
        .where(eq(files.id, file.id));
    }

    console.log(`✅ Updated library path: ${oldPath} → ${newPath}`);
    console.log(`✅ Updated ${relatedFiles.length} file records in database`);

    return {
      success: true,
      oldPath,
      newPath,
      filesMoved: autoMove ? filesMoved : 0,
    };
  } catch (error) {
    console.error('Move media folder error:', error);
    return {
      success: false,
      oldPath: '',
      newPath,
      filesMoved: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate that a path is safe and exists
 */
export async function validatePath(path: string): Promise<{ valid: boolean; error?: string }> {
  // Check for dangerous patterns
  if (path.includes('..') || path.includes('~')) {
    return { valid: false, error: 'Path contains unsafe characters (.., ~)' };
  }

  // Check if parent directory exists
  const parentDir = dirname(path);
  try {
    await fs.access(parentDir);
  } catch {
    return { valid: false, error: `Parent directory does not exist: ${parentDir}` };
  }

  return { valid: true };
}
