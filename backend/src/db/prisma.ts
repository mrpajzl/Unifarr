import { PrismaClient } from '@prisma/client';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || 'postgresql://unifarr:unifarr@localhost:5432/unifarr';

console.log('🔌 Connecting to PostgreSQL via Prisma...');

// Create Prisma client
export const prisma = new PrismaClient();

// Graceful shutdown will be handled by lifecycle.ts
