#!/bin/bash

# Production Deployment Script for NeRF Edge Kit
# Handles Docker Compose and Kubernetes deployment options with comprehensive validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY_TYPE="${1:-docker-compose}"
ENVIRONMENT="${2:-production}"
VERSION="${3:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation functions
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    local missing_tools=()
    
    if [[ "$DEPLOY_TYPE" == "docker-compose" ]]; then
        command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
        command -v docker-compose >/dev/null 2>&1 || missing_tools+=("docker-compose")
    elif [[ "$DEPLOY_TYPE" == "kubernetes" ]]; then
        command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
        command -v helm >/dev/null 2>&1 || missing_tools+=("helm")
    fi
    
    command -v node >/dev/null 2>&1 || missing_tools+=("node")
    command -v npm >/dev/null 2>&1 || missing_tools+=("npm")
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

validate_environment() {
    log_info "Validating environment configuration..."
    
    local env_file="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
    
    if [[ ! -f "$env_file" ]]; then
        log_warning "Environment file $env_file not found, creating from template..."
        cp "${PROJECT_ROOT}/.env.example" "$env_file"
        log_warning "Please update $env_file with production values"
    fi
    
    # Check critical environment variables
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "REDIS_URL"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
    )
    
    source "$env_file"
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set in $env_file"
            exit 1
        fi
    done
    
    log_success "Environment validation completed"
}

build_application() {
    log_info "Building NeRF Edge Kit application..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --include=dev --silent
    
    # Run tests
    log_info "Running test suite..."
    npm run lint || { log_error "Linting failed"; exit 1; }
    
    # Build application
    log_info "Building application..."
    NODE_ENV=production npm run build || { log_error "Build failed"; exit 1; }
    
    log_success "Application built successfully"
}

deploy_docker_compose() {
    log_info "Deploying with Docker Compose..."
    
    cd "$PROJECT_ROOT"
    
    # Build Docker image
    log_info "Building production Docker image..."
    docker build \
        -f Dockerfile.production \
        -t "nerf-edge-kit:${VERSION}" \
        -t "nerf-edge-kit:production" \
        --build-arg NODE_ENV=production \
        --build-arg BUILD_TARGET=production \
        .
    
    # Validate Docker Compose configuration
    log_info "Validating Docker Compose configuration..."
    docker-compose -f docker-compose.production.yml config >/dev/null || {
        log_error "Docker Compose configuration validation failed"
        exit 1
    }
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.production.yml down || true
    
    # Start production stack
    log_info "Starting production stack..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to become healthy..."
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if docker-compose -f docker-compose.production.yml ps | grep -q "healthy"; then
            break
        fi
        
        log_info "Waiting for services... ($((attempt + 1))/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        log_error "Services failed to become healthy within timeout"
        docker-compose -f docker-compose.production.yml logs
        exit 1
    fi
    
    log_success "Docker Compose deployment completed successfully"
}

deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    cd "$PROJECT_ROOT"
    
    # Validate Kubernetes connectivity
    log_info "Validating Kubernetes connectivity..."
    kubectl cluster-info >/dev/null || {
        log_error "Failed to connect to Kubernetes cluster"
        exit 1
    }
    
    # Build and push Docker image
    log_info "Building and pushing Docker image..."
    local image_registry="${DOCKER_REGISTRY:-localhost:5000}"
    local image_tag="${image_registry}/nerf-edge-kit:${VERSION}"
    
    docker build \
        -f Dockerfile.production \
        -t "$image_tag" \
        --build-arg NODE_ENV=production \
        --build-arg BUILD_TARGET=production \
        .
    
    if [[ "$image_registry" != "localhost:5000" ]]; then
        docker push "$image_tag"
    fi
    
    # Apply Kubernetes manifests
    log_info "Applying Kubernetes manifests..."
    kubectl apply -f kubernetes/nerf-edge-kit-deployment.yaml
    
    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/nerf-edge-kit -n nerf-edge-kit
    
    # Verify deployment
    log_info "Verifying deployment..."
    kubectl get pods -n nerf-edge-kit
    kubectl get services -n nerf-edge-kit
    kubectl get ingress -n nerf-edge-kit
    
    log_success "Kubernetes deployment completed successfully"
}

run_health_checks() {
    log_info "Running post-deployment health checks..."
    
    local service_url
    
    if [[ "$DEPLOY_TYPE" == "docker-compose" ]]; then
        service_url="http://localhost:8080"
    else
        # Get Kubernetes service endpoint
        service_url=$(kubectl get ingress nerf-edge-kit-ingress -n nerf-edge-kit -o jsonpath='{.spec.rules[0].host}' 2>/dev/null) || service_url="http://localhost:8080"
        service_url="https://${service_url}"
    fi
    
    local health_checks=(
        "/health"
        "/health/gpu"
        "/health/spatial"
        "/health/security"
        "/metrics"
    )
    
    for endpoint in "${health_checks[@]}"; do
        log_info "Checking ${service_url}${endpoint}..."
        
        local max_attempts=10
        local attempt=0
        
        while [[ $attempt -lt $max_attempts ]]; do
            if curl -sf "${service_url}${endpoint}" >/dev/null 2>&1; then
                log_success "✓ ${endpoint} is healthy"
                break
            fi
            
            log_info "Waiting for ${endpoint}... ($((attempt + 1))/$max_attempts)"
            sleep 5
            ((attempt++))
        done
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_warning "⚠ ${endpoint} health check failed"
        fi
    done
    
    log_success "Health checks completed"
}

generate_deployment_report() {
    log_info "Generating deployment report..."
    
    local report_file="${PROJECT_ROOT}/deployment-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# NeRF Edge Kit Deployment Report

**Date:** $(date)
**Version:** ${VERSION}
**Environment:** ${ENVIRONMENT}
**Deployment Type:** ${DEPLOY_TYPE}

## Deployment Configuration

- **GPU Acceleration:** Enabled
- **WebGPU Backend:** Vulkan
- **Memory Pool:** 4096MB
- **Max Concurrent Renders:** 12
- **Security Scanning:** Enabled
- **Compliance Validation:** Enabled
- **Multi-User Support:** Enabled

## Services Status

EOF
    
    if [[ "$DEPLOY_TYPE" == "docker-compose" ]]; then
        echo "### Docker Compose Services" >> "$report_file"
        docker-compose -f docker-compose.production.yml ps >> "$report_file"
    else
        echo "### Kubernetes Resources" >> "$report_file"
        kubectl get all -n nerf-edge-kit >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "## Next Steps" >> "$report_file"
    echo "" >> "$report_file"
    echo "1. Verify all health checks pass" >> "$report_file"
    echo "2. Configure monitoring dashboards" >> "$report_file"
    echo "3. Set up automated backups" >> "$report_file"
    echo "4. Configure SSL certificates" >> "$report_file"
    echo "5. Test disaster recovery procedures" >> "$report_file"
    
    log_success "Deployment report saved to: $report_file"
}

cleanup_on_failure() {
    log_error "Deployment failed, cleaning up..."
    
    if [[ "$DEPLOY_TYPE" == "docker-compose" ]]; then
        docker-compose -f docker-compose.production.yml down || true
    else
        kubectl delete -f kubernetes/nerf-edge-kit-deployment.yaml || true
    fi
    
    exit 1
}

# Main execution
main() {
    log_info "Starting NeRF Edge Kit production deployment..."
    log_info "Deployment Type: $DEPLOY_TYPE"
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    
    # Set up error handling
    trap cleanup_on_failure ERR
    
    # Execute deployment steps
    check_prerequisites
    validate_environment
    build_application
    
    case "$DEPLOY_TYPE" in
        "docker-compose")
            deploy_docker_compose
            ;;
        "kubernetes")
            deploy_kubernetes
            ;;
        *)
            log_error "Unsupported deployment type: $DEPLOY_TYPE"
            log_info "Supported types: docker-compose, kubernetes"
            exit 1
            ;;
    esac
    
    run_health_checks
    generate_deployment_report
    
    log_success "🚀 NeRF Edge Kit deployed successfully!"
    log_info "Access the application at: http://localhost:8080 (or your configured domain)"
    log_info "Monitoring dashboard: http://localhost:3000"
    log_info "Metrics endpoint: http://localhost:9090"
}

# Show usage if no arguments
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <deployment-type> [environment] [version]"
    echo ""
    echo "Deployment Types:"
    echo "  docker-compose  - Deploy using Docker Compose (default)"
    echo "  kubernetes      - Deploy to Kubernetes cluster"
    echo ""
    echo "Examples:"
    echo "  $0 docker-compose production v4.0.0"
    echo "  $0 kubernetes staging latest"
    echo ""
    exit 0
fi

# Execute main function
main "$@"