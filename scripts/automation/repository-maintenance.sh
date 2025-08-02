#!/bin/bash

# Repository Maintenance Script for nerf-edge-kit
# Performs routine maintenance tasks to keep the repository healthy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/tmp/repo-maintenance.log"

# Configuration
CLEANUP_BRANCHES=true
CLEANUP_ARTIFACTS=true
UPDATE_DOCS=true
CHECK_LINKS=true
ANALYZE_PERFORMANCE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Initialize log file
init_log() {
    echo "Repository Maintenance Log - $(date)" > "$LOG_FILE"
    echo "========================================" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

# Clean up merged branches
cleanup_merged_branches() {
    if [[ "$CLEANUP_BRANCHES" != true ]]; then
        return 0
    fi
    
    log_info "Cleaning up merged branches..."
    cd "$PROJECT_ROOT"
    
    # Get current branch
    local current_branch
    current_branch=$(git branch --show-current)
    
    # Find merged branches (excluding main/master and current branch)
    local merged_branches
    merged_branches=$(git branch --merged | grep -v -E "(main|master|\*|$current_branch)" | tr -d ' ' || true)
    
    if [ -z "$merged_branches" ]; then
        log_info "No merged branches to clean up"
        return 0
    fi
    
    local count=0
    while IFS= read -r branch; do
        if [ -n "$branch" ]; then
            log_info "Deleting merged branch: $branch"
            git branch -d "$branch" 2>/dev/null || log_warning "Failed to delete branch: $branch"
            ((count++))
        fi
    done <<< "$merged_branches"
    
    # Clean up remote tracking branches
    git remote prune origin 2>/dev/null || true
    
    log_success "Cleaned up $count merged branches"
}

# Clean up build artifacts and temporary files
cleanup_artifacts() {
    if [[ "$CLEANUP_ARTIFACTS" != true ]]; then
        return 0
    fi
    
    log_info "Cleaning up build artifacts and temporary files..."
    cd "$PROJECT_ROOT"
    
    local initial_size
    initial_size=$(du -sh . 2>/dev/null | cut -f1 || echo "unknown")
    
    # Clean Node.js artifacts
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        log_info "Cleaned Node.js cache"
    fi
    
    if [ -d "dist" ]; then
        rm -rf dist
        log_info "Cleaned dist directory"
    fi
    
    if [ -d "coverage" ]; then
        rm -rf coverage
        log_info "Cleaned coverage directory"
    fi
    
    # Clean Python artifacts
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
    
    if [ -d "python/build" ]; then
        rm -rf python/build
        log_info "Cleaned Python build directory"
    fi
    
    if [ -d "python/dist" ]; then
        rm -rf python/dist
        log_info "Cleaned Python dist directory"
    fi
    
    # Clean iOS artifacts
    if [ -d "ios/build" ]; then
        rm -rf ios/build
        log_info "Cleaned iOS build directory"
    fi
    
    if [ -d "ios/DerivedData" ]; then
        rm -rf ios/DerivedData
        log_info "Cleaned iOS DerivedData"
    fi
    
    # Clean temporary files
    find . -name "*.tmp" -delete 2>/dev/null || true
    find . -name "*.log" -not -path "./logs/*" -delete 2>/dev/null || true
    find . -name ".DS_Store" -delete 2>/dev/null || true
    
    # Clean Docker artifacts (if Docker is available)
    if command -v docker >/dev/null 2>&1; then
        local unused_images
        unused_images=$(docker images -f "dangling=true" -q 2>/dev/null || true)
        if [ -n "$unused_images" ]; then
            docker rmi $unused_images >/dev/null 2>&1 || true
            log_info "Cleaned unused Docker images"
        fi
    fi
    
    local final_size
    final_size=$(du -sh . 2>/dev/null | cut -f1 || echo "unknown")
    
    log_success "Cleanup completed. Size: $initial_size -> $final_size"
}

# Update documentation
update_documentation() {
    if [[ "$UPDATE_DOCS" != true ]]; then
        return 0
    fi
    
    log_info "Updating documentation..."
    cd "$PROJECT_ROOT"
    
    # Update README if it has outdated information
    if [ -f "README.md" ]; then
        # Check if package.json version matches README
        if [ -f "package.json" ]; then
            local pkg_version
            pkg_version=$(jq -r '.version // "unknown"' package.json 2>/dev/null || echo "unknown")
            
            # Simple check for version consistency
            if ! grep -q "$pkg_version" README.md 2>/dev/null; then
                log_warning "Package version ($pkg_version) not found in README.md"
            fi
        fi
    fi
    
    # Generate API documentation if tools are available
    if command -v typedoc >/dev/null 2>&1 && [ -f "tsconfig.json" ]; then
        log_info "Generating TypeScript API documentation..."
        npx typedoc --out docs/api src/ >/dev/null 2>&1 || log_warning "Failed to generate TypeScript docs"
    fi
    
    # Generate Python documentation if tools are available
    if command -v sphinx-build >/dev/null 2>&1 && [ -d "python/docs" ]; then
        log_info "Generating Python API documentation..."
        cd python/docs
        make html >/dev/null 2>&1 || log_warning "Failed to generate Python docs"
        cd "$PROJECT_ROOT"
    fi
    
    log_success "Documentation update completed"
}

# Check for broken links in documentation
check_documentation_links() {
    if [[ "$CHECK_LINKS" != true ]]; then
        return 0
    fi
    
    log_info "Checking documentation links..."
    cd "$PROJECT_ROOT"
    
    # Find all markdown files
    local md_files
    md_files=$(find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || true)
    
    local broken_links=0
    
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            # Extract links from markdown files
            local links
            links=$(grep -oE '\[.*\]\([^)]+\)' "$file" 2>/dev/null | sed 's/.*](//' | sed 's/)//' || true)
            
            while IFS= read -r link; do
                if [ -n "$link" ]; then
                    # Check internal links (relative paths)
                    if [[ "$link" != http* ]] && [[ "$link" != "#"* ]]; then
                        local link_path
                        link_path=$(dirname "$file")/"$link"
                        if [ ! -f "$link_path" ] && [ ! -d "$link_path" ]; then
                            log_warning "Broken internal link in $file: $link"
                            ((broken_links++))
                        fi
                    fi
                fi
            done <<< "$links"
        fi
    done <<< "$md_files"
    
    if [ "$broken_links" -eq 0 ]; then
        log_success "No broken internal links found"
    else
        log_warning "Found $broken_links broken internal links"
    fi
}

# Analyze repository performance and health
analyze_repository_health() {
    if [[ "$ANALYZE_PERFORMANCE" != true ]]; then
        return 0
    fi
    
    log_info "Analyzing repository health..."
    cd "$PROJECT_ROOT"
    
    # Repository size analysis
    local repo_size
    repo_size=$(du -sh . 2>/dev/null | cut -f1 || echo "unknown")
    log_info "Repository size: $repo_size"
    
    # Git repository analysis
    local total_commits
    total_commits=$(git rev-list --all --count 2>/dev/null || echo "0")
    local recent_commits
    recent_commits=$(git rev-list --since="30 days ago" --all --count 2>/dev/null || echo "0")
    local contributors
    contributors=$(git shortlog -sn --all | wc -l 2>/dev/null || echo "0")
    
    log_info "Git stats: $total_commits total commits, $recent_commits recent, $contributors contributors"
    
    # Large files detection
    local large_files
    large_files=$(find . -type f -size +10M -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null || true)
    
    if [ -n "$large_files" ]; then
        log_warning "Large files detected (>10MB):"
        while IFS= read -r file; do
            if [ -n "$file" ]; then
                local size
                size=$(du -sh "$file" 2>/dev/null | cut -f1 || echo "unknown")
                log_warning "  $file ($size)"
            fi
        done <<< "$large_files"
    else
        log_success "No large files detected"
    fi
    
    # Code quality metrics (if tools are available)
    if command -v cloc >/dev/null 2>&1; then
        local loc_summary
        loc_summary=$(cloc . --exclude-dir=node_modules,dist,coverage,build,.git --quiet 2>/dev/null | tail -n +3 | head -n -2 || echo "Unable to calculate")
        log_info "Lines of code summary:"
        echo "$loc_summary" | while IFS= read -r line; do
            if [ -n "$line" ]; then
                log_info "  $line"
            fi
        done
    fi
    
    # Security analysis
    if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
        local audit_result
        audit_result=$(npm audit --audit-level=moderate --json 2>/dev/null || echo '{"vulnerabilities": {}}')
        local vuln_count
        vuln_count=$(echo "$audit_result" | jq '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")
        
        if [ "$vuln_count" -gt 0 ]; then
            log_warning "Found $vuln_count npm vulnerabilities"
        else
            log_success "No npm vulnerabilities found"
        fi
    fi
}

# Generate maintenance report
generate_report() {
    log_info "Generating maintenance report..."
    
    local report_file="$PROJECT_ROOT/maintenance-report-$(date +%Y%m%d).md"
    
    cat > "$report_file" << EOF
# Repository Maintenance Report

**Date**: $(date)
**Repository**: nerf-edge-kit

## Maintenance Tasks Completed

EOF
    
    if [[ "$CLEANUP_BRANCHES" == true ]]; then
        echo "- ✅ Cleaned up merged branches" >> "$report_file"
    fi
    
    if [[ "$CLEANUP_ARTIFACTS" == true ]]; then
        echo "- ✅ Cleaned up build artifacts and temporary files" >> "$report_file"
    fi
    
    if [[ "$UPDATE_DOCS" == true ]]; then
        echo "- ✅ Updated documentation" >> "$report_file"
    fi
    
    if [[ "$CHECK_LINKS" == true ]]; then
        echo "- ✅ Checked documentation links" >> "$report_file"
    fi
    
    if [[ "$ANALYZE_PERFORMANCE" == true ]]; then
        echo "- ✅ Analyzed repository health" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

## Repository Health Summary

$(cd "$PROJECT_ROOT" && git log --oneline -n 5)

## Recommendations

- Regular dependency updates
- Monitor repository size growth
- Keep documentation up to date
- Address any security vulnerabilities promptly

## Full Log

\`\`\`
$(cat "$LOG_FILE")
\`\`\`

---
*Generated by repository-maintenance script*
EOF
    
    log_success "Maintenance report generated: $report_file"
}

# Main execution
main() {
    init_log
    log_info "Starting repository maintenance for nerf-edge-kit..."
    
    cleanup_merged_branches
    cleanup_artifacts
    update_documentation
    check_documentation_links
    analyze_repository_health
    generate_report
    
    log_success "Repository maintenance completed successfully!"
    log_info "Full log available at: $LOG_FILE"
}

# Show usage information
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Repository maintenance script for nerf-edge-kit.

OPTIONS:
    --no-cleanup-branches    Skip branch cleanup
    --no-cleanup-artifacts   Skip artifact cleanup
    --no-update-docs         Skip documentation updates
    --no-check-links         Skip link checking
    --no-analyze             Skip health analysis
    -h, --help               Show this help message

EXAMPLES:
    $0                       Run all maintenance tasks
    $0 --no-cleanup-branches Skip branch cleanup
    $0 --no-analyze          Skip health analysis

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cleanup-branches)
            CLEANUP_BRANCHES=false
            shift
            ;;
        --no-cleanup-artifacts)
            CLEANUP_ARTIFACTS=false
            shift
            ;;
        --no-update-docs)
            UPDATE_DOCS=false
            shift
            ;;
        --no-check-links)
            CHECK_LINKS=false
            shift
            ;;
        --no-analyze)
            ANALYZE_PERFORMANCE=false
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main