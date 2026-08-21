# ============================================================
# Frontend — Multi-stage Dockerfile (Vite + Nginx)
# ============================================================
# Stage 1: Build React app
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time env vars for Vite
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ============================================================
# Stage 2: Serve with Nginx
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config: handle client-side routing (React Router)
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX_CONF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' wss: https:; img-src 'self' data: https:; frame-ancestors *;" always;

    # Explicitly REMOVE X-Frame-Options so the widget can be embedded anywhere
    # We intentionally do NOT set X-Frame-Options here.
    # frame-ancestors * in CSP above handles this.

    # Serve static assets with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fallback to index.html for SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_CONF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
