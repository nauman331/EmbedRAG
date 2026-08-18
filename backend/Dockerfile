# ============================================================
# Backend — Multi-stage Dockerfile
# ============================================================
# Stage 1: Build TypeScript to JavaScript
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency files first (cached layer)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ============================================================
# Stage 2: Production image (minimal footprint)
FROM node:20-alpine AS production
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

# Use node directly (not tsx) in production
CMD ["node", "dist/server.js"]
