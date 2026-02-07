import { Hono } from 'hono';
import { startFileWatcher, stopFileWatcher, getWatcherStatus } from '../services/file-watcher';
import { getSettings } from './settings';

const app = new Hono();

// Get watcher status
app.get('/status', (c) => {
  const status = getWatcherStatus();
  return c.json(status);
});

// Start/restart watcher
app.post('/start', async (c) => {
  try {
    const settings = await getSettings();
    
    if (!settings.moviesPath && !settings.tvPath) {
      return c.json({ 
        error: 'No media paths configured. Please set paths in Settings first.' 
      }, 400);
    }
    
    startFileWatcher({
      moviesPath: settings.moviesPath,
      tvShowsPath: settings.tvPath,
    });
    
    return c.json({ 
      success: true,
      message: 'File watcher started',
      watching: {
        movies: settings.moviesPath,
        tv: settings.tvPath,
      }
    });
  } catch (error) {
    console.error('Start watcher error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to start watcher' 
    }, 500);
  }
});

// Stop watcher
app.post('/stop', (c) => {
  stopFileWatcher();
  return c.json({ 
    success: true,
    message: 'File watcher stopped' 
  });
});

export default app;
