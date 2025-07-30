# Makefile for nerf-edge-kit development and operations
# Cross-platform development automation

.PHONY: help install build test lint clean docker docs deploy

# Default target
help: ## Show this help message
	@echo "nerf-edge-kit Development Commands"
	@echo "=================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation and setup
install: ## Install all dependencies (Node.js, Python, iOS)
	@echo "Installing Node.js dependencies..."
	npm install
	@echo "Installing Python dependencies..."
	pip install -r requirements.txt
	@echo "Installing pre-commit hooks..."
	pre-commit install
	@echo "Setup complete!"

install-dev: ## Install development dependencies
	npm install --include=dev
	pip install -r requirements-dev.txt
	pre-commit install --hook-type commit-msg

# Build commands
build: ## Build all components (web, Python package)
	@echo "Building web components..."
	npm run build
	@echo "Building Python package..."
	python -m build
	@echo "Build complete!"

build-web: ## Build web/TypeScript components only
	npm run build

build-python: ## Build Python package only
	python -m build

build-ios: ## Build iOS framework (requires Xcode)
	@echo "Building iOS framework..."
	xcodebuild -project ios/NerfEdgeKit.xcodeproj -scheme NerfEdgeKit build

# Testing
test: ## Run all tests (web + Python + iOS)
	@echo "Running web tests..."
	npm test
	@echo "Running Python tests..."
	python -m pytest
	@echo "Running iOS tests..."
	xcodebuild test -project ios/NerfEdgeKit.xcodeproj -scheme NerfEdgeKitTests

test-web: ## Run web/JavaScript tests only
	npm test

test-python: ## Run Python tests only
	python -m pytest

test-coverage: ## Generate test coverage reports
	npm run test:coverage
	python -m pytest --cov-report=html

test-performance: ## Run performance benchmarks
	npm run test:perf
	python -m pytest tests/benchmarks/ -m performance

# Code quality
lint: ## Run all linters
	@echo "Linting web code..."
	npm run lint
	@echo "Linting Python code..."
	flake8 python/
	@echo "Linting iOS code..."
	swiftlint ios/

lint-fix: ## Auto-fix linting issues
	npm run lint:fix
	black python/
	prettier --write .

typecheck: ## Run type checking
	npm run typecheck
	mypy python/nerf_edge_kit/

security-scan: ## Run security vulnerability scan
	npm audit
	pip freeze | safety check
	bandit -r python/

# Docker operations
docker-build: ## Build Docker images
	docker-compose build

docker-up: ## Start development environment
	docker-compose up -d

docker-down: ## Stop development environment
	docker-compose down

docker-logs: ## View container logs
	docker-compose logs -f

docker-shell: ## Open shell in web container
	docker-compose exec web-dev sh

# Documentation
docs: ## Generate documentation
	@echo "Generating API documentation..."
	npm run docs:generate
	python -m sphinx-build -b html docs/ docs/_build/

docs-serve: ## Serve documentation locally
	python -m http.server 8080 --directory docs/_build/

# Deployment
deploy-staging: ## Deploy to staging environment
	@echo "Deploying to staging..."
	# Add staging deployment commands

deploy-prod: ## Deploy to production
	@echo "Deploying to production..."
	# Add production deployment commands

# Cleanup
clean: ## Clean build artifacts and caches
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf coverage/
	rm -rf .pytest_cache/
	rm -rf node_modules/.cache/
	rm -rf python/build/
	rm -rf python/dist/
	rm -rf python/*.egg-info/
	@echo "Clean complete!"

clean-docker: ## Clean Docker images and volumes
	docker-compose down -v
	docker system prune -f

# Development helpers
dev-web: ## Start web development server
	npm run dev

dev-python: ## Start Python development server
	python -m nerf_edge_kit.api

profile-vision-pro: ## Profile Vision Pro performance
	./scripts/profile-vision-pro.sh

profile-web: ## Profile web performance
	./scripts/profile-web.sh

# CI/CD helpers
ci-install: ## Install dependencies for CI
	npm ci
	pip install -r requirements.txt

ci-test: ## Run tests for CI (with coverage)
	npm run test:coverage
	python -m pytest --cov-report=xml

ci-build: ## Build for CI
	npm run build
	python -m build --wheel

# Version management
version-patch: ## Bump patch version
	npm version patch
	python -m bumpversion patch

version-minor: ## Bump minor version
	npm version minor
	python -m bumpversion minor

version-major: ## Bump major version
	npm version major
	python -m bumpversion major