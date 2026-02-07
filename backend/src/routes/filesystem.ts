import { Hono } from 'hono';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const app = new Hono();

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
}

// Browse filesystem
app.get('/browse', async (c) => {
  try {
    const dirPath = c.req.query('path') || os.homedir();
    
    // Security: prevent path traversal outside reasonable bounds
    const resolvedPath = path.resolve(dirPath);
    
    // Read directory contents
    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
    
    const items: DirectoryItem[] = [];
    
    // Add parent directory link if not at root
    if (resolvedPath !== '/' && resolvedPath !== os.homedir()) {
      items.push({
        name: '..',
        path: path.dirname(resolvedPath),
        isDirectory: true,
      });
    }
    
    // Process directory entries
    for (const entry of entries) {
      // Skip hidden files/folders (starting with .)
      if (entry.name.startsWith('.')) continue;
      
      try {
        const fullPath = path.join(resolvedPath, entry.name);
        const stats = await fs.stat(fullPath);
        
        items.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });
      } catch (error) {
        // Skip entries we can't access
        continue;
      }
    }
    
    // Sort: directories first, then alphabetically
    items.sort((a, b) => {
      if (a.name === '..') return -1;
      if (b.name === '..') return 1;
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    return c.json({
      currentPath: resolvedPath,
      items,
    });
  } catch (error: any) {
    console.error('Browse error:', error);
    return c.json({ error: error.message || 'Failed to browse directory' }, 500);
  }
});

// Get common/quick access paths
app.get('/quick-paths', async (c) => {
  const paths = [
    { name: 'Home', path: os.homedir() },
    { name: 'Root', path: '/' },
    { name: 'Desktop', path: path.join(os.homedir(), 'Desktop') },
    { name: 'Documents', path: path.join(os.homedir(), 'Documents') },
    { name: 'Downloads', path: path.join(os.homedir(), 'Downloads') },
  ];
  
  // Filter to only existing paths
  const existingPaths = [];
  for (const p of paths) {
    try {
      await fs.access(p.path);
      existingPaths.push(p);
    } catch {
      // Skip non-existent paths
    }
  }
  
  return c.json(existingPaths);
});

// Create new directory
app.post('/mkdir', async (c) => {
  try {
    const { path: dirPath } = await c.req.json();
    
    if (!dirPath) {
      return c.json({ error: 'Path is required' }, 400);
    }
    
    await fs.mkdir(dirPath, { recursive: true });
    
    return c.json({ success: true, path: dirPath });
  } catch (error: any) {
    console.error('Mkdir error:', error);
    return c.json({ error: error.message || 'Failed to create directory' }, 500);
  }
});

export default app;
