# Claude Code Configuration

## Repository Context

**Project**: nerf-edge-kit - Real-time NeRF SDK for spatial computing  
**Maturity**: Nascent → Developing (Enhanced via Terragon Autonomous SDLC)  
**Platforms**: iOS/Vision Pro, Web/WebGPU, Python/PyTorch

## Development Commands

### Build Commands
```bash
# Web/TypeScript build
npm run build
npm run dev

# iOS framework (requires Xcode)
xcodebuild -project ios/NerfEdgeKit.xcodeproj -scheme NerfEdgeKit build

# Python package
pip install -e .
```

### Test Commands
```bash
# Run all tests
npm test
python -m pytest
xcodebuild test -project ios/NerfEdgeKit.xcodeproj -scheme NerfEdgeKitTests

# Coverage reports
npm run test:coverage
pytest --cov=nerf_edge_kit
```

### Lint & Format
```bash
# Lint everything
npm run lint
flake8 python/
swiftlint ios/

# Auto-fix formatting
npm run lint:fix
black python/
prettier --write .
```

### Performance Testing
```bash
# Benchmark suite
npm run test:perf
python -m pytest tests/benchmarks/

# Device-specific profiling
./scripts/profile-vision-pro.sh
./scripts/profile-web.sh
```

## Project Structure Understanding

```
nerf-edge-kit/
├── ios/                  # Swift/Metal implementation
│   ├── Sources/         # Framework source
│   ├── Tests/           # Unit tests
│   └── Examples/        # Sample apps
├── web/                  # TypeScript/WebGPU
│   ├── src/             # Library source
│   ├── tests/           # Jest tests
│   └── examples/        # Web demos
├── python/               # Training & utilities
│   ├── nerf_edge_kit/   # Package source
│   ├── tests/           # Pytest suite
│   └── scripts/         # Training scripts
├── docs/                 # Documentation
├── examples/             # Cross-platform demos
└── tools/                # Development utilities
```

## Key Technologies

- **iOS**: Swift 5.9+, Metal 3.0+, ARKit, RealityKit
- **Web**: TypeScript 5.0+, WebGPU, WebXR
- **Python**: PyTorch 2.0+, CUDA 11.8+, TinyCUDANN
- **Build**: Webpack, Xcode, setuptools
- **Testing**: Jest, XCTest, PyTest
- **CI/CD**: GitHub Actions (templates provided)

## Performance Targets

| Platform | Resolution | FPS | Latency | Power |
|----------|------------|-----|---------|-------|
| Vision Pro | 4K/eye | 90 | 4.2ms | 8W |
| iPhone 15 Pro | 1080p | 60 | 4.8ms | 3W |
| Web/Chrome | 1440p | 60 | 6.5ms | Variable |

## Common Tasks

### Adding New Features
1. Create feature branch
2. Implement across platforms (iOS/Web/Python as needed)
3. Add comprehensive tests
4. Update documentation
5. Run performance benchmarks
6. Submit PR with template

### Debugging Performance
1. Use Instruments (iOS) or Chrome DevTools (Web)
2. Check GPU utilization and memory usage
3. Profile neural network inference time
4. Validate foveated rendering effectiveness
5. Compare against baseline benchmarks

### Release Process
1. Update version in package.json/setup.py/Info.plist
2. Run full test suite across platforms
3. Generate changelog
4. Create GitHub release
5. Publish to NPM/PyPI/CocoaPods

## Autonomous Enhancement

This repository was enhanced using Terragon's Adaptive SDLC system:
- **Maturity Assessment**: Analyzed existing state and gaps
- **Tailored Implementation**: Multi-platform NeRF SDK optimizations
- **Future-Proofing**: Extensible architecture for spatial computing

To re-run autonomous enhancement:
```bash
./autonomous-sdlc.sh
```