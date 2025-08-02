# Manual Setup Required

This document lists the manual setup steps that need to be performed by repository maintainers due to GitHub App permission limitations.

## GitHub Workflows

⚠️ **CRITICAL**: Due to GitHub App permission limitations, workflow files have been prepared for manual deployment.

### 1. Ready-to-Deploy Workflow Files

Production-ready workflow files are available in:
- `docs/workflows/ready-to-deploy/ci.yml` - Complete CI pipeline
- `docs/workflows/ready-to-deploy/release.yml` - Automated release pipeline  
- `docs/workflows/ready-to-deploy/README.md` - Deployment instructions

### 2. Manual Deployment Steps

Repository maintainers with `workflows` permission should:

```bash
# Create workflows directory
mkdir -p .github/workflows

# Copy ready-to-deploy files
cp docs/workflows/ready-to-deploy/ci.yml .github/workflows/
cp docs/workflows/ready-to-deploy/release.yml .github/workflows/

# Commit and deploy
git add .github/workflows/
git commit -m "feat: deploy GitHub Actions CI/CD workflows"
git push origin main
```

### 3. Alternative: Copy from Examples

Fallback option using example templates:

```bash
cp docs/workflows/examples/ci.yml .github/workflows/
cp docs/workflows/examples/release.yml .github/workflows/
```

### 2. Additional Recommended Workflows

Create these additional workflows based on the templates in `docs/workflows/`:

- `security-scan.yml` - Daily security scanning
- `dependency-update.yml` - Automated dependency updates  
- `performance-test.yml` - Nightly performance benchmarks
- `deploy-staging.yml` - Staging deployment automation

## Repository Settings

### Branch Protection Rules

Configure branch protection for `main` branch:

1. Go to Settings → Branches
2. Add rule for `main` branch with:
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Require pull request reviews before merging (1 reviewer minimum)
   - Dismiss stale PR approvals when new commits are pushed
   - Require review from code owners
   - Restrict pushes that create files exceeding 100MB

### Required Status Checks

Enable the following status checks:
- `test-web`
- `test-python`
- `test-ios` (if applicable)
- `security-scan`
- `performance`
- `build-artifacts`

### Repository Secrets

Add the following secrets in Settings → Secrets and Variables → Actions:

#### Package Publishing
- `NPM_TOKEN` - NPM authentication token for publishing packages
- `PYPI_TOKEN` - PyPI API token for Python package publishing

#### Container Registry
- `DOCKERHUB_USERNAME` - Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token

#### Code Quality & Security
- `CODECOV_TOKEN` - Codecov token for coverage reporting
- `SONAR_TOKEN` - SonarCloud token for code quality analysis

#### Notifications
- `SLACK_WEBHOOK` - Slack webhook URL for notifications

#### Cloud Deployment (if applicable)
- `AWS_ACCESS_KEY_ID` - AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for deployment
- `AZURE_CLIENT_ID` - Azure client ID for deployment
- `AZURE_CLIENT_SECRET` - Azure client secret for deployment

## Third-Party Integrations

### 1. Codecov

1. Visit https://codecov.io and connect your GitHub repository
2. Copy the upload token to `CODECOV_TOKEN` secret
3. Configure coverage thresholds in `codecov.yml`

### 2. SonarCloud

1. Visit https://sonarcloud.io and create a new project
2. Generate a token and add to `SONAR_TOKEN` secret
3. Configure quality gate settings

### 3. Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    
  - package-ecosystem: "pip"
    directory: "/python"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 2
```

### 4. GitHub Security Features

Enable the following in Settings → Security & Analysis:
- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Code scanning (CodeQL)

## Issue and PR Templates

The following templates are already created but ensure they're working:

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/pull_request_template.md`
- `.github/CODEOWNERS`

## Monitoring Setup

### 1. Deploy Monitoring Stack

Deploy the monitoring stack using Docker Compose:

```bash
cd monitoring/docker-compose
docker-compose -f monitoring-stack.yml up -d
```

### 2. Configure Grafana

1. Access Grafana at http://localhost:3001
2. Login with admin/nerf-monitoring-2025
3. Import dashboards from `monitoring/grafana/dashboards/`
4. Configure notification channels

### 3. Set Up Alerting

1. Configure AlertManager with your notification preferences
2. Test alert routing with a test alert
3. Set up PagerDuty integration (if applicable)

## Documentation Site (Optional)

If you want to deploy a documentation site:

1. Set up GitHub Pages or deploy to your preferred hosting
2. Configure DNS (if using custom domain)
3. Enable HTTPS
4. Set up redirect from old documentation URLs

## Performance Baseline Setup

1. Run initial performance benchmarks:
   ```bash
   npm run test:perf
   python -m pytest tests/benchmarks/
   ```

2. Commit baseline results to establish regression detection
3. Configure performance alert thresholds in monitoring

## Mobile Testing (iOS)

If you have Apple Developer access:
1. Configure iOS signing certificates
2. Set up device testing
3. Configure TestFlight distribution (optional)

## Final Verification

After completing the setup:

1. Create a test branch and PR to verify all workflows trigger
2. Merge the PR to verify deployment workflows
3. Check that all monitoring dashboards are receiving data
4. Verify notification channels are working
5. Test the complete CI/CD pipeline

## Support

If you encounter issues during setup:
1. Check the workflow logs in GitHub Actions
2. Verify all secrets are properly configured
3. Ensure branch protection rules allow the workflows to run
4. Check repository permissions for the GitHub App

For additional help, please open an issue or contact the development team.