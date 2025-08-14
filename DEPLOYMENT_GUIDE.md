# NeRF Edge Kit - Production Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- Docker and Docker Compose
- SSL certificates
- Domain name configured

### 1. Environment Setup
```bash
# Copy production environment
cp .env.production .env

# Update configuration
nano .env
```

### 2. SSL Certificate Setup
```bash
# Create SSL directory
mkdir -p ssl

# Copy your certificates
cp your-fullchain.pem ssl/fullchain.pem
cp your-privkey.pem ssl/privkey.pem
```

### 3. Deploy with Docker Compose
```bash
# Build and start production services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
```

## 📊 Monitoring Setup

### Prometheus Metrics
- **URL**: http://your-domain.com:9090
- **Metrics**: Performance, memory usage, API response times
- **Retention**: 30 days

### Grafana Dashboard
- **URL**: http://your-domain.com:3000
- **Default Login**: admin / your-secure-password
- **Dashboards**: Pre-configured NeRF performance dashboards

### Health Checks
```bash
# Application health
curl http://your-domain.com/health

# Container health
docker-compose -f docker-compose.production.yml ps
```

## 🔧 Performance Optimization

### WebGPU Configuration
```typescript
// Optimized for production
const config = {
  targetFPS: 90,
  maxResolution: [3840, 2160],
  foveatedRendering: true,
  neuralAcceleration: true,
  quantization: true
};
```

### CDN Integration
```nginx
# Configure CDN for static assets
location ~* \.(nerf|wasm|js)$ {
    proxy_pass https://cdn.your-domain.com;
    expires 1y;
}
```

## 🛡️ Security Configuration

### HTTPS Setup
- TLS 1.2+ only
- Strong cipher suites
- HSTS enabled
- Security headers configured

### API Rate Limiting
- 10 requests/second for API endpoints
- 50 requests/second for static assets
- Burst handling for traffic spikes

### Content Security Policy
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Permissions-Policy: camera=*, xr-spatial-tracking=*
```

## 📱 Device-Specific Optimizations

### Apple Vision Pro
```typescript
const visionProConfig = {
  targetFPS: 90,
  maxResolution: [4K, 4K],
  powerBudget: 8.0, // Watts
  foveationRadius: 0.2
};
```

### iPhone 15 Pro
```typescript
const iPhoneConfig = {
  targetFPS: 60,
  maxResolution: [1080, 1920],
  powerBudget: 3.0, // Watts
  memoryLimit: 512 // MB
};
```

## 🔄 Auto-Scaling

### Horizontal Scaling
```yaml
# Docker Swarm
deploy:
  replicas: 3
  update_config:
    parallelism: 1
    delay: 10s
  resources:
    limits:
      memory: 2G
      cpus: '2.0'
```

### Load Balancing
```nginx
upstream nerf_backend {
    server nerf-1:8080 weight=1;
    server nerf-2:8080 weight=1;
    server nerf-3:8080 weight=1;
    keepalive 32;
}
```

## 📈 Performance Targets

| Platform | Resolution | FPS | Latency | Memory |
|----------|------------|-----|---------|--------|
| Vision Pro | 4K/eye | 90 | <4.2ms | <1GB |
| iPhone 15 Pro | 1080p | 60 | <4.8ms | <512MB |
| Web/Chrome | 1440p | 60 | <6.5ms | <1GB |

## 🚨 Troubleshooting

### Common Issues

**High Memory Usage**
```bash
# Check memory usage
docker stats nerf-edge-kit-prod

# Adjust memory limits
nano docker-compose.production.yml
```

**WebGPU Not Available**
```typescript
// Fallback configuration
if (!navigator.gpu) {
  console.warn('WebGPU not supported, using fallback');
  useWebGLFallback();
}
```

**Slow Performance**
```bash
# Check GPU utilization
nvidia-smi

# Monitor performance metrics
curl http://localhost:9090/api/v1/query?query=nerf_render_time
```

### Log Analysis
```bash
# Application logs
docker logs nerf-edge-kit-prod

# Nginx logs
docker logs nerf-nginx-prod

# System metrics
docker exec nerf-edge-kit-prod cat /proc/meminfo
```

## 🔄 Updates and Maintenance

### Zero-Downtime Deployment
```bash
# Rolling update
docker-compose -f docker-compose.production.yml up -d --no-deps nerf-edge-kit

# Health check
curl -f http://localhost:8080/health || exit 1
```

### Backup Strategy
```bash
# Backup configuration
tar -czf backup-$(date +%Y%m%d).tar.gz \
  .env.production \
  ssl/ \
  monitoring/ \
  nginx.prod.conf
```

### Security Updates
```bash
# Update base images monthly
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## 📞 Support

For production deployment issues:
- GitHub Issues: [Repository Issues](https://github.com/your-org/nerf-edge-kit/issues)
- Documentation: [Comprehensive Docs](https://nerf-edge-kit.dev)
- Email: support@your-domain.com

## 🏆 Production Checklist

- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Security headers configured
- [ ] Performance targets met
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Disaster recovery plan
- [ ] Documentation updated