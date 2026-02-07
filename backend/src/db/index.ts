import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import * as schema from './schema';

const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'unifarr.db');

// Ensure directory exists
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Auto-run migrations on startup
try {
  migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
  console.log('✅ Database migrations applied');
} catch (error) {
  console.error('❌ Failed to apply migrations:', error);
}

export { schema };
