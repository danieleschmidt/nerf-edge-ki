# Deployment Guide

This guide covers deployment strategies for the nerf-edge-kit across different environments and platforms.

## Container Deployment

### Quick Start with Docker Compose

```bash
# Development environment
docker-compose up -d

# Production environment
docker-compose --profile production up -d
```

### Individual Services

```bash
# Web development
docker build --target development -t nerf-edge-kit:dev .
docker run -p 3000:3000 -v $(pwd):/app nerf-edge-kit:dev

# Production web server
docker build --target production-web -t nerf-edge-kit:web .
docker run -p 80:80 nerf-edge-kit:web

# Python training API
docker build --target production-api -t nerf-edge-kit:api .
docker run -p 8000:8000 nerf-edge-kit:api
```

## Platform-Specific Deployment

### Web Deployment

#### Static Hosting (Recommended for Web SDK)

```bash
# Build for production
npm run build

# Deploy to CDN/Static Host
# - Vercel: vercel --prod
# - Netlify: netlify deploy --prod --dir dist
# - AWS S3: aws s3 sync dist/ s3://your-bucket --delete
```

#### Progressive Web App (PWA)

```bash
# Enable PWA features in webpack config
npm run build:pwa

# Deploy with service worker support
```

### iOS Framework Distribution

#### CocoaPods

```ruby
# Podfile
pod 'NerfEdgeKit', '~> 1.0'
```

#### Swift Package Manager

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/your-org/nerf-edge-kit.git", from: "1.0.0")
]
```

### Python Package Distribution

#### PyPI

```bash
# Build Python package
python setup.py sdist bdist_wheel

# Upload to PyPI
twine upload dist/*
```

#### Conda

```bash
# Build conda package
conda build recipe/

# Upload to Anaconda Cloud
anaconda upload dist/nerf-edge-kit-*.tar.bz2
```

## Cloud Deployment

### AWS

#### ECS with Fargate

```yaml
# task-definition.json
{
  "family": "nerf-edge-kit",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "nerf-web",
      "image": "your-account.dkr.ecr.region.amazonaws.com/nerf-edge-kit:web",
      "portMappings": [{"containerPort": 80}],
      "essential": true
    }
  ]
}
```

#### Lambda@Edge for Global Distribution

```javascript
// lambda-edge-function.js
exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    
    // Route NeRF model requests to optimized endpoints
    if (request.uri.endsWith('.nerf')) {
        request.origin = {
            custom: {
                domainName: 'models.nerf-edge-kit.com',
                port: 443,
                protocol: 'https',
                path: '/models'
            }
        };
    }
    
    return request;
};
```

### Google Cloud Platform

#### Cloud Run

```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: nerf-edge-kit
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "100"
        run.googleapis.com/gpu-type: "nvidia-tesla-t4"
    spec:
      containers:
      - image: gcr.io/project-id/nerf-edge-kit:latest
        ports:
        - containerPort: 8080
        resources:
          limits:
            memory: "4Gi"
            cpu: "2"
            nvidia.com/gpu: "1"
```

### Azure

#### Container Instances

```yaml
# container-group.yaml
apiVersion: 2018-10-01
location: eastus
properties:
  containers:
  - name: nerf-web
    properties:
      image: yourregistry.azurecr.io/nerf-edge-kit:web
      ports:
      - port: 80
        protocol: TCP
      resources:
        requests:
          cpu: 1
          memoryInGB: 2
  osType: Linux
  ipAddress:
    type: Public
    ports:
    - port: 80
      protocol: TCP
```

## Kubernetes Deployment

### Helm Chart

```yaml
# values.yaml
replicaCount: 3

image:
  repository: nerf-edge-kit
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: nerf-edge-kit.example.com
      paths: ["/"]
  tls:
    - secretName: nerf-edge-kit-tls
      hosts: ["nerf-edge-kit.example.com"]

resources:
  limits:
    cpu: 2000m
    memory: 4Gi
    nvidia.com/gpu: 1
  requests:
    cpu: 1000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

### GPU Node Configuration

```yaml
# gpu-nodepool.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nvidia-device-plugin-config
data:
  config.yaml: |
    version: v1
    sharing:
      timeSlicing:
        resources:
        - name: nvidia.com/gpu
          replicas: 4
```

## Edge Deployment

### NVIDIA Jetson

```dockerfile
# Dockerfile.jetson
FROM nvcr.io/nvidia/l4t-pytorch:r35.2.1-pth2.0-py3

WORKDIR /app
COPY requirements-jetson.txt ./
RUN pip install -r requirements-jetson.txt

COPY . .
CMD ["python", "-m", "nerf_edge_kit.inference", "--device", "jetson"]
```

### Mobile App Integration

#### iOS App Store

```bash
# Build iOS framework
xcodebuild -project ios/NerfEdgeKit.xcodeproj \
  -scheme NerfEdgeKit \
  -configuration Release \
  -archivePath NerfEdgeKit.xcarchive \
  archive

# Create XCFramework for distribution
xcodebuild -create-xcframework \
  -archive NerfEdgeKit.xcarchive \
  -framework NerfEdgeKit.framework \
  -output NerfEdgeKit.xcframework
```

#### Android AAR

```bash
# Build Android Archive
./gradlew assembleRelease

# Publish to Maven Central
./gradlew publish
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        push: true
        tags: ${{ secrets.REGISTRY }}/nerf-edge-kit:${{ github.sha }}
        
    - name: Deploy to production
      run: |
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
        kubectl --kubeconfig=kubeconfig set image deployment/nerf-edge-kit \
          nerf-edge-kit=${{ secrets.REGISTRY }}/nerf-edge-kit:${{ github.sha }}
```

### Automated Release Process

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        
    - name: Semantic Release
      uses: cycjimmy/semantic-release-action@v3
      with:
        semantic_version: 19
        extra_plugins: |
          @semantic-release/changelog
          @semantic-release/git
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Monitoring and Observability

### Health Checks

```javascript
// health-check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      webgpu: checkWebGPUAvailability(),
      memory: checkMemoryUsage(),
      gpu: checkGPUStatus()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Performance Metrics

```yaml
# prometheus-config.yml
global:
  scrape_interval: 15s

scrape_configs:
- job_name: 'nerf-edge-kit'
  static_configs:
  - targets: ['nerf-edge-kit:8080']
  metrics_path: /metrics

rule_files:
- "nerf_alerts.yml"

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093
```

## Security Considerations

### Container Security

```dockerfile
# Security-hardened Dockerfile
FROM node:18-alpine

# Security updates
RUN apk upgrade --no-cache

# Non-root user
RUN adduser -D -s /bin/sh appuser
USER appuser

# Read-only root filesystem
VOLUME /app/data
VOLUME /app/logs

# Drop capabilities
LABEL seccomp="unconfined"
LABEL apparmor="unconfined"
```

### Secrets Management

```yaml
# kubernetes-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: nerf-edge-kit-secrets
type: Opaque
stringData:
  database-url: "postgresql://user:pass@host:5432/db"
  api-key: "your-api-key"
  jwt-secret: "your-jwt-secret"
```

## Performance Optimization

### CDN Configuration

```javascript
// CloudFlare Workers
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Cache NeRF models aggressively
  if (url.pathname.endsWith('.nerf')) {
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let response = await cache.match(cacheKey);
    
    if (!response) {
      response = await fetch(request);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'public, max-age=86400');
      response = new Response(response.body, { ...response, headers });
      
      event.waitUntil(cache.put(cacheKey, response.clone()));
    }
    
    return response;
  }
  
  return fetch(request);
}
```

### Load Balancing

```nginx
# nginx load balancer
upstream nerf_backend {
    least_conn;
    server nerf-api-1:8000 weight=3;
    server nerf-api-2:8000 weight=2;
    server nerf-api-3:8000 weight=1 backup;
}

server {
    listen 80;
    location / {
        proxy_pass http://nerf_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

1. **WebGPU Not Available**
   - Ensure browser supports WebGPU
   - Check hardware acceleration settings
   - Verify HTTPS deployment for WebGPU access

2. **High Memory Usage**
   - Monitor NeRF model size and batch sizes
   - Implement model quantization for edge deployment
   - Use memory pooling for GPU resources

3. **Slow Rendering Performance**
   - Profile GPU utilization
   - Optimize foveated rendering parameters
   - Check network latency for model streaming

### Debugging Tools

```bash
# Container debugging
docker exec -it nerf-edge-kit /bin/sh

# Kubernetes debugging
kubectl logs deployment/nerf-edge-kit
kubectl describe pod nerf-edge-kit-xxx

# Performance profiling
docker stats nerf-edge-kit
kubectl top pods
```

---

For deployment support, please refer to our [support documentation](../SUPPORT.md) or open an issue on GitHub.