import { Hono } from 'hono';
import { prisma } from '../db/prisma';
import fs from 'fs/promises';
import path from 'path';

const app = new Hono();

// Default settings structure
const DEFAULT_SETTINGS = {
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  moviesPath: process.env.MOVIES_PATH || '/data/movies',
  tvPath: process.env.TV_PATH || '/data/tvshows',
  downloadsPath: process.env.DOWNLOADS_PATH || './downloads',
  torrentsPath: process.env.TORRENTS_PATH || '', // Empty means use downloadsPath/torrents
  // Note: qBittorrent connection settings are managed internally (env vars only).
  // They are NOT user-configurable and not stored in the database.
  torrents: {
    seedRatio: 2.0,
    seedTimeHours: 168,
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
    languages: ['CZ', 'EN'],
    minTitleScore: 50,
    tmdbLanguage: 'cs-CZ',
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
    overrides: {},
  },
};

// Helper to get a setting from database
async function getSetting(key: string): Promise<any> {
  const result = await prisma.setting.findUnique({
    where: { key },
  });
  
  if (!result) {
    return undefined;
  }
  
  try {
    return JSON.parse(result.value);
  } catch {
    return result.value;
  }
}

// Helper to set a setting in database
async function setSetting(key: string, value: any): Promise<void> {
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
  
  await prisma.setting.upsert({
    where: { key },
    update: { value: jsonValue },
    create: { key, value: jsonValue },
  });
}

// Migration: Load settings.json if exists and migrate to database
async function migrateFromFile(): Promise<void> {
  try {
    const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
    
    const fileData = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const fileSettings = JSON.parse(fileData);
    
    console.log('📦 Migrating settings from settings.json to database...');
    
    // Migrate each top-level key
    for (const [key, value] of Object.entries(fileSettings)) {
      await setSetting(key, value);
    }
    
    console.log('✅ Settings migrated successfully');
    
    // Rename old file as backup
    const backupPath = path.join(DATA_DIR, 'settings.json.backup');
    await fs.rename(SETTINGS_FILE, backupPath);
    console.log(`💾 Old settings.json backed up to ${backupPath}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error('⚠️ Settings migration error:', error);
    }
    // If file doesn't exist, that's fine (first run or already migrated)
  }
}

// Helper to read all settings
async function getSettings() {
  // Check if migration is needed
  await migrateFromFile();
  
  const allSettings = await prisma.setting.findMany();
  
  // Start with defaults
  const result = { ...DEFAULT_SETTINGS };
  
  // Override with database values
  for (const setting of allSettings) {
    try {
      const value = JSON.parse(setting.value);
      (result as any)[setting.key] = value;
    } catch {
      (result as any)[setting.key] = setting.value;
    }
  }
  
  return result;
}

// Helper to save all settings
async function saveSettings(newSettings: any) {
  for (const [key, value] of Object.entries(newSettings)) {
    await setSetting(key, value);
  }
}

// Get all settings
app.get('/', async (c) => {
  try {
    const allSettings = await getSettings();
    
    return c.json(allSettings);
  } catch (error) {
    console.error('Get settings error:', error);
    return c.json({ error: 'Failed to get settings' }, 500);
  }
});

// Update settings
app.patch('/', async (c) => {
  try {
    const updates = await c.req.json();
    const currentSettings = await getSettings();
    
    // Merge updates with current settings
    const newSettings = { ...currentSettings, ...updates };
    
    await saveSettings(newSettings);
    
    return c.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error('Update settings error:', error);
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

// Helpers for other modules
export async function getTMDBApiKey(): Promise<string> {
  const allSettings = await getSettings();
  return allSettings.tmdbApiKey || process.env.TMDB_API_KEY || '';
}

export async function getTMDBLanguage(): Promise<string> {
  const allSettings = await getSettings();
  return allSettings.preferences?.tmdbLanguage || 'cs-CZ';
}

export async function getTMDBService() {
  const { TMDBService } = await import('../services/tmdb');
  const apiKey = await getTMDBApiKey();
  const language = await getTMDBLanguage();
  return new TMDBService(apiKey, language);
}

export { getSettings };

export default app;
