FROM node:24-alpine

WORKDIR /app

# Version (can be overridden at build time)
ARG VERSION=1.1.0

# Metadata labels
LABEL org.opencontainers.image.title="Unifarr Frontend"
LABEL org.opencontainers.image.description="Unified media management frontend"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.source="https://github.com/mrpajzl/Unifarr"

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build argument for API base
ARG NUXT_PUBLIC_API_BASE=http://localhost:3002
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["node", ".output/server/index.mjs"]
