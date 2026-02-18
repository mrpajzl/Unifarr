FROM node:24-alpine

WORKDIR /app

# Version (can be overridden at build time)
ARG VERSION=1.1.0

# Metadata labels
LABEL org.opencontainers.image.title="Unifarr Backend"
LABEL org.opencontainers.image.description="Unified media management backend"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.source="https://github.com/mrpajzl/Unifarr"

# Copy prisma schema and config first (needed for prisma generate)
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies (omit optional native addons that can't be cross-compiled)
COPY package*.json ./
RUN npm install --ignore-scripts

# Generate Prisma client (connection via adapter defined in prisma.config.ts)
RUN npx prisma generate

# Copy source
COPY . .

# Copy production settings
RUN cp settings.production.json settings.json || true

# Expose port
EXPOSE 3002

# Start with tsx (simpler than compiling)
CMD ["npx", "tsx", "src/index.ts"]
