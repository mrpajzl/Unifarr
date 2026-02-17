import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://unifarr:unifarr@localhost:5432/unifarr';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrate: {
    adapter: () => new PrismaPg({ connectionString }),
  },
});
