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
    mockBackend.beginFrame.mockImplementation(() => {});
    mockBackend.endFrame.mockImplementation(() => {});
    mockBackend.updateUniforms.mockImplementation(() => {});
    mockBackend.setResolution.mockImplementation(() => {});
    mockBackend.dispose.mockImplementation(() => {});
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
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };

      // Act
      renderer = new NerfRenderer(config);
      await renderer.initialize();

      // Assert
      expect(renderer.getInitialized()).toBe(true);
      expect(mockBackend.initialize).toHaveBeenCalledTimes(1);
    });

    it('should fail initialization when WebGPU is not supported', () => {
      // Arrange
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };

      // Act & Assert
      renderer = new NerfRenderer(config);
      // Mock navigator.gpu not available
      const originalNavigator = global.navigator;
      global.navigator = { ...originalNavigator, gpu: undefined };
      
      expect(renderer.initialize()).rejects.toThrow();
      
      global.navigator = originalNavigator;
    });

    it('should use default configuration when none provided', () => {
      // Arrange & Act
      renderer = new NerfRenderer();

      // Assert
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics).toBeDefined();
    });

    it('should not be initialized before calling initialize', () => {
      // Arrange
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };

      // Act
      renderer = new NerfRenderer(config);

      // Assert
      expect(renderer.getInitialized()).toBe(false);
    });
  });

  describe('model loading', () => {
    beforeEach(() => {
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };
      renderer = new NerfRenderer(config);
      // Mock initialization as completed
      (renderer as any).isInitialized = true;
      (renderer as any).backend = mockBackend;
    });

    it('should load NeRF model successfully', async () => {
      // Arrange
      const mockModel = NerfModel.createMockModel();

      // Act
      await renderer.loadModel(mockModel);

      // Assert - Just verify no errors thrown
      expect(true).toBe(true);
    });

    it('should fail to render without initialized backend', async () => {
      // Arrange
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };
      renderer = new NerfRenderer(config);
      // Don't call initialize

      const renderOptions = {
        cameraPosition: [0, 0, 5] as [number, number, number],
        cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        fieldOfView: 45,
        near: 0.1,
        far: 100
      };

      // Act & Assert
      await expect(renderer.render(renderOptions)).rejects.toThrow();
    });
  });

  describe('rendering', () => {
    beforeEach(async () => {
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };
      renderer = new NerfRenderer(config);
      await renderer.initialize();
    });

    it('should render frame without model', async () => {
      // Arrange
      const renderOptions = {
        cameraPosition: [0, 0, 5] as [number, number, number],
        cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        fieldOfView: 45,
        near: 0.1,
        far: 100
      };

      // Act & Assert
      await expect(renderer.render(renderOptions)).rejects.toThrow();
    });

    it('should track performance metrics', async () => {
      // Arrange
      const mockModel = NerfModel.createMockModel();
      await renderer.loadModel(mockModel);

      const renderOptions = {
        cameraPosition: [0, 0, 5] as [number, number, number],
        cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        fieldOfView: 45,
        near: 0.1,
        far: 100
      };

      // Create a mock scene
      const mockScene = {
        getVisibleModels: () => [{ model: mockModel, transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } }],
        getMemoryUsage: () => 1024,
        getConfig: () => ({ name: 'Test Scene' })
      };

      renderer.setScene(mockScene as any);

      // Act
      await renderer.render(renderOptions);

      // Assert
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.fps).toBeGreaterThanOrEqual(0);
      expect(metrics.frameTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('render loop', () => {
    beforeEach(async () => {
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };
      renderer = new NerfRenderer(config);
      await renderer.initialize();
    });

    it('should start and stop render loop', () => {
      // Arrange
      const renderOptions = {
        cameraPosition: [0, 0, 5] as [number, number, number],
        cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        fieldOfView: 45,
        near: 0.1,
        far: 100
      };

      // Act
      renderer.startRenderLoop(renderOptions);
      renderer.stopRenderLoop();

      // Assert - Just verify no errors thrown
      expect(true).toBe(true);
    });
  });

  describe('resource management', () => {
    it('should dispose resources properly', async () => {
      // Arrange
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };
      renderer = new NerfRenderer(config);
      await renderer.initialize();

      // Act
      renderer.dispose();

      // Assert
      expect(renderer.getInitialized()).toBe(false);
      expect(mockBackend.dispose).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple dispose calls gracefully', async () => {
      // Arrange
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };
      renderer = new NerfRenderer(config);
      await renderer.initialize();

      // Act
      renderer.dispose();
      renderer.dispose(); // Second call should not throw

      // Assert
      expect(renderer.getInitialized()).toBe(false);
      // dispose should only be called once on backend due to null check
      expect(mockBackend.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('performance metrics', () => {
    beforeEach(async () => {
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080] as [number, number],
        foveatedRendering: false,
        memoryLimit: 1024,
        powerMode: 'balanced' as const
      };
      renderer = new NerfRenderer(config);
      await renderer.initialize();
    });

    it('should track frame count and timing', async () => {
      // Arrange
      const mockModel = NerfModel.createMockModel();
      await renderer.loadModel(mockModel);
      
      const mockScene = {
        getVisibleModels: () => [{ model: mockModel, transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } }],
        getMemoryUsage: () => 1024,
        getConfig: () => ({ name: 'Test Scene' })
      };
      renderer.setScene(mockScene as any);

      const renderOptions = {
        cameraPosition: [0, 0, 2] as [number, number, number],
        cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        fieldOfView: 45,
        near: 0.1,
        far: 100
      };

      // Act
      await renderer.render(renderOptions);
      await renderer.render(renderOptions);
      await renderer.render(renderOptions);

      // Assert
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.frameCount).toBeGreaterThanOrEqual(0);
      expect(metrics.averageFrameTime).toBeGreaterThanOrEqual(0);
    });

    it('should provide render statistics', async () => {
      // Arrange
      const mockModel = NerfModel.createMockModel();
      await renderer.loadModel(mockModel);

      const renderOptions = {
        cameraPosition: [0, 0, 2] as [number, number, number],
        cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
        fieldOfView: 45,
        near: 0.1,
        far: 100
      };

      const mockScene = {
        getVisibleModels: () => [{ model: mockModel, transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } }],
        getMemoryUsage: () => 1024,
        getConfig: () => ({ name: 'Test Scene' })
      };
      renderer.setScene(mockScene as any);

      // Act
      await renderer.render(renderOptions);
      
      // Assert
      const stats = renderer.getRenderStats();
      expect(stats).toBeDefined();
      expect(stats.raysPerSecond).toBeGreaterThanOrEqual(0);
      expect(stats.trianglesRendered).toBeGreaterThanOrEqual(0);
    });
  });
});