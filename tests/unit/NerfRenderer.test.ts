import { NerfRenderer } from '../../src/rendering/NerfRenderer';
import { WebGPUBackend } from '../../src/rendering/WebGPUBackend';
import { NerfModel } from '../../src/core/NerfModel';
import '../../web/tests/setup';

// Mock WebGPU backend
jest.mock('../../src/rendering/WebGPUBackend');
const MockWebGPUBackend = WebGPUBackend as jest.MockedClass<typeof WebGPUBackend>;

describe('NerfRenderer', () => {
  let renderer: NerfRenderer;
  let mockBackend: jest.Mocked<WebGPUBackend>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock backend instance
    mockBackend = new MockWebGPUBackend() as jest.Mocked<WebGPUBackend>;
    MockWebGPUBackend.mockImplementation(() => mockBackend);
    
    // Setup default mock implementations
    mockBackend.initialize.mockResolvedValue(undefined);
    mockBackend.isSupported.mockReturnValue(true);
    mockBackend.createRenderPipeline.mockResolvedValue({} as any);
    mockBackend.render.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully with WebGPU backend', async () => {
      // Arrange
      const config = {
        canvas: document.createElement('canvas'),
        backend: 'webgpu' as const,
        targetFPS: 60
      };

      // Act
      renderer = new NerfRenderer(config);
      await renderer.initialize();

      // Assert
      expect(renderer.isInitialized()).toBe(true);
      expect(mockBackend.initialize).toHaveBeenCalledTimes(1);
    });

    it('should fail initialization when WebGPU is not supported', async () => {
      // Arrange
      mockBackend.isSupported.mockReturnValue(false);
      const config = {
        canvas: document.createElement('canvas'),
        backend: 'webgpu' as const
      };

      // Act & Assert
      renderer = new NerfRenderer(config);
      await expect(renderer.initialize()).rejects.toThrow('WebGPU not supported');
    });

    it('should use default configuration when none provided', () => {
      // Arrange
      const canvas = document.createElement('canvas');

      // Act
      renderer = new NerfRenderer({ canvas });

      // Assert
      expect(renderer.getConfig()).toMatchObject({
        backend: 'webgpu',
        targetFPS: 60,
        quality: 'high',
        enableFoveation: false
      });
    });
  });

  describe('model loading', () => {
    beforeEach(async () => {
      const config = { canvas: document.createElement('canvas') };
      renderer = new NerfRenderer(config);
      await renderer.initialize();
    });

    it('should load NeRF model successfully', async () => {
      // Arrange
      const mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(1024)
      } as NerfModel;

      // Act
      await renderer.loadModel(mockModel);

      // Assert
      expect(renderer.getCurrentModel()).toBe(mockModel);
      expect(mockBackend.createRenderPipeline).toHaveBeenCalledWith(mockModel);
    });

    it('should reject loading invalid model', async () => {
      // Arrange
      const invalidModel = {
        isLoaded: () => false
      } as NerfModel;

      // Act & Assert
      await expect(renderer.loadModel(invalidModel)).rejects.toThrow('Model not loaded');
    });
  });

  describe('rendering', () => {
    let mockModel: NerfModel;

    beforeEach(async () => {
      const config = { 
        canvas: document.createElement('canvas'),
        targetFPS: 90
      };
      renderer = new NerfRenderer(config);
      await renderer.initialize();

      mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(1024)
      } as NerfModel;

      await renderer.loadModel(mockModel);
    });

    it('should render frame successfully', async () => {
      // Arrange
      const camera = {
        position: [0, 0, 2],
        target: [0, 0, 0],
        fov: Math.PI / 4
      };

      // Act
      const renderTime = await renderer.render(camera);

      // Assert
      expect(renderTime).toBeGreaterThan(0);
      expect(mockBackend.render).toHaveBeenCalledWith(camera, mockModel);
    });

    it('should maintain target frame rate', async () => {
      // Arrange
      const camera = { position: [0, 0, 2], target: [0, 0, 0], fov: Math.PI / 4 };
      const startTime = performance.now();
      const frameCount = 10;

      // Act
      for (let i = 0; i < frameCount; i++) {
        await renderer.render(camera);
      }
      const elapsedTime = performance.now() - startTime;

      // Assert
      const actualFPS = (frameCount * 1000) / elapsedTime;
      expect(actualFPS).toBeGreaterThan(80); // Allow some variance from 90 FPS target
    });

    it('should throw error when rendering without model', async () => {
      // Arrange
      const renderer = new NerfRenderer({ canvas: document.createElement('canvas') });
      await renderer.initialize();
      const camera = { position: [0, 0, 2], target: [0, 0, 0], fov: Math.PI / 4 };

      // Act & Assert
      await expect(renderer.render(camera)).rejects.toThrow('No model loaded');
    });
  });

  describe('foveated rendering', () => {
    beforeEach(async () => {
      const config = {
        canvas: document.createElement('canvas'),
        enableFoveation: true
      };
      renderer = new NerfRenderer(config);
      await renderer.initialize();

      const mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(1024)
      } as NerfModel;
      await renderer.loadModel(mockModel);
    });

    it('should enable foveated rendering', () => {
      // Arrange
      const foveationConfig = {
        centerRadius: 0.2,
        peripheralScale: 0.5,
        blendWidth: 0.1
      };

      // Act
      renderer.enableFoveation(foveationConfig);

      // Assert
      expect(renderer.isFoveationEnabled()).toBe(true);
    });

    it('should update foveation center based on gaze point', () => {
      // Arrange
      renderer.enableFoveation({ centerRadius: 0.2 });
      const gazePoint = [0.3, 0.7]; // Normalized screen coordinates

      // Act
      renderer.updateFoveationCenter(gazePoint);

      // Assert
      const foveationState = renderer.getFoveationState();
      expect(foveationState.center).toEqual(gazePoint);
    });

    it('should disable foveation when requested', () => {
      // Arrange
      renderer.enableFoveation({ centerRadius: 0.2 });

      // Act
      renderer.disableFoveation();

      // Assert
      expect(renderer.isFoveationEnabled()).toBe(false);
    });
  });

  describe('performance monitoring', () => {
    beforeEach(async () => {
      const config = { canvas: document.createElement('canvas') };
      renderer = new NerfRenderer(config);
      await renderer.initialize();
    });

    it('should track rendering performance metrics', async () => {
      // Arrange
      const mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(1024)
      } as NerfModel;
      await renderer.loadModel(mockModel);

      const camera = { position: [0, 0, 2], target: [0, 0, 0], fov: Math.PI / 4 };

      // Act
      await renderer.render(camera);
      await renderer.render(camera);
      await renderer.render(camera);

      // Assert
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.averageFrameTime).toBeGreaterThan(0);
      expect(metrics.currentFPS).toBeGreaterThan(0);
      expect(metrics.frameCount).toBe(3);
    });

    it('should reset performance metrics', async () => {
      // Arrange
      const mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(1024)
      } as NerfModel;
      await renderer.loadModel(mockModel);

      const camera = { position: [0, 0, 2], target: [0, 0, 0], fov: Math.PI / 4 };
      await renderer.render(camera);

      // Act
      renderer.resetPerformanceMetrics();

      // Assert
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.frameCount).toBe(0);
      expect(metrics.averageFrameTime).toBe(0);
    });
  });

  describe('resource management', () => {
    it('should dispose resources properly', async () => {
      // Arrange
      const config = { canvas: document.createElement('canvas') };
      renderer = new NerfRenderer(config);
      await renderer.initialize();

      // Act
      renderer.dispose();

      // Assert
      expect(renderer.isInitialized()).toBe(false);
      expect(mockBackend.dispose).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple dispose calls gracefully', async () => {
      // Arrange
      const config = { canvas: document.createElement('canvas') };
      renderer = new NerfRenderer(config);
      await renderer.initialize();

      // Act
      renderer.dispose();
      renderer.dispose(); // Second call should not throw

      // Assert
      expect(renderer.isInitialized()).toBe(false);
      expect(mockBackend.dispose).toHaveBeenCalledTimes(1);
    });
  });
});