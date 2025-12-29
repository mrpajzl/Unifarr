# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
# Check architecture early - only support amd64 and arm64
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" != "x86_64" ] && [ "$ARCH" != "aarch64" ]; then \
        echo "ERROR: Unsupported architecture: $ARCH" && \
        echo "This build only supports linux/amd64 (x86_64) and linux/arm64 (aarch64)" && \
        echo "Prisma and Next.js do not support arm/v6 or arm/v7 architectures" && \
        exit 1; \
    fi

RUN apk add --no-cache openssl openssl-dev
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client
# Set OPENSSL_LIB_DIR to help Prisma detect OpenSSL 3.0
ENV OPENSSL_LIB_DIR=/usr/lib
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# Copy Prisma CLI and related packages for migrations
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

