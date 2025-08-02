# Multi-stage Dockerfile for nerf-edge-kit development and production
# Supports both web development and Python training components

# Stage 1: Base development environment
FROM node:18-alpine AS base

# Security labels
LABEL org.opencontainers.image.title="nerf-edge-kit"
LABEL org.opencontainers.image.description="Real-time NeRF SDK for spatial computing"
LABEL org.opencontainers.image.vendor="Terragon Labs"
LABEL org.opencontainers.image.licenses="MIT"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Install system dependencies with security updates
RUN apk add --no-cache \
    git \
    python3 \
    py3-pip \
    make \
    g++ \
    dumb-init \
    && apk upgrade

# Stage 2: Node.js dependencies and build
FROM base AS web-builder
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY tsconfig.json webpack.config.js ./
COPY web/ ./web/
RUN npm run build

# Stage 3: Python environment for training
FROM python:3.11-slim AS python-env
WORKDIR /python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY python/ ./

# Stage 4: Development environment
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000 8080
CMD ["npm", "run", "dev"]

# Stage 5: Production web server
FROM nginx:alpine AS production-web

# Security hardening for nginx
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx && \
    apk upgrade

COPY --from=web-builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper ownership and permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80
USER nginx
CMD ["nginx", "-g", "daemon off;"]

# Stage 6: Production Python API
FROM python-env AS production-api

# Security hardening for Python API
RUN useradd --create-home --shell /bin/bash --user-group python && \
    chown -R python:python /python

USER python
WORKDIR /python

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "nerf_edge_kit.api:app", "--host", "0.0.0.0", "--port", "8000"]