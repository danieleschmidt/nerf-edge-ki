# Multi-stage Dockerfile for nerf-edge-kit development and production
# Supports both web development and Python training components

# Stage 1: Base development environment
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache git python3 py3-pip make g++

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
COPY --from=web-builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Stage 6: Production Python API
FROM python-env AS production-api
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "nerf_edge_kit.api:app", "--host", "0.0.0.0", "--port", "8000"]