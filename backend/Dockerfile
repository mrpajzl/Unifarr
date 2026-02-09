FROM node:24-alpine

WORKDIR /app

# Version (can be overridden at build time)
ARG VERSION=1.1.0

# Metadata labels
LABEL org.opencontainers.image.title="Unifarr Backend"
LABEL org.opencontainers.image.description="Unified media management backend"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.source="https://github.com/mrpajzl/Unifarr"

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Copy production settings
RUN cp settings.production.json settings.json || true

# Expose port
EXPOSE 3002

# Start with tsx (simpler than compiling)
CMD ["npx", "tsx", "src/index.ts"]
