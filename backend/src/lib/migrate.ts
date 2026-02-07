import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '../db';
import Database from 'better-sqlite3';

export function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    const sqlite = new Database(process.env.DATABASE_PATH || './unifarr.db');
    const migrateDb = db;
    
    migrate(migrateDb, { migrationsFolder: './drizzle' });
    
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
