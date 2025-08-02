# Runbook: NeRF Service Down

**Alert**: `NerfServiceDown`  
**Severity**: Critical  
**SLA Impact**: Yes - Service availability affected

## Overview

This alert fires when one or more NeRF Edge Kit services are completely unreachable or failing health checks for more than 1 minute.

## Immediate Actions (First 5 minutes)

### 1. Assess Impact
```bash
# Check which services are affected
kubectl get pods -l app=nerf-edge-kit
docker ps | grep nerf

# Check service status
curl -f http://nerf-web:3000/health
curl -f http://nerf-api:8000/health
```

### 2. Quick Recovery Actions
```bash
# Restart affected services
kubectl rollout restart deployment/nerf-web
kubectl rollout restart deployment/nerf-api

# Or with Docker Compose
docker-compose restart nerf-web nerf-api
```

### 3. Verify Recovery
```bash
# Check service health
for service in nerf-web nerf-api; do
  echo "Checking $service..."
  curl -f http://$service/health || echo "❌ $service still down"
done
```

## Investigation Steps

### 1. Check Service Logs
```bash
# Kubernetes
kubectl logs -l app=nerf-edge-kit --tail=100

# Docker
docker logs nerf-web --tail=100
docker logs nerf-api --tail=100

# Look for:
# - OutOfMemory errors
# - WebGPU initialization failures
# - Database connection errors
# - Certificate/SSL issues
```

### 2. Check Resource Availability
```bash
# Memory and CPU
kubectl top nodes
kubectl top pods

# Disk space
df -h

# GPU availability (if applicable)
nvidia-smi
```

### 3. Check Dependencies
```bash
# Database connectivity
kubectl exec -it postgres-pod -- psql -U nerf_user -d nerf_edge_kit -c "SELECT 1;"

# Redis connectivity
kubectl exec -it redis-pod -- redis-cli ping

# External API dependencies
curl -f https://api.external-service.com/health
```

## Common Causes and Solutions

### 1. OutOfMemory (OOM) Kills
**Symptoms**: Pods/containers restart unexpectedly, OOM messages in logs
```bash
# Check memory limits
kubectl describe pod nerf-web-xxx | grep -A5 -B5 "memory"

# Increase memory limits
kubectl patch deployment nerf-web -p '{"spec":{"template":{"spec":{"containers":[{"name":"nerf-web","resources":{"limits":{"memory":"4Gi"}}}]}}}}'
```

### 2. WebGPU Initialization Failure
**Symptoms**: "WebGPU not available" errors, rendering failures
```bash
# Check GPU drivers
nvidia-smi
lsmod | grep nvidia

# Verify WebGPU support in browser/runtime
# Enable GPU acceleration flags if needed
```

### 3. Database Connection Issues
**Symptoms**: "connection refused", "too many connections" errors
```bash
# Check PostgreSQL status
kubectl exec -it postgres-pod -- pg_isready

# Check connection limits
kubectl exec -it postgres-pod -- psql -U postgres -c "SHOW max_connections;"
kubectl exec -it postgres-pod -- psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database if needed
kubectl rollout restart deployment/postgres
```

### 4. SSL Certificate Expiration
**Symptoms**: SSL/TLS handshake failures, certificate errors
```bash
# Check certificate expiration
openssl s_client -connect nerf-edge-kit.com:443 -servername nerf-edge-kit.com | openssl x509 -noout -dates

# Renew certificates with cert-manager
kubectl delete certificaterequest --all -n nerf-edge-kit
kubectl delete order --all -n nerf-edge-kit
```

### 5. Configuration Issues
**Symptoms**: Invalid configuration errors, missing environment variables
```bash
# Check ConfigMaps and Secrets
kubectl get configmap -o yaml
kubectl get secret -o yaml

# Validate configuration
kubectl exec -it nerf-web-pod -- env | grep NERF_
```

## Recovery Procedures

### 1. Rolling Restart
```bash
# Graceful restart without downtime
kubectl rollout restart deployment/nerf-web
kubectl rollout restart deployment/nerf-api

# Wait for rollout to complete
kubectl rollout status deployment/nerf-web
kubectl rollout status deployment/nerf-api
```

### 2. Scaling Up Resources
```bash
# Increase replica count
kubectl scale deployment nerf-web --replicas=5
kubectl scale deployment nerf-api --replicas=3

# Increase resource limits
kubectl patch deployment nerf-web -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "nerf-web",
          "resources": {
            "limits": {"cpu": "2", "memory": "4Gi"},
            "requests": {"cpu": "1", "memory": "2Gi"}
          }
        }]
      }
    }
  }
}'
```

### 3. Emergency Maintenance Mode
```bash
# Enable maintenance mode
kubectl create configmap maintenance-mode --from-literal=enabled=true

# Deploy maintenance page
kubectl apply -f maintenance-page.yaml

# Notify users via status page
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth TOKEN" \
  -d "incident[name]=Service Maintenance" \
  -d "incident[status]=investigating"
```

## Escalation Criteria

### Escalate to Level 2 (Team Lead) if:
- Service remains down after 15 minutes of troubleshooting
- Multiple services are affected simultaneously
- Database or critical dependencies are compromised
- Security incident suspected

### Escalate to Level 3 (Engineering Manager) if:
- Service down for more than 1 hour
- Data corruption suspected
- Complete platform outage
- Customer-facing SLA breach

## Prevention Measures

### 1. Monitoring Improvements
```yaml
# Add more granular health checks
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

### 2. Resource Management
```yaml
# Set appropriate resource limits
resources:
  limits:
    cpu: "2"
    memory: "4Gi"
    nvidia.com/gpu: "1"
  requests:
    cpu: "1"
    memory: "2Gi"
```

### 3. Circuit Breakers
```typescript
// Implement circuit breaker pattern
const circuitBreaker = new CircuitBreaker(renderFunction, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

## Post-Incident Actions

### 1. Root Cause Analysis
- Document timeline of events
- Identify primary and contributing causes
- Review monitoring data and logs
- Interview on-call engineers

### 2. Preventive Measures
- Update monitoring thresholds
- Improve documentation
- Add/modify alerting rules
- Implement additional automation

### 3. Communication
- Update stakeholders on resolution
- Post-mortem meeting within 48 hours
- Update status page
- Document lessons learned

## Related Documentation

- [Health Check Implementation](../monitoring/health-checks.md)
- [Resource Limits Guide](../deployment/resource-management.md)
- [WebGPU Troubleshooting](../troubleshooting/webgpu.md)
- [Database Recovery Procedures](../runbooks/database-recovery.md)

## Contact Information

- **Primary On-Call**: Check PagerDuty schedule
- **Backup**: Engineering team Slack channel
- **Escalation**: Engineering Manager
- **Emergency**: Security team (for suspected breaches)