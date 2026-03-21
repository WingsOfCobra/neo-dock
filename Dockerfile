# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files for both client and server
COPY client/package.json client/package-lock.json* ./client/
COPY server/package.json server/package-lock.json* ./server/

# Install dependencies
RUN cd client && npm ci
RUN cd server && npm ci

# Copy all source
COPY client/ ./client/
COPY server/ ./server/

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy server package files and install production deps
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --production

# Copy built artifacts
# Server serves static files from ../client/dist relative to server/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
