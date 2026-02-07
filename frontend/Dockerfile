FROM node:24-alpine

WORKDIR /app

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
