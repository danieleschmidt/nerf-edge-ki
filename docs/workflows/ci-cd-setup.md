# CI/CD Workflow Setup Guide

This document provides templates and instructions for setting up comprehensive CI/CD workflows for the nerf-edge-kit repository.

## Required GitHub Actions Workflows

The following workflows should be created in `.github/workflows/` directory:

### 1. Main CI Pipeline (`ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test-web:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  test-python:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      
      - name: Run linting
        run: |
          flake8 python/
          black --check python/
          mypy python/
      
      - name: Run tests
        run: python -m pytest --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  test-ios:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v4
      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_15.0.app
      
      - name: Build iOS framework
        run: |
          xcodebuild -project ios/NerfEdgeKit.xcodeproj \
                     -scheme NerfEdgeKit \
                     -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
                     build
      
      - name: Run iOS tests
        run: |
          xcodebuild test -project ios/NerfEdgeKit.xcodeproj \
                          -scheme NerfEdgeKitTests \
                          -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - name: Run security scan
        uses: securecodewarrior/github-action-add-sarif@v1
        with:
          sarif-file: security-scan-results.sarif
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

  build:
    needs: [test-web, test-python, test-ios]
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install and build
        run: |
          npm ci
          npm run build
      
      - name: Build Python package
        run: |
          python -m pip install --upgrade pip build
          python -m build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            dist/
            python/dist/
```

### 2. Release Pipeline (`release.yml`)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          npm ci
          pip install -r requirements.txt
          pip install build twine
      
      - name: Build packages
        run: |
          npm run build
          python -m build
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
      
      - name: Publish to NPM
        run: npm publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Publish to PyPI
        run: python -m twine upload python/dist/*
        env:
          TWINE_USERNAME: __token__
          TWINE_PASSWORD: ${{ secrets.PYPI_TOKEN }}
```

### 3. Performance Testing (`performance.yml`)

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run performance tests
        run: npm run test:perf
      
      - name: Upload benchmark results
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'jsben'
          output-file-path: benchmark-results.json
          github-token: ${{ secrets.GITHUB_TOKEN }}
          auto-push: true
```

## Required Secrets

Set up the following secrets in GitHub repository settings:

- `NPM_TOKEN`: NPM authentication token for publishing
- `PYPI_TOKEN`: PyPI API token for Python package publishing
- `CODECOV_TOKEN`: Codecov token for coverage reporting

## Branch Protection Rules

Configure the following branch protection rules for `main`:

1. **Require status checks**: All CI jobs must pass
2. **Require branches to be up to date**: Ensure clean merges
3. **Require pull request reviews**: At least 1 reviewer
4. **Dismiss stale reviews**: When new commits are pushed
5. **Require review from code owners**: If CODEOWNERS file exists
6. **Restrict pushes**: Only allow via pull requests

## Additional Integrations

### Code Quality Gates

- **Codecov**: Coverage threshold 70%
- **SonarCloud**: Quality gate for technical debt
- **Dependabot**: Automated dependency updates

### Security Scanning

- **GitHub Security**: Secret scanning and dependency vulnerabilities
- **Trivy**: Container and filesystem vulnerability scanning
- **CodeQL**: Semantic code analysis

### Performance Monitoring

- **Lighthouse CI**: Web performance regression testing
- **Bundle Analyzer**: JavaScript bundle size tracking
- **Benchmarking**: Automated performance regression detection

## Setup Instructions

1. Create the workflow files in `.github/workflows/`
2. Configure repository secrets
3. Set up branch protection rules
4. Enable required integrations (Codecov, etc.)
5. Test workflows with a test pull request

For detailed setup instructions, see individual workflow documentation.