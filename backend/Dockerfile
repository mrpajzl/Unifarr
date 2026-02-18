FROM node:24-alpine

WORKDIR /app

# Version (can be overridden at build time)
ARG VERSION=1.1.0

# Metadata labels
LABEL org.opencontainers.image.title="Unifarr Backend"
LABEL org.opencontainers.image.description="Unified media management backend"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.source="https://github.com/mrpajzl/Unifarr"

# Build tools needed for native modules (webtorrent/node-datachannel, bcrypt, better-sqlite3)
RUN apk add --no-cache python3 make g++ linux-headers

# Copy prisma schema and config first (needed for prisma generate)
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies (including native addon compilation)
COPY package*.json ./
RUN npm install

# Generate Prisma client (DATABASE_URL needed at build time for schema validation only)
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate

# Copy source
COPY . .

# Copy production settings
RUN cp settings.production.json settings.json || true

# Expose port
EXPOSE 3002

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
