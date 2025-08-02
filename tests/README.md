# Testing Strategy

This directory contains the comprehensive test suite for nerf-edge-kit.

## Test Categories

### Unit Tests (`unit/`)
- Fast, isolated tests for individual functions and classes
- Mock all external dependencies
- Target: <100ms per test
- Coverage: >90% of core functionality

### Integration Tests (`integration/`)
- Test component interactions and API integrations
- Use real dependencies where practical
- Target: <5s per test
- Coverage: Critical workflows and data flows

### End-to-End Tests (`e2e/`)
- Full application testing across platforms
- Real device/browser testing
- Target: <30s per test
- Coverage: User scenarios and complete workflows

### Fixtures (`fixtures/`)
- Test data, sample NeRF models, and mock assets
- Shared test utilities and helpers
- Performance baseline data

## Test Execution

### Quick Tests
```bash
# Unit tests only (fast)
npm run test:unit
python -m pytest tests/unit/ -m unit

# Specific test file
npm test -- NerfRenderer.test.ts
pytest tests/unit/test_renderer.py
```

### Comprehensive Testing
```bash
# All tests
npm test
python -m pytest

# With coverage
npm run test:coverage
pytest --cov
```

### Performance Testing
```bash
# Benchmark suite
npm run test:perf
pytest tests/benchmarks/ -m performance

# GPU-accelerated tests (requires hardware)
npm run test:gpu
pytest -m gpu
```

## Platform-Specific Testing

### Web/TypeScript
- **Framework**: Jest with jsdom
- **Mocking**: WebGPU API mocking for hardware-independent tests
- **Coverage**: TypeScript source in `src/`
- **Configuration**: `jest.config.js`

### Python/ML
- **Framework**: pytest with coverage
- **Mocking**: PyTorch/CUDA mocking for CPU-only environments
- **Coverage**: Python packages in `python/`
- **Configuration**: `pytest.ini`

### iOS (Future)
- **Framework**: XCTest
- **Device Testing**: iOS Simulator and real devices
- **Coverage**: Swift source in `ios/`
- **Configuration**: Xcode project settings

## Test Data

### NeRF Models
- `fixtures/models/` - Sample trained NeRF models
- `fixtures/scenes/` - Test scene configurations
- `fixtures/pointclouds/` - Source point cloud data

### Performance Baselines
- `fixtures/benchmarks/` - Expected performance metrics
- Platform-specific baseline files
- Regression detection data

## Writing Tests

### Naming Conventions
- Test files: `*.test.ts` (Jest), `test_*.py` (pytest)
- Test functions: `test_descriptive_name`
- Test classes: `TestClassName` (pytest only)

### Best Practices
1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names should explain the scenario
3. **Independent Tests**: No test dependencies
4. **Fast Feedback**: Optimize for quick execution
5. **Realistic Data**: Use representative test data

### Example Test Structure
```typescript
// TypeScript/Jest
describe('NerfRenderer', () => {
  beforeEach(() => {
    setupWebGPUMocks();
  });

  it('should initialize with WebGPU backend', async () => {
    // Arrange
    const config = { backend: 'webgpu' };
    
    // Act
    const renderer = new NerfRenderer(config);
    await renderer.initialize();
    
    // Assert
    expect(renderer.isInitialized()).toBe(true);
    expect(renderer.getBackend()).toBe('webgpu');
  });
});
```

```python
# Python/pytest
class TestNerfTrainer:
    def setup_method(self):
        self.config = TrainingConfig(
            model_type='instant_ngp',
            max_iterations=10  # Fast test
        )
    
    def test_training_initialization(self):
        # Arrange
        trainer = NerfTrainer(self.config)
        
        # Act
        trainer.initialize()
        
        # Assert
        assert trainer.is_initialized
        assert trainer.model is not None
```

## Continuous Integration

Tests are automatically run on:
- Every push to any branch
- Pull request creation and updates
- Nightly performance regression testing
- Release candidate validation

### Test Matrix
- **Platforms**: Ubuntu, macOS, Windows
- **Node Versions**: 18, 20, Latest
- **Python Versions**: 3.9, 3.10, 3.11
- **Browsers**: Chrome, Firefox, Safari (WebGPU support)

## Debugging Tests

### VS Code Integration
- Use the "Debug Tests" launch configuration
- Set breakpoints in test files
- Inspect variables and execution flow

### Common Issues
1. **WebGPU Mocking**: Ensure mocks match real API
2. **Async Tests**: Properly handle promises and timing
3. **GPU Tests**: Verify hardware availability
4. **Performance Tests**: Account for system load

## Performance Testing

### Benchmarks
- Rendering frame rate tests
- Memory usage profiling
- Neural network inference timing
- Startup and initialization speed

### Regression Detection
- Automated comparison with baseline performance
- Alert on >10% performance degradation
- Track improvements and optimizations

## Test Maintenance

### Regular Tasks
- Update test data quarterly
- Review and update performance baselines
- Cleanup obsolete tests
- Update mocks for API changes

### Metrics Tracking
- Test execution time trends
- Coverage percentage over time
- Flaky test identification
- Performance regression detection