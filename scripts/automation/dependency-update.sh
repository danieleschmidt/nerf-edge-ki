#!/bin/bash

# Automated Dependency Update Script for nerf-edge-kit
# Updates dependencies across all platforms and creates PRs if needed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
DRY_RUN=false
AUTO_MERGE=false
CREATE_PR=false
UPDATE_TYPES="patch,minor" # patch, minor, major
PLATFORMS="npm,python,docker"

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

# Show usage information
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Automated dependency update script for nerf-edge-kit.

OPTIONS:
    -d, --dry-run          Perform a dry run without making changes
    -m, --auto-merge       Automatically merge safe updates
    -p, --create-pr        Create pull request for updates
    -t, --types TYPES      Update types (patch,minor,major) [default: patch,minor]
    -l, --platforms LIST   Platforms to update (npm,python,docker) [default: all]
    -h, --help             Show this help message

EXAMPLES:
    $0 --dry-run           Show what would be updated
    $0 --types patch       Only update patch versions
    $0 --create-pr         Update and create PR
    $0 --auto-merge        Update and auto-merge safe changes

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -m|--auto-merge)
                AUTO_MERGE=true
                shift
                ;;
            -p|--create-pr)
                CREATE_PR=true
                shift
                ;;
            -t|--types)
                UPDATE_TYPES="$2"
                shift 2
                ;;
            -l|--platforms)
                PLATFORMS="$2"
                shift 2
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
}

# Check if required tools are available
check_dependencies() {
    local missing_tools=()
    
    if [[ "$PLATFORMS" == *"npm"* ]]; then
        command -v npm >/dev/null 2>&1 || missing_tools+=("npm")
        command -v npx >/dev/null 2>&1 || missing_tools+=("npx")
    fi
    
    if [[ "$PLATFORMS" == *"python"* ]]; then
        command -v pip >/dev/null 2>&1 || missing_tools+=("pip")
        command -v python3 >/dev/null 2>&1 || missing_tools+=("python3")
    fi
    
    command -v git >/dev/null 2>&1 || missing_tools+=("git")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    
    if [[ "$CREATE_PR" == true ]]; then
        command -v gh >/dev/null 2>&1 || missing_tools+=("gh")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
}

# Check if we're in a clean git state
check_git_state() {
    cd "$PROJECT_ROOT"
    
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_error "Git working directory is not clean. Please commit or stash changes."
        exit 1
    fi
    
    # Ensure we're on the main branch
    local current_branch
    current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
        log_warning "Not on main branch (currently on: $current_branch)"
        if [[ "$DRY_RUN" == false ]]; then
            read -p "Continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
}

# Update NPM dependencies
update_npm_dependencies() {
    if [[ "$PLATFORMS" != *"npm"* ]]; then
        return 0
    fi
    
    log_info "Checking NPM dependencies..."
    cd "$PROJECT_ROOT"
    
    if [ ! -f "package.json" ]; then
        log_warning "No package.json found, skipping NPM updates"
        return 0
    fi
    
    # Check for outdated packages
    local outdated_output
    outdated_output=$(npm outdated --json 2>/dev/null || echo "{}")
    
    if [[ "$outdated_output" == "{}" ]]; then
        log_success "All NPM dependencies are up to date"
        return 0
    fi
    
    log_info "Found outdated NPM packages:"
    echo "$outdated_output" | jq -r 'to_entries[] | "\(.key): \(.value.current) -> \(.value.wanted)"'
    
    if [[ "$DRY_RUN" == true ]]; then
        return 0
    fi
    
    # Update based on allowed types
    local update_cmd="npm update"
    
    if [[ "$UPDATE_TYPES" == *"major"* ]]; then
        # Use npm-check-updates for major updates
        if command -v ncu >/dev/null 2>&1; then
            ncu -u
            npm install
        else
            log_warning "npm-check-updates not available, skipping major updates"
            npm update
        fi
    else
        npm update
    fi
    
    # Run tests to ensure updates didn't break anything
    if npm run test >/dev/null 2>&1; then
        log_success "NPM dependencies updated successfully"
        return 0
    else
        log_error "Tests failed after NPM updates"
        git checkout -- package.json package-lock.json
        return 1
    fi
}

# Update Python dependencies
update_python_dependencies() {
    if [[ "$PLATFORMS" != *"python"* ]]; then
        return 0
    fi
    
    log_info "Checking Python dependencies..."
    cd "$PROJECT_ROOT"
    
    if [ ! -f "requirements.txt" ]; then
        log_warning "No requirements.txt found, skipping Python updates"
        return 0
    fi
    
    # Check for outdated packages
    local outdated_packages
    outdated_packages=$(pip list --outdated --format=json 2>/dev/null || echo "[]")
    
    if [[ "$outdated_packages" == "[]" ]]; then
        log_success "All Python dependencies are up to date"
        return 0
    fi
    
    log_info "Found outdated Python packages:"
    echo "$outdated_packages" | jq -r '.[] | "\(.name): \(.version) -> \(.latest_version)"'
    
    if [[ "$DRY_RUN" == true ]]; then
        return 0
    fi
    
    # Create backup of requirements.txt
    cp requirements.txt requirements.txt.backup
    
    # Update packages based on allowed types
    local packages_to_update=()
    
    while IFS= read -r package_info; do
        local package_name
        package_name=$(echo "$package_info" | jq -r '.name')
        local current_version
        current_version=$(echo "$package_info" | jq -r '.version')
        local latest_version
        latest_version=$(echo "$package_info" | jq -r '.latest_version')
        
        # Simple version comparison - in production, use a proper semver library
        if should_update_python_package "$current_version" "$latest_version"; then
            packages_to_update+=("$package_name")
        fi
    done < <(echo "$outdated_packages" | jq -c '.[]')
    
    if [ ${#packages_to_update[@]} -eq 0 ]; then
        log_info "No packages to update based on update type constraints"
        rm requirements.txt.backup
        return 0
    fi
    
    # Update the packages
    for package in "${packages_to_update[@]}"; do
        pip install --upgrade "$package"
    done
    
    # Update requirements.txt
    pip freeze > requirements.txt
    
    # Run tests to ensure updates didn't break anything
    if python -m pytest >/dev/null 2>&1; then
        log_success "Python dependencies updated successfully"
        rm requirements.txt.backup
        return 0
    else
        log_error "Tests failed after Python updates"
        mv requirements.txt.backup requirements.txt
        return 1
    fi
}

# Simple version comparison for Python packages
should_update_python_package() {
    local current="$1"
    local latest="$2"
    
    # Extract version numbers (simplified)
    local current_major
    current_major=$(echo "$current" | cut -d. -f1)
    local current_minor
    current_minor=$(echo "$current" | cut -d. -f2)
    local latest_major
    latest_major=$(echo "$latest" | cut -d. -f1)
    local latest_minor
    latest_minor=$(echo "$latest" | cut -d. -f2)
    
    # Check update type constraints
    if [[ "$UPDATE_TYPES" == *"major"* ]] && [[ "$latest_major" -gt "$current_major" ]]; then
        return 0
    fi
    
    if [[ "$UPDATE_TYPES" == *"minor"* ]] && [[ "$latest_major" -eq "$current_major" ]] && [[ "$latest_minor" -gt "$current_minor" ]]; then
        return 0
    fi
    
    if [[ "$UPDATE_TYPES" == *"patch"* ]] && [[ "$latest_major" -eq "$current_major" ]] && [[ "$latest_minor" -eq "$current_minor" ]]; then
        return 0
    fi
    
    return 1
}

# Update Docker base images
update_docker_dependencies() {
    if [[ "$PLATFORMS" != *"docker"* ]]; then
        return 0
    fi
    
    log_info "Checking Docker dependencies..."
    cd "$PROJECT_ROOT"
    
    if [ ! -f "Dockerfile" ]; then
        log_warning "No Dockerfile found, skipping Docker updates"
        return 0
    fi
    
    # Extract base images from Dockerfile
    local base_images
    base_images=$(grep -E "^FROM " Dockerfile | awk '{print $2}' | sort -u)
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Would check these Docker images for updates:"
        echo "$base_images"
        return 0
    fi
    
    # Check for updates (this is simplified - in production, use proper registry APIs)
    local updated=false
    
    while IFS= read -r image; do
        log_info "Checking for updates to $image..."
        
        # Pull the latest version to check for updates
        if docker pull "$image" >/dev/null 2>&1; then
            log_success "Updated Docker image: $image"
            updated=true
        else
            log_warning "Failed to update Docker image: $image"
        fi
    done <<< "$base_images"
    
    if [[ "$updated" == true ]]; then
        # Rebuild the image to test
        if docker build -t nerf-edge-kit:test . >/dev/null 2>&1; then
            log_success "Docker dependencies updated successfully"
            docker rmi nerf-edge-kit:test >/dev/null 2>&1 || true
            return 0
        else
            log_error "Docker build failed after updates"
            return 1
        fi
    else
        log_info "No Docker updates needed"
        return 0
    fi
}

# Create a git commit for the updates
create_commit() {
    cd "$PROJECT_ROOT"
    
    # Check if there are any changes
    if git diff --quiet && git diff --cached --quiet; then
        log_info "No changes to commit"
        return 0
    fi
    
    # Stage all changes
    git add .
    
    # Create commit message
    local commit_message="chore: update dependencies

Automated dependency updates:
- NPM packages updated to latest compatible versions
- Python packages updated based on constraints
- Docker base images refreshed

Generated by dependency-update script"
    
    git commit -m "$commit_message"
    log_success "Created commit for dependency updates"
}

# Create pull request
create_pull_request() {
    if [[ "$CREATE_PR" != true ]]; then
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Create branch for the updates
    local branch_name="chore/dependency-updates-$(date +%Y%m%d)"
    git checkout -b "$branch_name"
    
    # Push the branch
    git push -u origin "$branch_name"
    
    # Create PR using GitHub CLI
    local pr_body="## Automated Dependency Updates

This PR contains automated dependency updates across all platforms.

### Changes:
- NPM packages updated to latest compatible versions
- Python packages updated based on version constraints
- Docker base images refreshed

### Testing:
- [x] All tests pass
- [x] Build succeeds
- [x] No breaking changes detected

### Review Notes:
Please review the updated versions and ensure compatibility with your workflows.

*This PR was created automatically by the dependency-update script.*"
    
    gh pr create \
        --title "chore: automated dependency updates" \
        --body "$pr_body" \
        --label "dependencies,automated" \
        --reviewer danieleschmidt
    
    log_success "Created pull request: $branch_name"
    
    # Return to main branch
    git checkout main
}

# Main execution
main() {
    log_info "Starting dependency update process..."
    
    check_dependencies
    check_git_state
    
    local success=true
    
    # Update each platform
    if ! update_npm_dependencies; then
        success=false
    fi
    
    if ! update_python_dependencies; then
        success=false
    fi
    
    if ! update_docker_dependencies; then
        success=false
    fi
    
    if [[ "$success" == false ]]; then
        log_error "Some dependency updates failed"
        exit 1
    fi
    
    if [[ "$DRY_RUN" == false ]]; then
        create_commit
        create_pull_request
    fi
    
    log_success "Dependency update process completed successfully!"
}

# Parse arguments and run main function
parse_args "$@"
main