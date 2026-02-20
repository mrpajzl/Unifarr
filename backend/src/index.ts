import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { setupShutdownHandlers, registerServer } from './lifecycle';

// ── Global crash guards ─────────────────────────────────────────────────────
// Prevent unhandled promise rejections and uncaught exceptions from killing
// the process. Log them instead so individual download failures don't take
// down the whole backend.
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Promise Rejection (caught by global handler):');
  console.error('   Promise:', promise);
  console.error('   Reason:', reason);
  // Do NOT exit — log and continue. If this fires too often it indicates
  // a real bug that should be fixed in the relevant service.
});

process.on('uncaughtException', (error, origin) => {
  console.error('⚠️  Uncaught Exception (caught by global handler):');
  console.error('   Origin:', origin);
  console.error('   Error:', error);
  // For truly uncaught exceptions we still exit — the process state is unknown.
  // Kubernetes/TrueNAS will restart us automatically.
  process.exit(1);
});
// ────────────────────────────────────────────────────────────────────────────

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
import episodeMatcherRouter from './routes/episode-matcher';
import activitiesRouter from './routes/activities';
import { startAutoImport } from './services/download/auto-import';
import { startFileWatcher } from './services/file-watcher';
import { startEpisodeMonitor } from './services/episode-monitor';
import { getSettings } from './routes/settings';
import { setupQBittorrent } from './services/download/qbittorrent-setup';
import { requireAuth, requireRole } from './middleware/auth';
import { prisma } from './db/prisma';

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

// ── Public Routes (no auth required) ───────────────────────────────────────
app.route('/api/auth', authRouter);
app.route('/api/discover', discoverRouter); // Browse TMDB without auth

// ── Protected Routes (authentication required) ─────────────────────────────
app.use('/api/users/*', requireAuth);
app.use('/api/requests/*', requireAuth);
app.use('/api/files/*', requireAuth);
app.use('/api/media/*', requireAuth);
app.use('/api/search/*', requireAuth);
app.use('/api/providers/*', requireAuth);
app.use('/api/downloads/*', requireAuth);
app.use('/api/tmdb-auth/*', requireAuth);
app.use('/api/filesystem/*', requireAuth);
app.use('/api/webshare/*', requireAuth);
app.use('/api/watcher/*', requireAuth);
app.use('/api/trackers/*', requireAuth);
app.use('/api/tracker-proxy/*', requireAuth);
app.use('/api/monitor/*', requireAuth);
app.use('/api/episode-matcher/*', requireAuth);
app.use('/api/activities/*', requireAuth);

// ── Admin-Only Routes ───────────────────────────────────────────────────────
app.use('/api/settings/*', requireAuth, requireRole('admin'));
app.use('/api/search/templates/*', requireAuth, requireRole('admin'));

// Register routes
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
app.route('/api/webshare', webshareRouter);
app.route('/api/media', episodesRouter); // Episodes under /api/media/:id/episodes
app.route('/api/watcher', watcherRouter);
app.route('/api/trackers', trackersRouter);
app.route('/api/tracker-proxy', trackerProxyRouter);
app.route('/api/search/unified', searchUnifiedRouter);
app.route('/api/search/templates', searchTemplatesRouter);
app.route('/api/monitor', monitorRouter);
app.route('/api/episode-matcher', episodeMatcherRouter);
app.route('/api/activities', activitiesRouter);

// Error handling
import { formatError, ApiError } from './lib/errors';

app.onError((err, c) => {
  console.error('Error:', err);
  
  if (err instanceof ApiError) {
    return c.json(formatError(err), err.status);
  }
  
  return c.json(formatError(err), 500);
});

// Health check endpoint
app.get('/api/health', async (c) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get actual service status
    const { getServicesStatus } = await import('./lifecycle');
    const servicesStatus = getServicesStatus();
    
    return c.json({
      status: 'ok',
      version: VERSION,
      services: {
        database: true,
        ...servicesStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      status: 'degraded',
      version: VERSION,
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    }, 503);
  }
});

// Start server (async startup with config validation)
const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Unifarr API starting on port ${port}`);

// Async startup sequence
(async () => {
  try {
    // Validate configuration before starting services
    const { validateConfig } = await import('./config/validator');
    await validateConfig();

    // Start auto-import service
    if (process.env.AUTO_IMPORT !== 'false') {
      console.log('🔄 Starting auto-import service...');
      startAutoImport();
    }

    // Start file watcher
    try {
      const settings = await getSettings();
      if (settings.moviesPath || settings.tvPath) {
        console.log('👁️  Starting file watcher...');
        startFileWatcher({
          moviesPath: settings.moviesPath,
          tvShowsPath: settings.tvPath,
        });
      } else {
        console.log('⚠️  File watcher disabled: No media paths configured');
      }
    } catch (error) {
      console.error('❌ Failed to start file watcher:', error);
    }

    // Start episode monitor (checks for new episodes every hour)
    if (process.env.EPISODE_MONITOR !== 'false') {
      console.log('📺 Starting episode monitor...');
      startEpisodeMonitor();
    }

    console.log('✅ All services started successfully');
  } catch (error) {
    console.error('❌ Startup failed:', error);
    console.error('   Check configuration and try again');
    // Don't exit - server can still run, just without background services
  }
})();

// Setup graceful shutdown handlers
setupShutdownHandlers();

// Start server
const server = serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});

// Register server for graceful shutdown
registerServer(server);

// Auto-configure qBittorrent sidecar (non-fatal if it fails)
setupQBittorrent().catch(err => console.error('qBittorrent setup failed:', err));
