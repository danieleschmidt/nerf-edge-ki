#!/bin/bash

# Build script for nerf-edge-kit
# Supports different build targets and configurations

set -e

# Default values
BUILD_TARGET="all"
BUILD_ENV="development"
VERBOSE=false
CLEAN=false
DOCKER_BUILD=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage information
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Build script for nerf-edge-kit multi-platform development.

OPTIONS:
    -t, --target TARGET     Build target (web, ios, python, all) [default: all]
    -e, --env ENV          Build environment (development, production) [default: development]
    -c, --clean            Clean build artifacts before building
    -d, --docker           Build using Docker containers
    -v, --verbose          Enable verbose output
    -h, --help             Show this help message

TARGETS:
    web                    Build TypeScript/WebGPU web components
    ios                    Build iOS/Swift framework (requires Xcode)
    python                 Build Python training components
    all                    Build all targets

EXAMPLES:
    $0                     Build all targets in development mode
    $0 -t web -e production  Build web components for production
    $0 -c -d               Clean build using Docker
    $0 -t ios -v           Build iOS framework with verbose output

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--target)
                BUILD_TARGET="$2"
                shift 2
                ;;
            -e|--env)
                BUILD_ENV="$2"
                shift 2
                ;;
            -c|--clean)
                CLEAN=true
                shift
                ;;
            -d|--docker)
                DOCKER_BUILD=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Python if building Python components
    if [[ "$BUILD_TARGET" == "python" || "$BUILD_TARGET" == "all" ]]; then
        if ! command -v python3 &> /dev/null; then
            print_error "Python 3 is not installed"
            exit 1
        fi
    fi
    
    # Check Xcode if building iOS components
    if [[ "$BUILD_TARGET" == "ios" || "$BUILD_TARGET" == "all" ]]; then
        if ! command -v xcodebuild &> /dev/null; then
            print_warning "Xcode is not installed, skipping iOS build"
            if [[ "$BUILD_TARGET" == "ios" ]]; then
                exit 1
            fi
        fi
    fi
    
    # Check Docker if using Docker build
    if [[ "$DOCKER_BUILD" == true ]]; then
        if ! command -v docker &> /dev/null; then
            print_error "Docker is not installed"
            exit 1
        fi
    fi
    
    print_success "Dependencies check passed"
}

# Clean build artifacts
clean_build() {
    if [[ "$CLEAN" == true ]]; then
        print_status "Cleaning build artifacts..."
        
        # Clean Node.js build artifacts
        rm -rf dist/
        rm -rf coverage/
        rm -rf .nyc_output/
        rm -rf node_modules/.cache/
        
        # Clean Python build artifacts
        rm -rf python/build/
        rm -rf python/dist/
        rm -rf python/**/__pycache__/
        rm -rf python/**/*.egg-info/
        
        # Clean iOS build artifacts
        if [[ -d "ios/build" ]]; then
            rm -rf ios/build/
        fi
        if [[ -d "ios/DerivedData" ]]; then
            rm -rf ios/DerivedData/
        fi
        
        print_success "Build artifacts cleaned"
    fi
}

# Build web components
build_web() {
    print_status "Building web components..."
    
    if [[ "$DOCKER_BUILD" == true ]]; then
        docker build --target web-builder -t nerf-edge-kit:web-builder .
        docker run --rm -v "$(pwd)/dist:/app/dist" nerf-edge-kit:web-builder npm run build
    else
        # Install dependencies if needed
        if [[ ! -d "node_modules" ]]; then
            print_status "Installing npm dependencies..."
            npm install
        fi
        
        # Run TypeScript compiler
        print_status "Running TypeScript compiler..."
        if [[ "$VERBOSE" == true ]]; then
            npm run typecheck
        else
            npm run typecheck > /dev/null 2>&1
        fi
        
        # Run webpack build
        print_status "Running webpack build..."
        if [[ "$BUILD_ENV" == "production" ]]; then
            NODE_ENV=production npm run build
        else
            npm run build
        fi
    fi
    
    print_success "Web components built successfully"
}

# Build iOS framework
build_ios() {
    if ! command -v xcodebuild &> /dev/null; then
        print_warning "Skipping iOS build (Xcode not available)"
        return 0
    fi
    
    print_status "Building iOS framework..."
    
    # Determine build configuration
    BUILD_CONFIG="Debug"
    if [[ "$BUILD_ENV" == "production" ]]; then
        BUILD_CONFIG="Release"
    fi
    
    # Build for simulator
    print_status "Building for iOS Simulator..."
    xcodebuild -project ios/NerfEdgeKit.xcodeproj \
               -scheme NerfEdgeKit \
               -configuration "$BUILD_CONFIG" \
               -sdk iphonesimulator \
               -destination "platform=iOS Simulator,name=iPhone 15 Pro" \
               build \
               ${VERBOSE:+-quiet}
    
    # Build for device (if certificates are available)
    if security find-identity -v -p codesigning | grep -q "iPhone Developer\|iPhone Distribution"; then
        print_status "Building for iOS Device..."
        xcodebuild -project ios/NerfEdgeKit.xcodeproj \
                   -scheme NerfEdgeKit \
                   -configuration "$BUILD_CONFIG" \
                   -sdk iphoneos \
                   build \
                   ${VERBOSE:+-quiet}
    else
        print_warning "iOS development certificates not found, skipping device build"
    fi
    
    print_success "iOS framework built successfully"
}

# Build Python components
build_python() {
    print_status "Building Python components..."
    
    if [[ "$DOCKER_BUILD" == true ]]; then
        docker build --target python-env -t nerf-edge-kit:python .
    else
        # Check for virtual environment
        if [[ ! -d "python/venv" ]]; then
            print_status "Creating Python virtual environment..."
            python3 -m venv python/venv
        fi
        
        # Activate virtual environment
        source python/venv/bin/activate
        
        # Install dependencies
        print_status "Installing Python dependencies..."
        pip install -r requirements.txt
        if [[ -f "requirements-dev.txt" ]]; then
            pip install -r requirements-dev.txt
        fi
        
        # Build package
        print_status "Building Python package..."
        cd python
        python setup.py build
        if [[ "$BUILD_ENV" == "production" ]]; then
            python setup.py sdist bdist_wheel
        fi
        cd ..
        
        # Deactivate virtual environment
        deactivate
    fi
    
    print_success "Python components built successfully"
}

# Run linting and formatting
run_linting() {
    print_status "Running linting and formatting..."
    
    # JavaScript/TypeScript linting
    if [[ "$BUILD_TARGET" == "web" || "$BUILD_TARGET" == "all" ]]; then
        npm run lint
        npm run format
    fi
    
    # Python linting
    if [[ "$BUILD_TARGET" == "python" || "$BUILD_TARGET" == "all" ]]; then
        if command -v flake8 &> /dev/null; then
            flake8 python/
        fi
        if command -v black &> /dev/null; then
            black python/
        fi
    fi
    
    # Swift linting (if available)
    if [[ "$BUILD_TARGET" == "ios" || "$BUILD_TARGET" == "all" ]]; then
        if command -v swiftlint &> /dev/null; then
            swiftlint ios/
        fi
    fi
    
    print_success "Linting and formatting completed"
}

# Run tests
run_tests() {
    if [[ "$BUILD_ENV" == "production" ]]; then
        print_status "Running tests..."
        
        # JavaScript/TypeScript tests
        if [[ "$BUILD_TARGET" == "web" || "$BUILD_TARGET" == "all" ]]; then
            npm test
        fi
        
        # Python tests
        if [[ "$BUILD_TARGET" == "python" || "$BUILD_TARGET" == "all" ]]; then
            if [[ -d "python/venv" ]]; then
                source python/venv/bin/activate
                python -m pytest python/tests/
                deactivate
            fi
        fi
        
        # iOS tests
        if [[ "$BUILD_TARGET" == "ios" || "$BUILD_TARGET" == "all" ]] && command -v xcodebuild &> /dev/null; then
            xcodebuild test \
                       -project ios/NerfEdgeKit.xcodeproj \
                       -scheme NerfEdgeKitTests \
                       -destination "platform=iOS Simulator,name=iPhone 15 Pro" \
                       ${VERBOSE:+-quiet}
        fi
        
        print_success "Tests completed successfully"
    fi
}

# Generate build report
generate_report() {
    print_status "Generating build report..."
    
    REPORT_FILE="build-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$REPORT_FILE" << EOF
{
  "build": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "target": "$BUILD_TARGET",
    "environment": "$BUILD_ENV",
    "docker": $DOCKER_BUILD,
    "clean": $CLEAN
  },
  "artifacts": {
EOF

    # Check for web artifacts
    if [[ -d "dist" ]]; then
        echo '    "web": {' >> "$REPORT_FILE"
        echo "      \"size\": \"$(du -sh dist/ | cut -f1)\"," >> "$REPORT_FILE"
        echo '      "files": [' >> "$REPORT_FILE"
        find dist/ -type f -name "*.js" -o -name "*.css" -o -name "*.html" | \
            sed 's/^/        "/' | sed 's/$/"/' | \
            sed '$!s/$/,/' >> "$REPORT_FILE"
        echo '      ]' >> "$REPORT_FILE"
        echo '    },' >> "$REPORT_FILE"
    fi
    
    echo '    "complete": true' >> "$REPORT_FILE"
    echo '  }' >> "$REPORT_FILE"
    echo '}' >> "$REPORT_FILE"
    
    print_success "Build report generated: $REPORT_FILE"
}

# Main build function
main() {
    print_status "Starting nerf-edge-kit build process..."
    print_status "Target: $BUILD_TARGET | Environment: $BUILD_ENV | Docker: $DOCKER_BUILD"
    
    # Start timer
    START_TIME=$(date +%s)
    
    # Run build steps
    check_dependencies
    clean_build
    run_linting
    
    # Build based on target
    case "$BUILD_TARGET" in
        web)
            build_web
            ;;
        ios)
            build_ios
            ;;
        python)
            build_python
            ;;
        all)
            build_web
            build_ios
            build_python
            ;;
        *)
            print_error "Unknown build target: $BUILD_TARGET"
            show_usage
            exit 1
            ;;
    esac
    
    run_tests
    generate_report
    
    # Calculate build time
    END_TIME=$(date +%s)
    BUILD_TIME=$((END_TIME - START_TIME))
    
    print_success "Build completed successfully in ${BUILD_TIME}s"
}

# Parse arguments and run main function
parse_args "$@"
main