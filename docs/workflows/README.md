# GitHub Actions Workflows

This directory contains templates and documentation for CI/CD workflows.

> **Note**: As a Terragon agent, I cannot create actual GitHub Actions YAML files. These templates must be manually implemented.

## Required Workflows

### 1. CI Pipeline (`ci.yml`)

**Triggers**: Push to main, all PRs

**Jobs**:
- **Lint & Format**: ESLint, Prettier, Black, MyPy
- **Type Check**: TypeScript, Swift type validation
- **Unit Tests**: Jest (Web), XCTest (iOS), PyTest (Python)
- **Integration Tests**: Cross-platform compatibility
- **Security Scan**: CodeQL, dependency audit
- **Performance Tests**: Benchmark regressions

**Matrix Strategy**:
- Node.js: [18, 20]
- Python: [3.9, 3.10, 3.11]
- iOS: [17.0, latest]

### 2. Release Pipeline (`release.yml`)

**Triggers**: Tagged releases (v*)

**Jobs**:
- Build iOS framework
- Build NPM package
- Build Python wheel
- Generate documentation
- Create GitHub release
- Publish to registries

### 3. Security Scanning (`security.yml`)

**Schedule**: Daily at 02:00 UTC

**Jobs**:
- Dependency vulnerability scan
- SAST with CodeQL
- Container security scan
- License compliance check

### 4. Performance Monitoring (`performance.yml`)

**Triggers**: Main branch changes

**Jobs**:
- Benchmark iOS framework
- Benchmark web library
- Memory profiling
- Power consumption analysis
- Upload metrics to dashboard

## Secrets Required

- `NPM_TOKEN`: For NPM publishing
- `APPLE_DEVELOPER_ID`: For iOS framework signing
- `PYPI_TOKEN`: For Python package publishing
- `CODECOV_TOKEN`: For coverage reporting

## Environment Variables

- `NODE_VERSION`: Default Node.js version
- `PYTHON_VERSION`: Default Python version
- `IOS_VERSION`: Minimum iOS version

## Manual Setup Steps

1. Copy templates from this directory to `.github/workflows/`
2. Configure repository secrets
3. Enable branch protection rules
4. Set up status checks
5. Configure auto-merge rules

## Status Badges

Add these to your README.md:

```markdown
[![CI](https://github.com/your-org/nerf-edge-kit/workflows/CI/badge.svg)](https://github.com/your-org/nerf-edge-kit/actions)
[![Security](https://github.com/your-org/nerf-edge-kit/workflows/Security/badge.svg)](https://github.com/your-org/nerf-edge-kit/actions)
[![codecov](https://codecov.io/gh/your-org/nerf-edge-kit/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/nerf-edge-kit)
```