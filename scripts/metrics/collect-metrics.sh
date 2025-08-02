#!/bin/bash

# Metrics Collection Script for nerf-edge-kit
# Collects comprehensive project metrics and updates project-metrics.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
METRICS_FILE="$PROJECT_ROOT/.github/project-metrics.json"
TEMP_FILE="/tmp/metrics-update.json"

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

# Check if required tools are available
check_dependencies() {
    local missing_tools=()
    
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    command -v cloc >/dev/null 2>&1 || missing_tools+=("cloc")
    command -v git >/dev/null 2>&1 || missing_tools+=("git")
    command -v node >/dev/null 2>&1 || missing_tools+=("node")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install missing tools before running this script"
        exit 1
    fi
}

# Initialize metrics file if it doesn't exist
init_metrics_file() {
    if [ ! -f "$METRICS_FILE" ]; then
        log_warning "Metrics file not found, initializing..."
        cp "$SCRIPT_DIR/../templates/project-metrics-template.json" "$METRICS_FILE"
    fi
}

# Collect lines of code metrics
collect_loc_metrics() {
    log_info "Collecting lines of code metrics..."
    
    cd "$PROJECT_ROOT"
    
    # Use cloc to count lines of code
    local cloc_output
    cloc_output=$(cloc . --json --exclude-dir=node_modules,dist,coverage,build,.git,.vscode,DerivedData 2>/dev/null || echo "{}")
    
    # Extract metrics
    local total_loc
    total_loc=$(echo "$cloc_output" | jq -r '.SUM.code // 0')
    
    local typescript_loc
    typescript_loc=$(echo "$cloc_output" | jq -r '.TypeScript.code // 0')
    
    local python_loc
    python_loc=$(echo "$cloc_output" | jq -r '.Python.code // 0')
    
    local swift_loc
    swift_loc=$(echo "$cloc_output" | jq -r '.Swift.code // 0')
    
    local doc_loc
    doc_loc=$(echo "$cloc_output" | jq -r '.Markdown.code // 0')
    
    # Update metrics file
    jq --argjson total "$total_loc" \
       --argjson ts "$typescript_loc" \
       --argjson py "$python_loc" \
       --argjson swift "$swift_loc" \
       --argjson docs "$doc_loc" \
       '.metrics.development.lines_of_code.total = $total |
        .metrics.development.lines_of_code.typescript = $ts |
        .metrics.development.lines_of_code.python = $py |
        .metrics.development.lines_of_code.swift = $swift |
        .metrics.development.lines_of_code.documentation = $docs' \
       "$METRICS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$METRICS_FILE"
    
    log_success "Lines of code metrics collected: $total_loc total lines"
}

# Collect test coverage metrics
collect_coverage_metrics() {
    log_info "Collecting test coverage metrics..."
    
    cd "$PROJECT_ROOT"
    
    # TypeScript/Web coverage
    local ts_coverage=0
    if [ -f "coverage/coverage-summary.json" ]; then
        ts_coverage=$(jq -r '.total.lines.pct // 0' coverage/coverage-summary.json)
    fi
    
    # Python coverage
    local py_coverage=0
    if [ -f "coverage.xml" ]; then
        py_coverage=$(python3 -c "
import xml.etree.ElementTree as ET
try:
    tree = ET.parse('coverage.xml')
    root = tree.getroot()
    coverage = root.get('line-rate', '0')
    print(int(float(coverage) * 100))
except:
    print(0)
" 2>/dev/null || echo "0")
    fi
    
    # Calculate overall coverage
    local overall_coverage
    overall_coverage=$(echo "($ts_coverage + $py_coverage) / 2" | bc -l 2>/dev/null || echo "0")
    overall_coverage=$(printf "%.0f" "$overall_coverage")
    
    # Update metrics file
    jq --argjson overall "$overall_coverage" \
       --argjson ts "$ts_coverage" \
       --argjson py "$py_coverage" \
       '.metrics.testing.coverage.overall = $overall |
        .metrics.testing.coverage.typescript = $ts |
        .metrics.testing.coverage.python = $py' \
       "$METRICS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$METRICS_FILE"
    
    log_success "Coverage metrics collected: ${overall_coverage}% overall"
}

# Collect Git activity metrics
collect_git_metrics() {
    log_info "Collecting Git activity metrics..."
    
    cd "$PROJECT_ROOT"
    
    # Total commits
    local total_commits
    total_commits=$(git rev-list --all --count 2>/dev/null || echo "0")
    
    # Commits in last 30 days
    local recent_commits
    recent_commits=$(git rev-list --since="30 days ago" --all --count 2>/dev/null || echo "0")
    
    # Contributors
    local contributors
    contributors=$(git shortlog -sn --all | wc -l 2>/dev/null || echo "0")
    
    # Update metrics file
    jq --argjson total "$total_commits" \
       --argjson recent "$recent_commits" \
       --argjson contrib "$contributors" \
       '.metrics.activity.commits.total = $total |
        .metrics.activity.commits.last_30_days = $recent |
        .metrics.activity.commits.contributors = [$contrib]' \
       "$METRICS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$METRICS_FILE"
    
    log_success "Git metrics collected: $total_commits commits, $contributors contributors"
}

# Collect dependency metrics
collect_dependency_metrics() {
    log_info "Collecting dependency metrics..."
    
    cd "$PROJECT_ROOT"
    
    local total_deps=0
    local outdated_deps=0
    
    # Node.js dependencies
    if [ -f "package.json" ]; then
        local npm_deps
        npm_deps=$(jq -r '(.dependencies // {}) + (.devDependencies // {}) | length' package.json 2>/dev/null || echo "0")
        total_deps=$((total_deps + npm_deps))
        
        # Check for outdated packages
        if command -v npm >/dev/null 2>&1; then
            local npm_outdated
            npm_outdated=$(npm outdated --json 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
            outdated_deps=$((outdated_deps + npm_outdated))
        fi
    fi
    
    # Python dependencies
    if [ -f "requirements.txt" ]; then
        local py_deps
        py_deps=$(grep -c "^[^#]" requirements.txt 2>/dev/null || echo "0")
        total_deps=$((total_deps + py_deps))
        
        # Check for outdated Python packages
        if command -v pip >/dev/null 2>&1; then
            local py_outdated
            py_outdated=$(pip list --outdated --format=json 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
            outdated_deps=$((outdated_deps + py_outdated))
        fi
    fi
    
    # Update metrics file
    jq --argjson total "$total_deps" \
       --argjson outdated "$outdated_deps" \
       '.metrics.security.dependencies.total = $total |
        .metrics.security.dependencies.outdated = $outdated' \
       "$METRICS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$METRICS_FILE"
    
    log_success "Dependency metrics collected: $total_deps total, $outdated_deps outdated"
}

# Collect performance metrics from recent benchmarks
collect_performance_metrics() {
    log_info "Collecting performance metrics..."
    
    cd "$PROJECT_ROOT"
    
    # Look for benchmark results
    local benchmark_file="benchmark-results.json"
    if [ -f "$benchmark_file" ]; then
        local web_fps
        web_fps=$(jq -r '.benchmarks[] | select(.name | contains("fps")) | .value // 0' "$benchmark_file" 2>/dev/null | head -1 || echo "0")
        
        local render_latency
        render_latency=$(jq -r '.benchmarks[] | select(.name | contains("latency")) | .value // 0' "$benchmark_file" 2>/dev/null | head -1 || echo "0")
        
        # Update metrics file
        jq --argjson fps "$web_fps" \
           --argjson latency "$render_latency" \
           '.metrics.performance.benchmarks.web_fps.current = $fps |
            .metrics.performance.benchmarks.render_latency_ms.p95 = $latency' \
           "$METRICS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$METRICS_FILE"
        
        log_success "Performance metrics collected: ${web_fps} FPS, ${render_latency}ms latency"
    else
        log_warning "No benchmark results found, skipping performance metrics"
    fi
}

# Collect bundle size metrics
collect_bundle_metrics() {
    log_info "Collecting bundle size metrics..."
    
    cd "$PROJECT_ROOT"
    
    if [ -d "dist" ]; then
        local bundle_size
        bundle_size=$(du -sk dist/ 2>/dev/null | cut -f1 || echo "0")
        
        # Check for gzipped size if available
        local gzipped_size=0
        if command -v gzip >/dev/null 2>&1; then
            local main_js
            main_js=$(find dist/ -name "*.js" -type f | head -1)
            if [ -n "$main_js" ]; then
                gzipped_size=$(gzip -c "$main_js" | wc -c 2>/dev/null || echo "0")
                gzipped_size=$((gzipped_size / 1024)) # Convert to KB
            fi
        fi
        
        # Update metrics file
        jq --argjson size "$bundle_size" \
           --argjson gzipped "$gzipped_size" \
           '.metrics.performance.benchmarks.bundle_size_kb.web = $size |
            .metrics.performance.benchmarks.bundle_size_kb.gzipped = $gzipped' \
           "$METRICS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$METRICS_FILE"
        
        log_success "Bundle metrics collected: ${bundle_size}KB total, ${gzipped_size}KB gzipped"
    else
        log_warning "No dist directory found, skipping bundle metrics"
    fi
}

# Update timestamp
update_timestamp() {
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    jq --arg ts "$timestamp" \
       '.last_updated = $ts' \
       "$METRICS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$METRICS_FILE"
}

# Generate summary report
generate_summary() {
    log_info "Generating metrics summary..."
    
    echo
    echo "=== NeRF Edge Kit Metrics Summary ==="
    echo
    
    # Lines of code
    local total_loc
    total_loc=$(jq -r '.metrics.development.lines_of_code.total' "$METRICS_FILE")
    echo "📊 Lines of Code: $total_loc"
    
    # Test coverage
    local coverage
    coverage=$(jq -r '.metrics.testing.coverage.overall' "$METRICS_FILE")
    echo "🧪 Test Coverage: ${coverage}%"
    
    # Git activity
    local commits
    commits=$(jq -r '.metrics.activity.commits.total' "$METRICS_FILE")
    local recent_commits
    recent_commits=$(jq -r '.metrics.activity.commits.last_30_days' "$METRICS_FILE")
    echo "📈 Git Activity: $commits total commits, $recent_commits in last 30 days"
    
    # Dependencies
    local total_deps
    total_deps=$(jq -r '.metrics.security.dependencies.total' "$METRICS_FILE")
    local outdated_deps
    outdated_deps=$(jq -r '.metrics.security.dependencies.outdated' "$METRICS_FILE")
    echo "📦 Dependencies: $total_deps total, $outdated_deps outdated"
    
    # Performance
    local fps
    fps=$(jq -r '.metrics.performance.benchmarks.web_fps.current' "$METRICS_FILE")
    if [ "$fps" != "0" ]; then
        echo "⚡ Performance: ${fps} FPS"
    fi
    
    echo
    echo "Last updated: $(jq -r '.last_updated' "$METRICS_FILE")"
    echo
}

# Main execution
main() {
    log_info "Starting metrics collection for nerf-edge-kit..."
    
    check_dependencies
    init_metrics_file
    
    collect_loc_metrics
    collect_coverage_metrics
    collect_git_metrics
    collect_dependency_metrics
    collect_performance_metrics
    collect_bundle_metrics
    
    update_timestamp
    generate_summary
    
    log_success "Metrics collection completed successfully!"
    log_info "Metrics saved to: $METRICS_FILE"
}

# Run main function
main "$@"