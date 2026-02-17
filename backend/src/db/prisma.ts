import { PrismaClient } from '@prisma/client';

// Get database URL from environment (with fallback for local dev)
const databaseUrl = process.env.DATABASE_URL || 'postgresql://unifarr:unifarr@localhost:5432/unifarr';

console.log('🔌 Connecting to PostgreSQL via Prisma...');

// Create Prisma client - uses DATABASE_URL from schema or the explicit url
// The env var is picked up automatically from schema.prisma `url = env("DATABASE_URL")`
// We set it via process.env to ensure the fallback works
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

export const prisma = new PrismaClient();

// Graceful shutdown will be handled by lifecycle.ts
