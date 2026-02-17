FROM node:24-alpine

WORKDIR /app

# Version (can be overridden at build time)
ARG VERSION=1.1.0

# Metadata labels
LABEL org.opencontainers.image.title="Unifarr Backend"
LABEL org.opencontainers.image.description="Unified media management backend"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.source="https://github.com/mrpajzl/Unifarr"

# Copy prisma schema first (needed for prisma generate during npm ci postinstall)
COPY prisma ./prisma/

# Install dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma client (DATABASE_URL not needed for generate, just schema validation)
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

# Copy source
COPY . .

# Copy production settings
RUN cp settings.production.json settings.json || true

# Expose port
EXPOSE 3002

# Start with tsx (simpler than compiling)
CMD ["npx", "tsx", "src/index.ts"]
