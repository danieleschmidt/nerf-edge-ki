# NeRF Edge Kit - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying NeRF Edge Kit to production environments with optimal performance, security, and scalability for spatial computing workloads.

## 🚀 Quick Start

### Docker Compose Deployment (Recommended for Single Server)

```bash
# 1. Clone and prepare environment
git clone <repository-url>
cd nerf-edge-kit

# 2. Configure production environment
cp .env.example .env.production
# Edit .env.production with your secure values

# 3. Deploy with automated script
./scripts/deploy-production.sh docker-compose production v4.0.0
```

### Kubernetes Deployment (Recommended for Clusters)

```bash
# 1. Configure Kubernetes cluster access
kubectl cluster-info

# 2. Deploy to Kubernetes
./scripts/deploy-production.sh kubernetes production v4.0.0
```

## 📋 Prerequisites

### System Requirements

**Minimum Hardware:**
- CPU: 8 cores (Intel Xeon or AMD EPYC)
- RAM: 16GB
- GPU: NVIDIA RTX 4080 or better (with Vulkan support)
- Storage: 500GB SSD
- Network: 1Gbps

**Recommended Hardware:**
- CPU: 16+ cores (Intel Xeon or AMD EPYC)
- RAM: 64GB+
- GPU: NVIDIA RTX 4090 or A6000 (with Vulkan support)
- Storage: 2TB NVMe SSD
- Network: 10Gbps

**Software Dependencies:**
- Docker 24.0+
- Docker Compose 2.21+
- Node.js 24.x LTS
- NVIDIA Container Toolkit (for GPU support)
- Vulkan SDK 1.3+

### Performance Targets

| Platform | Resolution | FPS | Latency | Power |
|----------|------------|-----|---------|-------|
| Vision Pro | 4K/eye | 90 | 4.2ms | 8W |
| Desktop VR | 2K/eye | 90 | 6.5ms | 150W |
| Mobile AR | 1080p | 60 | 8.0ms | 5W |

## 🔧 Configuration

### 1. Environment Configuration

Copy and customize the production environment file:

```bash
cp .env.example .env.production
```

**Critical Variables to Configure:**

```env
# Security (REQUIRED - Replace with secure values)
JWT_SECRET=REPLACE_WITH_SECURE_JWT_SECRET_64_CHARS_MINIMUM
ENCRYPTION_KEY=REPLACE_WITH_32_CHARACTER_ENCRYPTION_KEY
REDIS_PASSWORD=REPLACE_WITH_REDIS_PASSWORD

# Domain Configuration
CORS_ORIGIN=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/nerfkit

# Monitoring
SENTRY_DSN=REPLACE_WITH_SENTRY_DSN
DATADOG_API_KEY=REPLACE_WITH_DATADOG_KEY

# Cloud Storage
S3_BUCKET=nerf-edge-kit-models
CDN_URL=https://cdn.your-domain.com
```

### 2. SSL/TLS Configuration

Generate SSL certificates:

```bash
# Using Let's Encrypt (recommended)
mkdir -p ssl
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/private.key

# Or use self-signed for testing
openssl req -x509 -newkey rsa:4096 -keyout ssl/private.key -out ssl/cert.pem -days 365 -nodes
```

### 3. GPU Configuration

Ensure GPU support is properly configured:

```bash
# Install NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify GPU access
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

## 🐳 Docker Deployment

### Production Docker Compose Stack

The production stack includes:
- **NeRF Edge Kit**: Main application with GPU acceleration
- **NGINX**: Reverse proxy with SSL termination
- **Redis**: Caching and session storage
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

```bash
# Start production stack
docker-compose -f docker-compose.production.yml up -d

# Monitor deployment
docker-compose -f docker-compose.production.yml logs -f

# Check service health
docker-compose -f docker-compose.production.yml ps
```

### Custom Docker Configuration

For advanced users, customize the Docker configuration:

```dockerfile
# Custom build args
docker build \
  -f Dockerfile.production \
  -t nerf-edge-kit:custom \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_TARGET=production \
  --build-arg OPTIMIZATION_LEVEL=maximum \
  .
```

## ☸️ Kubernetes Deployment

### Cluster Requirements

- Kubernetes 1.28+
- NVIDIA GPU Operator installed
- Cert-Manager for SSL certificates
- NGINX Ingress Controller
- Prometheus Operator

### Deployment Steps

1. **Create Namespace and Secrets:**

```bash
kubectl create namespace nerf-edge-kit

# Create secrets
kubectl create secret generic nerf-secrets \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-literal=REDIS_PASSWORD=your-redis-password \
  --from-literal=ENCRYPTION_KEY=your-encryption-key \
  -n nerf-edge-kit

# SSL certificates
kubectl create secret tls nerf-tls-secret \
  --cert=ssl/cert.pem \
  --key=ssl/private.key \
  -n nerf-edge-kit
```

2. **Deploy Application:**

```bash
kubectl apply -f kubernetes/nerf-edge-kit-deployment.yaml

# Monitor deployment
kubectl get pods -n nerf-edge-kit -w
kubectl logs -f deployment/nerf-edge-kit -n nerf-edge-kit
```

3. **Configure Auto-scaling:**

```bash
# Horizontal Pod Autoscaler is configured in the deployment
kubectl get hpa -n nerf-edge-kit

# Vertical Pod Autoscaler (optional)
kubectl apply -f kubernetes/vpa-config.yaml
```

## 🔍 Monitoring and Observability

### Built-in Health Checks

The application provides comprehensive health endpoints:

- `/health` - Overall application health
- `/health/gpu` - GPU acceleration status
- `/health/spatial` - Spatial computing subsystems
- `/health/security` - Security subsystem status
- `/metrics` - Prometheus metrics

### Grafana Dashboards

Access monitoring at `http://your-domain.com:3000`:

- **NeRF Overview**: System performance, render times, memory usage
- **GPU Metrics**: GPU utilization, memory, temperature
- **Security Dashboard**: Threat detection, compliance status
- **User Analytics**: Session metrics, spatial interactions

### Alerting Rules

Critical alerts are pre-configured:

```yaml
# Sample alert rule
- alert: HighRenderLatency
  expr: nerf_render_latency_ms > 10
  for: 2m
  labels:
    severity: warning
  annotations:
    description: "Render latency exceeds 10ms threshold"
```

## 🔐 Security Configuration

### Production Security Checklist

- [ ] **Secrets Management**: All secrets in environment variables
- [ ] **SSL/TLS**: Valid certificates with TLS 1.3
- [ ] **CORS Configuration**: Restrict origins to your domains
- [ ] **Rate Limiting**: Configured per endpoint
- [ ] **CSP Headers**: Content Security Policy enabled
- [ ] **Security Scanning**: Threat detection enabled
- [ ] **Compliance**: GDPR/CCPA/HIPAA validation active

### Security Features

The production deployment includes:

- **Advanced Threat Detection**: Real-time security monitoring
- **Compliance Engine**: Multi-regulatory compliance (GDPR, CCPA, HIPAA)
- **Data Encryption**: End-to-end encryption for spatial data
- **Access Control**: Role-based permissions
- **Audit Logging**: Comprehensive security event logging

## 📊 Performance Optimization

### GPU Performance Tuning

```bash
# Enable GPU persistence mode
sudo nvidia-smi -pm 1

# Set maximum performance mode
sudo nvidia-smi -ac 877,1215  # Adjust for your GPU

# Monitor GPU utilization
nvidia-smi dmon
```

### Memory Optimization

The application automatically configures:
- **Memory Pooling**: Pre-allocated GPU memory pools
- **Zero-Copy Operations**: Direct GPU memory access
- **Adaptive Compression**: Dynamic quality adjustment
- **Predictive Caching**: ML-based cache warming

### Network Optimization

```bash
# Increase network buffer sizes
echo 'net.core.rmem_max = 134217728' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 134217728' >> /etc/sysctl.conf
sysctl -p
```

## 🔄 Scaling and Load Balancing

### Horizontal Scaling

```bash
# Docker Compose scaling
docker-compose -f docker-compose.production.yml up -d --scale nerf-edge-kit=5

# Kubernetes scaling
kubectl scale deployment/nerf-edge-kit --replicas=10 -n nerf-edge-kit
```

### Auto-scaling Configuration

The deployment includes intelligent auto-scaling:

- **CPU-based**: Scale at 70% CPU utilization
- **Memory-based**: Scale at 80% memory utilization
- **Custom Metrics**: Render queue length, latency percentiles
- **Predictive Scaling**: ML-based workload prediction

## 🔧 Troubleshooting

### Common Issues

**GPU Not Detected:**
```bash
# Check GPU availability
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

**High Memory Usage:**
```bash
# Monitor memory usage
docker stats
kubectl top pods -n nerf-edge-kit
```

**SSL Certificate Issues:**
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout
```

### Log Analysis

```bash
# Docker logs
docker-compose -f docker-compose.production.yml logs -f nerf-edge-kit

# Kubernetes logs
kubectl logs -f deployment/nerf-edge-kit -n nerf-edge-kit

# Application logs
tail -f logs/nerf-edge-kit.log
```

## 🚀 Deployment Validation

### Automated Health Checks

The deployment script automatically validates:

1. **Service Health**: All health endpoints responding
2. **GPU Acceleration**: WebGPU/Vulkan functionality
3. **Spatial Computing**: Multi-user collaboration
4. **Security**: Threat detection active
5. **Performance**: Render latency within targets

### Manual Validation

```bash
# Test API endpoints
curl -f https://your-domain.com/health
curl -f https://your-domain.com/health/gpu
curl -f https://your-domain.com/metrics

# Load testing
ab -n 1000 -c 10 https://your-domain.com/api/render

# WebGPU validation
node scripts/validate-webgpu.js
```

## 📈 Continuous Deployment

### CI/CD Integration

The repository includes GitHub Actions workflows:

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production
on:
  push:
    tags: ['v*']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./scripts/deploy-production.sh kubernetes production ${{ github.ref_name }}
```

### Blue-Green Deployment

```bash
# Deploy to staging environment
kubectl apply -f kubernetes/staging-deployment.yaml

# Validate staging
./scripts/validate-deployment.sh staging

# Promote to production
kubectl patch service nerf-edge-kit-service -p '{"spec":{"selector":{"version":"blue"}}}'
```

## 🔗 Integration

### API Integration

The production deployment exposes RESTful APIs:

- **Render API**: `/api/v1/render` - Real-time NeRF rendering
- **Spatial API**: `/api/v1/spatial` - Multi-user spatial sync
- **Admin API**: `/api/v1/admin` - System management
- **Metrics API**: `/metrics` - Prometheus metrics

### WebSocket Support

Real-time spatial collaboration via WebSocket:

```javascript
const ws = new WebSocket('wss://your-domain.com/spatial');
ws.onmessage = (event) => {
  const spatialUpdate = JSON.parse(event.data);
  // Handle spatial synchronization
};
```

## 📞 Support

For production support:

1. **Documentation**: Check this guide and API documentation
2. **Monitoring**: Review Grafana dashboards and alerts
3. **Logs**: Analyze application and system logs
4. **Community**: Create GitHub issues for bugs/features
5. **Enterprise**: Contact for enterprise support options

---

**Last Updated**: 2025-08-23
**Version**: 4.0.0
**Deployment Status**: ✅ Production Ready