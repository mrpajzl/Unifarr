import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import filesRouter from './routes/files';
import mediaRouter from './routes/media';
import searchRouter from './routes/search';
import providersRouter from './routes/providers';
import downloadsRouter from './routes/downloads';
import tmdbAuthRouter from './routes/tmdb-auth';
import settingsRouter from './routes/settings';
import filesystemRouter from './routes/filesystem';
import discoverRouter from './routes/discover';
import webshareRouter from './routes/webshare';
import episodesRouter from './routes/episodes';
import watcherRouter from './routes/watcher';
import trackersRouter from './routes/trackers';
import trackerProxyRouter from './routes/tracker-proxy';
import searchUnifiedRouter from './routes/search-unified';
import searchTemplatesRouter from './routes/search-templates';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import requestsRouter from './routes/requests';
import monitorRouter from './routes/monitor';
import { startAutoImport } from './services/download/auto-import';
import { startFileWatcher } from './services/file-watcher';
import { startEpisodeMonitor } from './services/episode-monitor';
import { getSettings } from './routes/settings';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Read version from package.json
import { readFileSync } from 'fs';
import { join } from 'path';

let VERSION = '1.1.0';
try {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  VERSION = packageJson.version;
} catch (error) {
  console.warn('Could not read version from package.json');
}

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Unifarr API',
    version: VERSION,
    status: 'online',
  });
});

// Version endpoint
app.get('/api/version', (c) => {
  return c.json({ version: VERSION });
});

// Routes
app.route('/api/auth', authRouter);
app.route('/api/users', usersRouter);
app.route('/api/requests', requestsRouter);
app.route('/api/files', filesRouter);
app.route('/api/media', mediaRouter);
app.route('/api/search', searchRouter);
app.route('/api/providers', providersRouter);
app.route('/api/downloads', downloadsRouter);
app.route('/api/tmdb-auth', tmdbAuthRouter);
app.route('/api/settings', settingsRouter);
app.route('/api/filesystem', filesystemRouter);
app.route('/api/discover', discoverRouter);
app.route('/api/webshare', webshareRouter);
app.route('/api/media', episodesRouter); // Episodes under /api/media/:id/episodes
app.route('/api/watcher', watcherRouter);
app.route('/api/trackers', trackersRouter);
app.route('/api/tracker-proxy', trackerProxyRouter);
app.route('/api/search/unified', searchUnifiedRouter);
app.route('/api/search/templates', searchTemplatesRouter);
app.route('/api/monitor', monitorRouter);

// Error handling
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: err.message || 'Internal server error',
  }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Unifarr API starting on port ${port}`);

// Start auto-import service
if (process.env.AUTO_IMPORT !== 'false') {
  startAutoImport();
}

// Start file watcher
(async () => {
  try {
    const settings = await getSettings();
    if (settings.moviesPath || settings.tvPath) {
      startFileWatcher({
        moviesPath: settings.moviesPath,
        tvShowsPath: settings.tvPath,
      });
    } else {
      console.log('⚠️ File watcher disabled: No media paths configured');
    }
  } catch (error) {
    console.error('Failed to start file watcher:', error);
  }
})();

// Start episode monitor (checks for new episodes every hour)
if (process.env.EPISODE_MONITOR !== 'false') {
  startEpisodeMonitor();
}

serve({
  fetch: app.fetch,
  port,
});
