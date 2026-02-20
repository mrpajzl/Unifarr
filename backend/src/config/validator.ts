/**
 * Configuration Validator
 * 
 * Validates required configuration before starting services.
 * Prevents runtime errors from missing config.
 */

import { getSettings } from '../routes/settings';
import { access } from 'fs/promises';

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validate configuration on startup
 */
export async function validateConfig() {
  console.log('🔍 Validating configuration...');

  const settings = await getSettings();

  // Check required settings
  const required = {
    tmdbApiKey: settings.tmdbApiKey,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new ConfigValidationError(
      `Missing required configuration: ${missing.join(', ')}`
    );
  }

  // Validate paths if configured
  const paths: { name: string; path?: string }[] = [
    { name: 'moviesPath', path: settings.moviesPath },
    { name: 'tvPath', path: settings.tvPath },
  ];

  for (const { name, path } of paths) {
    if (path) {
      try {
        await access(path);
        console.log(`  ✅ ${name}: ${path}`);
      } catch (error) {
        console.warn(`  ⚠️  ${name}: ${path} (not accessible - will be created on demand)`);
      }
    }
  }

  // Validate environment
  const env = {
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  };

  const missingEnv = Object.entries(env)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingEnv.length > 0) {
    console.warn(`  ⚠️  Missing optional env vars: ${missingEnv.join(', ')}`);
    console.warn('     Using defaults (not recommended for production)');
  }

  console.log('✅ Configuration valid');
}
