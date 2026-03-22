# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files (workspace config + lockfile)
COPY package.json package-lock.json ./

# Copy workspace package files
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all workspace dependencies
RUN npm ci

# Copy all source
COPY client/ ./client/
COPY server/ ./server/

# Build client and server
RUN npm run build -w client
RUN npm run build -w server

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy root package files for workspace-aware install
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install production deps for server workspace only
RUN npm ci -w server --omit=dev

# Copy built artifacts
# Server serves static files from ../client/dist relative to server/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
