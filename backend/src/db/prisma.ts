import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Get database URL from environment (with fallback for local dev)
const connectionString = process.env.DATABASE_URL || 'postgresql://unifarr:unifarr@localhost:5432/unifarr';

console.log('🔌 Connecting to PostgreSQL via Prisma...');

// Prisma 7.x with driver adapters: adapter must be passed explicitly at runtime.
// prisma.config.ts only configures the adapter for migrations.
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

// Graceful shutdown will be handled by lifecycle.ts
