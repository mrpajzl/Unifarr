FROM node:24-alpine

WORKDIR /app

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
