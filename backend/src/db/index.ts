import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { join } from 'path';
import * as schema from './schema';

// Get database URL from environment (fallback to SQLite for local dev)
const databaseUrl = process.env.DATABASE_URL || 'postgresql://unifarr:unifarr@localhost:5432/unifarr';

console.log('🔌 Connecting to PostgreSQL...');

// Create postgres client
const queryClient = postgres(databaseUrl);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Auto-run migrations on startup
async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
    console.log('✅ Database migrations applied');
  } catch (error) {
    console.error('❌ Failed to apply migrations:', error);
    // Don't exit - let the app try to run anyway (migrations might be up to date)
  }
}

// Run migrations asynchronously
runMigrations();

export { schema };
