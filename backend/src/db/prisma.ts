import { PrismaClient } from '@prisma/client';
import { createAdapter } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || 'postgresql://unifarr:unifarr@localhost:5432/unifarr';

console.log('🔌 Connecting to PostgreSQL via Prisma...');

// Create connection pool
const pool = new Pool({
  connectionString: databaseUrl,
});

// Create Prisma adapter
const adapter = createAdapter(pool);

// Create Prisma client with adapter
export const prisma = new PrismaClient({ adapter });

// Graceful shutdown
import { registerCleanup } from '../lifecycle.js';

registerCleanup(async () => {
  console.log('🔌 Disconnecting Prisma...');
  await prisma.$disconnect();
  await pool.end();
});
