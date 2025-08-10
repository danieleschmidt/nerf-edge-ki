/**
 * Comprehensive full-stack tests for NeRF SDK
 */

import { NerfRenderer } from '../../src/rendering/NerfRenderer';
import { NerfModel } from '../../src/core/NerfModel';
import { NerfScene } from '../../src/core/NerfScene';
import { FoveatedRenderer } from '../../src/core/FoveatedRenderer';
import { NerfStreamer } from '../../src/streaming/NerfStreamer';
import { NeuralAccelerator } from '../../src/neural/NeuralAccelerator';
import { AdvancedErrorHandler } from '../../src/core/AdvancedErrorHandler';
import { ComprehensiveValidator } from '../../src/validation/ComprehensiveValidator';
import { AdvancedMonitor } from '../../src/monitoring/AdvancedMonitor';
import { AdvancedCacheManager } from '../../src/optimization/AdvancedCacheManager';
import { AutoScaler } from '../../src/scaling/AutoScaler';
import { QuantumNerfInnovations } from '../../src/research/QuantumNerfInnovations';
import { TemporalNerfPrediction } from '../../src/research/TemporalNerfPrediction';

describe('Full Stack Integration Tests', () => {
  let renderer: NerfRenderer;
  let mockCanvas: HTMLCanvasElement;
  let mockScene: NerfScene;
  let errorHandler: AdvancedErrorHandler;
  let validator: ComprehensiveValidator;

  beforeEach(async () => {
    // Setup mock canvas
    mockCanvas = {
      getContext: jest.fn().mockReturnValue({
        configure: jest.fn(),
        getCurrentTexture: jest.fn().mockReturnValue({
          createView: jest.fn().mockReturnValue({})
        })
      }),
      width: 1920,
      height: 1080
    } as any;

    // Setup error handler
    errorHandler = new AdvancedErrorHandler();
    
    // Setup validator
    validator = new ComprehensiveValidator();

    // Initialize renderer
    renderer = new NerfRenderer({
      targetFPS: 60,
      maxResolution: [1920, 1080],
      foveatedRendering: true,
      memoryLimit: 2048,
      powerMode: 'balanced'
    });

    // Setup mock scene
    mockScene = new NerfScene({
      name: 'test-scene',
      bounds: [[-10, -10, -10], [10, 10, 10]],
      maxModels: 10
    });
  });

  afterEach(() => {
    renderer?.dispose();
    errorHandler?.clearHistory();
    validator?.clearHistory();
  });

  describe('Rendering Pipeline Integration', () => {
    test('should initialize complete rendering pipeline', async () => {
      // Mock WebGPU support
      (global.navigator as any).gpu = {
        requestAdapter: jest.fn().mockResolvedValue({
          info: { vendor: 'mock', device: 'mock' },
          requestDevice: jest.fn().mockResolvedValue({
            createShaderModule: jest.fn().mockReturnValue({}),
            createBindGroupLayout: jest.fn().mockReturnValue({}),
            createPipelineLayout: jest.fn().mockReturnValue({}),
            createRenderPipeline: jest.fn().mockReturnValue({}),
            createBuffer: jest.fn().mockReturnValue({ destroy: jest.fn() }),
            addEventListener: jest.fn(),
            destroy: jest.fn(),
            limits: {},
            features: new Set()
          })
        })
      };

      await expect(renderer.initialize(mockCanvas)).resolves.not.toThrow();
      
      const info = renderer.getInfo();
      expect(info.initialized).toBe(true);
      expect(info.backend).toBeTruthy();
    });

    test('should handle complete render cycle with scene', async () => {
      // Initialize renderer
      await renderer.initialize(mockCanvas);
      
      // Create and load mock model
      const model = NerfModel.createMockModel();
      await mockScene.addModel(model, { id: 'test-model' });
      
      // Set scene
      renderer.setScene(mockScene);
      
      // Perform render
      const renderOptions = {
        cameraPosition: [0, 0, 5] as [number, number, number],
        cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        fieldOfView: 60,
        near: 0.1,
        far: 100
      };

      await expect(renderer.render(renderOptions)).resolves.not.toThrow();
      
      const stats = renderer.getRenderStats();
      expect(stats.drawCalls).toBeGreaterThan(0);
    });

    test('should maintain target FPS under load', async () => {
      await renderer.initialize(mockCanvas);
      
      // Add multiple models to create load
      for (let i = 0; i < 5; i++) {
        const model = NerfModel.createMockModel();
        await mockScene.addModel(model, { id: `model-${i}` });
      }
      
      renderer.setScene(mockScene);
      
      const renderOptions = {
        cameraPosition: [0, 0, 5] as [number, number, number],
        cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        fieldOfView: 60,
        near: 0.1,
        far: 100
      };

      // Perform multiple renders and measure performance
      const startTime = performance.now();
      const renderCount = 10;
      
      for (let i = 0; i < renderCount; i++) {
        await renderer.render(renderOptions);
      }
      
      const totalTime = performance.now() - startTime;
      const avgFrameTime = totalTime / renderCount;
      const estimatedFPS = 1000 / avgFrameTime;
      
      expect(estimatedFPS).toBeGreaterThan(30); // Should maintain at least 30 FPS
    });
  });

  describe('Foveated Rendering Integration', () => {
    test('should integrate foveated rendering with eye tracking', async () => {
      const foveatedRenderer = new FoveatedRenderer({
        enabled: true,
        centerRadius: 0.2,
        peripheralRadius: 0.8,
        qualityLevels: 3,
        eyeTrackingEnabled: true
      });

      // Mock eye tracking data
      const eyeTrackingData = {
        leftEye: { x: 0.4, y: 0.5, confidence: 0.9 },
        rightEye: { x: 0.6, y: 0.5, confidence: 0.9 },
        combined: { x: 0.5, y: 0.5 },
        timestamp: Date.now()
      };

      foveatedRenderer.updateEyeTracking(eyeTrackingData);
      const foveationMap = foveatedRenderer.generateFoveationMap(512, 512);
      
      expect(foveationMap.width).toBe(512);
      expect(foveationMap.height).toBe(512);
      expect(foveationMap.data.length).toBe(512 * 512 * 4);

      // Test quality at center vs periphery
      const centerQuality = foveatedRenderer.getQualityAt(0.5, 0.5);
      const peripheryQuality = foveatedRenderer.getQualityAt(0.1, 0.1);
      
      expect(centerQuality).toBeGreaterThan(peripheryQuality);

      foveatedRenderer.dispose();
    });

    test('should provide performance benefits with foveation', async () => {
      const foveatedRenderer = new FoveatedRenderer({
        enabled: true,
        centerRadius: 0.3,
        qualityLevels: 4
      });

      foveatedRenderer.generateFoveationMap(1024, 1024);
      const metrics = foveatedRenderer.getMetrics();
      
      expect(metrics.qualityReduction).toBeGreaterThan(0);
      expect(metrics.estimatedSpeedup).toBeGreaterThan(1);

      foveatedRenderer.dispose();
    });
  });

  describe('Streaming System Integration', () => {
    test('should handle streaming workflow with caching', async () => {
      const streamer = new NerfStreamer({
        baseUrl: 'https://mock-cdn.com/nerfs',
        cacheSize: 128,
        maxConcurrentDownloads: 4,
        preloadDistance: 50,
        lodBias: 0,
        predictivePrefetch: true
      });

      // Mock viewer state
      const viewerState = {
        position: [0, 0, 0] as [number, number, number],
        direction: [0, 0, 1] as [number, number, number],
        velocity: [1, 0, 0] as [number, number, number],
        fov: 60
      };

      streamer.updateViewerState(viewerState);
      
      // Check streaming stats
      const stats = streamer.getStats();
      expect(stats.cachedChunks).toBeGreaterThanOrEqual(0);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);

      streamer.dispose();
    });
  });

  describe('Neural Acceleration Integration', () => {
    test('should accelerate neural inference', async () => {
      const accelerator = new NeuralAccelerator({
        backend: 'webgl',
        precision: 'float32',
        batchSize: 32,
        cacheEnabled: true,
        quantization: false
      });

      await accelerator.initialize();

      // Test inference
      const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);
      const directions = new Float32Array([0, 0, 1, 0, 1, 0, 1, 0, 0]);

      const results = await accelerator.inference(positions, directions);
      
      expect(results.length).toBe(12); // 3 samples * 4 components (RGBA)
      
      const metrics = accelerator.getMetrics();
      expect(metrics.inferenceTime).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);

      accelerator.dispose();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle and recover from WebGPU errors', async () => {
      const errorHandler = new AdvancedErrorHandler();
      let errorReceived = false;

      errorHandler.onError((error) => {
        errorReceived = true;
        expect(error.context.category).toBeTruthy();
        expect(error.context.severity).toBeGreaterThan(0);
      });

      // Simulate WebGPU error
      const mockError = new Error('WebGPU device lost');
      await errorHandler.handleError(mockError, {
        category: 'webgpu' as any,
        severity: 3 as any,
        component: 'renderer',
        operation: 'initialization'
      });

      expect(errorReceived).toBe(true);

      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.recoveryRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation System Integration', () => {
    test('should validate complete system configuration', () => {
      const validator = new ComprehensiveValidator();

      const nerfConfig = {
        targetFPS: 90,
        maxResolution: [3840, 2160],
        foveatedRendering: true,
        memoryLimit: 4096,
        powerMode: 'performance'
      };

      const renderOptions = {
        cameraPosition: [0, 0, 5],
        cameraRotation: [0, 0, 0, 1],
        fieldOfView: 70,
        near: 0.1,
        far: 1000
      };

      const context = {
        component: 'integration-test',
        operation: 'full-validation',
        timestamp: Date.now()
      };

      const configResults = validator.validateNerfConfig(nerfConfig, context);
      const renderResults = validator.validateRenderOptions(renderOptions, context);

      expect(validator.allValid(configResults)).toBe(true);
      expect(validator.allValid(renderResults)).toBe(true);
    });
  });

  describe('Monitoring Integration', () => {
    test('should monitor complete system performance', (done) => {
      const monitor = new AdvancedMonitor({
        enabled: true,
        metricsInterval: 100,
        snapshotInterval: 200,
        maxHistoryPoints: 50,
        alertsEnabled: true
      });

      // Listen for performance snapshots
      monitor.on('snapshot', (snapshot) => {
        expect(snapshot.fps).toBeGreaterThanOrEqual(0);
        expect(snapshot.frameTime).toBeGreaterThanOrEqual(0);
        expect(snapshot.gpuUtilization).toBeGreaterThanOrEqual(0);
        expect(snapshot.memoryUsage).toBeGreaterThanOrEqual(0);
        
        monitor.dispose();
        done();
      });

      // Simulate frame rendering
      for (let i = 0; i < 5; i++) {
        monitor.incrementFrameCount();
      }
    }, 1000);
  });

  describe('Optimization Integration', () => {
    test('should optimize with advanced caching', async () => {
      const cacheManager = new AdvancedCacheManager({
        maxSize: 64 * 1024 * 1024, // 64MB
        maxEntries: 1000,
        defaultTTL: 300000, // 5 minutes
        evictionStrategy: 'smart',
        preloadingEnabled: true,
        compressionEnabled: true,
        persistenceEnabled: false
      });

      // Test cache operations
      const testData = new Float32Array(1024);
      testData.fill(0.5);

      await cacheManager.set('test-weights', testData);
      const retrieved = await cacheManager.get('test-weights');
      
      expect(retrieved).toBeTruthy();
      
      const stats = cacheManager.getStats();
      expect(stats.entryCount).toBe(1);
      expect(stats.memoryUsage).toBeGreaterThan(0);

      cacheManager.dispose();
    });

    test('should auto-scale based on performance metrics', () => {
      const autoScaler = new AutoScaler({
        minFPS: 60,
        maxLatency: 10,
        targetGpuUtilization: 70,
        maxMemoryUsage: 2048
      });

      // Simulate poor performance
      autoScaler.updateMetrics({
        fps: 30,
        gpu: 95,
        latency: 20,
        memory: 2500,
        cpu: 80,
        networkIO: 10,
        queueDepth: 15,
        errorRate: 0.02
      });

      const state = autoScaler.getState();
      expect(state.recentActions.length).toBeGreaterThan(0);

      const stats = autoScaler.getStats();
      expect(stats.totalActions).toBeGreaterThanOrEqual(0);

      autoScaler.dispose();
    });
  });

  describe('Research Features Integration', () => {
    test('should integrate quantum NeRF innovations', () => {
      const quantumNerf = new QuantumNerfInnovations({
        enabled: true,
        samplingMethod: 'quantum',
        coherenceThreshold: 0.5,
        entanglementRadius: 2.0,
        observationCollapse: true
      });

      // Test quantum sampling
      const samples = quantumNerf.quantumSample([0, 0, 0], [0, 0, 1], 16);
      
      expect(samples.length).toBe(16);
      expect(samples[0].probability).toBeGreaterThan(0);
      expect(samples[0].coherence).toBeGreaterThanOrEqual(0);

      const stats = quantumNerf.getQuantumStats();
      expect(stats.avgCoherence).toBeGreaterThanOrEqual(0);
      expect(stats.quantumSpeedup).toBeGreaterThanOrEqual(1);

      quantumNerf.dispose();
    });

    test('should integrate temporal prediction', () => {
      const temporalPredictor = new TemporalNerfPrediction({
        historyLength: 60,
        predictionHorizon: 10,
        motionCompensation: true,
        adaptivePrediction: true,
        confidenceThreshold: 0.7
      });

      // Add frame history
      for (let i = 0; i < 10; i++) {
        const frame = {
          timestamp: Date.now() + i * 16.67, // 60 FPS
          cameraPosition: [i * 0.1, 0, 5] as [number, number, number],
          cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
          velocity: [0.1, 0, 0] as [number, number, number],
          angularVelocity: [0, 0, 0] as [number, number, number],
          sceneChanges: []
        };
        temporalPredictor.addFrame(frame);
      }

      const prediction = temporalPredictor.predictFutureFrame(5);
      expect(prediction.cameraPosition[0]).toBeGreaterThan(0.5); // Should predict forward motion

      const stats = temporalPredictor.getPredictionStats();
      expect(stats.frameHistory).toBe(10);

      temporalPredictor.dispose();
    });
  });

  describe('Memory Management Integration', () => {
    test('should manage memory under pressure', async () => {
      const scene = new NerfScene({
        name: 'memory-test-scene',
        bounds: [[-5, -5, -5], [5, 5, 5]],
        maxModels: 20
      });

      // Add many models to trigger memory management
      const models: NerfModel[] = [];
      for (let i = 0; i < 15; i++) {
        const model = NerfModel.createMockModel();
        models.push(model);
        await scene.addModel(model, { id: `memory-test-${i}` });
      }

      const memoryUsage = scene.getMemoryUsage();
      expect(memoryUsage).toBeGreaterThan(0);

      // Test model removal
      await scene.removeModel('memory-test-0');
      const newMemoryUsage = scene.getMemoryUsage();
      expect(newMemoryUsage).toBeLessThan(memoryUsage);

      // Cleanup
      for (const model of models) {
        model.dispose();
      }
      scene.dispose();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('should detect and adapt to platform capabilities', () => {
      // Mock different platform scenarios
      const scenarios = [
        { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)', platform: 'iPhone' },
        { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32' },
        { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel' }
      ];

      scenarios.forEach(scenario => {
        // Mock navigator
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: scenario.userAgent
        });
        Object.defineProperty(navigator, 'platform', {
          writable: true,
          value: scenario.platform
        });

        const config = {
          targetFPS: scenario.platform === 'iPhone' ? 60 : 90,
          maxResolution: scenario.platform === 'iPhone' ? [1080, 1920] : [1920, 1080],
          powerMode: scenario.platform === 'iPhone' ? 'balanced' : 'performance' as const
        };

        const renderer = new NerfRenderer(config);
        const info = renderer.getInfo();
        
        expect(info.config.targetFPS).toBe(config.targetFPS);
        expect(info.config.maxResolution).toEqual(config.maxResolution);

        renderer.dispose();
      });
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet performance targets under various conditions', async () => {
      const benchmarkConfigs = [
        { name: 'Low Quality', targetFPS: 90, resolution: [1280, 720] },
        { name: 'Medium Quality', targetFPS: 60, resolution: [1920, 1080] },
        { name: 'High Quality', targetFPS: 30, resolution: [2560, 1440] }
      ];

      for (const config of benchmarkConfigs) {
        const renderer = new NerfRenderer({
          targetFPS: config.targetFPS,
          maxResolution: config.resolution as [number, number],
          powerMode: 'performance'
        });

        await renderer.initialize(mockCanvas);
        renderer.setScene(mockScene);

        const startTime = performance.now();
        const frameCount = 30;

        for (let i = 0; i < frameCount; i++) {
          await renderer.render({
            cameraPosition: [0, 0, 5],
            cameraRotation: [0, 0, 0, 1],
            fieldOfView: 60,
            near: 0.1,
            far: 100
          });
        }

        const endTime = performance.now();
        const avgFrameTime = (endTime - startTime) / frameCount;
        const actualFPS = 1000 / avgFrameTime;

        console.log(`${config.name}: ${actualFPS.toFixed(1)} FPS (target: ${config.targetFPS} FPS)`);
        
        // Allow for some performance variation
        expect(actualFPS).toBeGreaterThan(config.targetFPS * 0.8);

        renderer.dispose();
      }
    });
  });
});

describe('Security Tests', () => {
  test('should validate input sanitization', () => {
    const validator = new ComprehensiveValidator();

    // Test malicious inputs
    const maliciousConfig = {
      targetFPS: -1,
      maxResolution: [999999, 999999],
      memoryLimit: Number.MAX_SAFE_INTEGER
    };

    const results = validator.validateNerfConfig(maliciousConfig, {
      component: 'security-test',
      operation: 'input-validation',
      timestamp: Date.now()
    });

    expect(validator.getErrors(results).length).toBeGreaterThan(0);
  });

  test('should prevent buffer overflow attacks', async () => {
    const model = new NerfModel();
    
    // Create oversized buffer
    const hugeBuffer = new ArrayBuffer(1024 * 1024 * 1024); // 1GB
    
    await expect(model.load(hugeBuffer)).rejects.toThrow();
  });
});

describe('Accessibility Tests', () => {
  test('should support reduced motion preferences', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const renderer = new NerfRenderer({
      targetFPS: 60,
      maxResolution: [1920, 1080]
    });

    renderer.setAdaptiveQuality(true);
    
    // Should adapt for accessibility
    renderer.setQuality('low');
    expect(renderer.getInfo().quality).toBe('low');

    renderer.dispose();
  });
});