import { Hono } from 'hono';
import fs from 'fs/promises';
import path from 'path';

const app = new Hono();

// Store settings in /app/data which is mounted as a volume
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Helper to read settings
async function getSettings() {
  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return defaults
    return {
      tmdbApiKey: process.env.TMDB_API_KEY || '',
      moviesPath: process.env.MOVIES_PATH || '/data/movies',
      tvPath: process.env.TV_PATH || '/data/tvshows',
      downloadsPath: process.env.DOWNLOADS_PATH || './downloads',
      qbittorrent: {
        host: process.env.QBITTORRENT_HOST || 'localhost',
        port: parseInt(process.env.QBITTORRENT_PORT || '8080'),
        username: process.env.QBITTORRENT_USERNAME || 'admin',
        password: process.env.QBITTORRENT_PASSWORD || '',
      },
      torrents: {
        seedRatio: 2.0, // Stop seeding after uploading 2x the download size
        seedTimeHours: 168, // Stop seeding after 7 days (168 hours)
      },
      webshare: {
        username: process.env.WEBSHARE_USERNAME || '',
        password: process.env.WEBSHARE_PASSWORD || '',
        enabled: false,
      },
      trackers: {
        sktorrent: {
          enabled: false,
          username: '',
          password: '',
        },
      },
      preferences: {
        languages: ['CZ', 'EN'], // Preferred audio languages
        minTitleScore: 50, // Phase 1: Minimum title match score to filter wrong movies (0-100)
        tmdbLanguage: 'cs-CZ', // TMDB metadata language (cs-CZ, en-US, etc.)
      },
      searchTemplates: {
        movies: [
          '{Movie Title} {Release Year}',
          '{Movie OriginalTitle} {Release Year}',
        ],
        tv: [
          '{Series Title} S{Season:2}E{Episode:2}',
          '{Series OriginalTitle} S{Season:2}E{Episode:2}',
        ],
        overrides: {}, // Per-show overrides: { [tmdbId]: [...templates] }
      },
    };
  }
}

// Helper to save settings
async function saveSettings(settings: any) {
  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Get all settings
app.get('/', async (c) => {
  try {
    const settings = await getSettings();
    // Don't send sensitive password in plain text
    if (settings.qbittorrent?.password) {
      settings.qbittorrent.password = '***';
    }
    return c.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return c.json({ error: 'Failed to get settings' }, 500);
  }
});

// Update settings
app.patch('/', async (c) => {
  try {
    const newSettings = await c.req.json();
    const currentSettings = await getSettings();
    
    // Merge new settings with current
    const updated = {
      ...currentSettings,
      ...newSettings,
      qbittorrent: {
        ...currentSettings.qbittorrent,
        ...newSettings.qbittorrent,
      },
    };
    
    // If password is '***', keep the old password
    if (updated.qbittorrent?.password === '***' && currentSettings.qbittorrent?.password) {
      updated.qbittorrent.password = currentSettings.qbittorrent.password;
    }
    
    await saveSettings(updated);
    
    return c.json({ success: true, settings: updated });
  } catch (error) {
    console.error('Update settings error:', error);
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

// Get current TMDB API key (for use by other services)
export async function getTMDBApiKey(): Promise<string> {
  const settings = await getSettings();
  return settings.tmdbApiKey || process.env.TMDB_API_KEY || '';
}

// Get TMDB language preference
export async function getTMDBLanguage(): Promise<string> {
  const settings = await getSettings();
  return settings.preferences?.tmdbLanguage || 'cs-CZ';
}

// Get configured TMDBService instance
export async function getTMDBService() {
  const { TMDBService } = await import('../services/tmdb');
  const apiKey = await getTMDBApiKey();
  const language = await getTMDBLanguage();
  return new TMDBService(apiKey, language);
}

// Export getSettings for use by other services
export { getSettings };

export default app;
