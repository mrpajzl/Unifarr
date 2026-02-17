import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://unifarr:unifarr@localhost:5432/unifarr';

console.log('🔌 Connecting to PostgreSQL via Prisma...');

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

// Graceful shutdown will be handled by lifecycle.ts
