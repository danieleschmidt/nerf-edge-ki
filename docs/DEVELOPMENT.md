# Development Guide

## Prerequisites

### iOS/macOS Development
- Xcode 15.0+
- iOS 17.0+ / macOS 14.0+
- Swift 5.9+

### Web Development
- Node.js 18+
- WebGPU-compatible browser
- TypeScript 5.0+

### Python/Training
- Python 3.9+
- CUDA 11.8+ (for GPU training)
- PyTorch 2.0+

## Local Setup

```bash
# Clone repository
git clone https://github.com/your-org/nerf-edge-kit.git
cd nerf-edge-kit

# Install dependencies
npm install
pip install -r requirements.txt

# Run tests
npm test
python -m pytest
```

## Project Structure

```
nerf-edge-kit/
├── ios/              # iOS/Swift implementation
├── web/              # WebGPU/TypeScript implementation  
├── python/           # Training and utilities
├── tests/            # Test suites
├── docs/             # Documentation
└── examples/         # Sample applications
```

## Building

### iOS Framework
```bash
xcodebuild -project ios/NerfEdgeKit.xcodeproj -scheme NerfEdgeKit build
```

### Web Library
```bash
npm run build
```

### Python Package
```bash
pip install -e .
```

## Testing

- Unit tests: `npm test` / `pytest`
- Integration tests: `npm run test:integration`
- Performance tests: `npm run test:perf`

## Performance Profiling

```bash
# Profile iOS performance
xcodebuild test -project ios/NerfEdgeKit.xcodeproj -scheme PerformanceTests

# Profile web performance
npm run profile
```

## Debugging

- Use Xcode Instruments for iOS profiling
- Chrome DevTools for web debugging
- Metal debugger for GPU analysis