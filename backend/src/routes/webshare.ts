import { Hono } from 'hono';
import { WebshareService } from '../services/webshare';
import { getSettings } from './settings';
import { getHTTPDownloader } from '../services/download/http-downloader';
import { prisma } from '../db/prisma';
import path from 'path';

const app = new Hono();

/**
 * Test Webshare connection
 */
app.post('/test', async (c) => {
  try {
    const settings = await getSettings();
    
    if (!settings.webshare?.username || !settings.webshare?.password) {
      return c.json({ error: 'Webshare credentials not configured' }, 400);
    }
    
    const webshare = new WebshareService({
      username: settings.webshare.username,
      password: settings.webshare.password,
    });
    
    const success = await webshare.login();
    
    if (success) {
      return c.json({ success: true, message: 'Connected to Webshare.cz' });
    } else {
      return c.json({ error: 'Failed to login to Webshare.cz' }, 401);
    }
  } catch (error) {
    console.error('Webshare test error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Connection test failed' 
    }, 500);
  }
});

/**
 * Search files on Webshare
 */
app.get('/search', async (c) => {
  try {
    const query = c.req.query('query');
    const limit = parseInt(c.req.query('limit') || '50');
    const auto = c.req.query('auto') === 'true';
    
    if (!query) {
      return c.json({ error: 'Query parameter required' }, 400);
    }
    
    const settings = await getSettings();
    
    if (!settings.webshare?.username || !settings.webshare?.password) {
      return c.json({ error: 'Webshare not configured' }, 400);
    }
    
    const webshare = new WebshareService({
      username: settings.webshare.username,
      password: settings.webshare.password,
    });
    
    const result = await webshare.search(query, limit);
    
    // If auto mode, find best file
    let bestFile = null;
    if (auto && result.files.length > 0) {
      bestFile = webshare.findBestFile(result.files, query);
    }
    
    return c.json({
      files: result.files,
      total: result.total,
      bestFile,
      query,
    });
  } catch (error) {
    console.error('Webshare search error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Search failed',
      files: [],
      total: 0,
    }, 500);
  }
});

/**
 * Get download link for a file
 */
app.post('/download-link', async (c) => {
  try {
    const body = await c.req.json();
    const { ident } = body;
    
    if (!ident) {
      return c.json({ error: 'File ident required' }, 400);
    }
    
    const settings = await getSettings();
    
    if (!settings.webshare?.username || !settings.webshare?.password) {
      return c.json({ error: 'Webshare not configured' }, 400);
    }
    
    const webshare = new WebshareService({
      username: settings.webshare.username,
      password: settings.webshare.password,
    });
    
    const link = await webshare.getDownloadLink(ident);
    
    if (link) {
      return c.json({ link, ident });
    } else {
      return c.json({ error: 'Failed to get download link' }, 500);
    }
  } catch (error) {
    console.error('Webshare download link error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get link' 
    }, 500);
  }
});

/**
 * Download file from Webshare to server
 */
app.post('/download', async (c) => {
  try {
    const body = await c.req.json();
    const { ident, filename, mediaId, targetPath } = body;
    
    if (!ident || !filename) {
      return c.json({ error: 'File ident and filename required' }, 400);
    }
    
    const settings = await getSettings();
    
    if (!settings.webshare?.username || !settings.webshare?.password) {
      return c.json({ error: 'Webshare not configured' }, 400);
    }
    
    const webshare = new WebshareService({
      username: settings.webshare.username,
      password: settings.webshare.password,
    });
    
    // Get download link
    const link = await webshare.getDownloadLink(ident);
    
    if (!link) {
      return c.json({ error: 'Failed to get download link' }, 500);
    }
    
    // Determine target path based on media type
    let finalTargetPath = targetPath;
    if (!finalTargetPath && mediaId) {
      const media = await prisma.media.findUnique({
        where: { id: mediaId },
      });
      
      if (media) {
        const basePath = media.type === 'movie' ? settings.moviesPath : settings.tvPath;
        const folderName = media.year 
          ? `${media.title} (${media.year})`
          : media.title;
        finalTargetPath = path.join(basePath, folderName);
        console.log(`📁 Target path for ${media.title}: ${finalTargetPath}`);
      }
    }
    
    // Start download
    const downloader = await getHTTPDownloader();
    const downloadId = await downloader.downloadFile(link, filename, mediaId, finalTargetPath);
    
    return c.json({
      success: true,
      downloadId,
      message: 'Download started',
    });
    
  } catch (error) {
    console.error('Webshare download error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Download failed' 
    }, 500);
  }
});

export default app;
