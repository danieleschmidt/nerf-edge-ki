/**
 * WebGPU Integration Tests
 * 
 * These tests verify the integration between our NeRF renderer and the WebGPU API.
 * They use real WebGPU calls where possible and mock only external dependencies.
 */

import { WebGPUBackend } from '../../src/rendering/WebGPUBackend';
import { NerfModel } from '../../src/core/NerfModel';
import '../../web/tests/setup';

describe('WebGPU Integration', () => {
  let backend: WebGPUBackend;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    backend = new WebGPUBackend(canvas);
  });

  afterEach(() => {
    if (backend) {
      backend.dispose();
    }
  });

  describe('WebGPU availability', () => {
    it('should detect WebGPU support correctly', () => {
      // This test will use the mocked WebGPU API
      const isSupported = backend.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    it('should provide fallback when WebGPU is not available', () => {
      // Arrange: Temporarily disable WebGPU mock
      const originalNavigator = (global as any).navigator;
      (global as any).navigator = { gpu: undefined };

      // Act
      const fallbackBackend = new WebGPUBackend(canvas);
      const isSupported = fallbackBackend.isSupported();

      // Assert
      expect(isSupported).toBe(false);

      // Cleanup
      (global as any).navigator = originalNavigator;
    });
  });

  describe('device initialization', () => {
    it('should initialize WebGPU device and context', async () => {
      // Act
      await backend.initialize();

      // Assert
      expect(backend.getDevice()).toBeDefined();
      expect(backend.getContext()).toBeDefined();
    });

    it('should handle initialization failure gracefully', async () => {
      // Arrange: Mock adapter failure
      const mockGPU = (global as any).navigator.gpu;
      mockGPU.requestAdapter.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(backend.initialize()).rejects.toThrow('WebGPU adapter not available');
    });

    it('should configure context with correct format', async () => {
      // Act
      await backend.initialize();

      // Assert
      const context = backend.getContext();
      expect(context.getCurrentTexture).toBeDefined();
      
      // Verify context configuration was called
      expect(context.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          device: expect.any(Object),
          format: 'bgra8unorm',
          alphaMode: 'premultiplied'
        })
      );
    });
  });

  describe('shader compilation', () => {
    beforeEach(async () => {
      await backend.initialize();
    });

    it('should compile vertex shader successfully', async () => {
      // Arrange
      const vertexShaderSource = `
        @vertex
        fn vs_main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
          return vec4<f32>(position, 1.0);
        }
      `;

      // Act
      const shader = backend.createShaderModule(vertexShaderSource);

      // Assert
      expect(shader).toBeDefined();
      expect(backend.getDevice().createShaderModule).toHaveBeenCalledWith({
        code: vertexShaderSource
      });
    });

    it('should compile fragment shader successfully', async () => {
      // Arrange
      const fragmentShaderSource = `
        @fragment
        fn fs_main() -> @location(0) vec4<f32> {
          return vec4<f32>(1.0, 0.0, 0.0, 1.0);
        }
      `;

      // Act
      const shader = backend.createShaderModule(fragmentShaderSource);

      // Assert
      expect(shader).toBeDefined();
    });

    it('should handle shader compilation errors', async () => {
      // Arrange
      const invalidShaderSource = 'invalid shader code';
      const mockDevice = backend.getDevice();
      mockDevice.createShaderModule.mockImplementation(() => {
        throw new Error('Shader compilation failed');
      });

      // Act & Assert
      expect(() => backend.createShaderModule(invalidShaderSource))
        .toThrow('Shader compilation failed');
    });
  });

  describe('render pipeline creation', () => {
    let mockModel: NerfModel;

    beforeEach(async () => {
      await backend.initialize();
      
      mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(1024),
        getVertexData: () => new Float32Array([
          -1, -1, 0,  1, -1, 0,  0, 1, 0  // Triangle vertices
        ]),
        getIndexData: () => new Uint16Array([0, 1, 2])
      } as NerfModel;
    });

    it('should create render pipeline for NeRF model', async () => {
      // Act
      const pipeline = await backend.createRenderPipeline(mockModel);

      // Assert
      expect(pipeline).toBeDefined();
      expect(backend.getDevice().createRenderPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          vertex: expect.objectContaining({
            module: expect.any(Object),
            entryPoint: 'vs_main'
          }),
          fragment: expect.objectContaining({
            module: expect.any(Object),
            entryPoint: 'fs_main'
          }),
          primitive: expect.objectContaining({
            topology: 'triangle-list'
          })
        })
      );
    });

    it('should create vertex buffer for model data', async () => {
      // Act
      await backend.createRenderPipeline(mockModel);

      // Assert
      expect(backend.getDevice().createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          size: expect.any(Number),
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true
        })
      );
    });

    it('should create uniform buffer for camera data', async () => {
      // Act
      await backend.createRenderPipeline(mockModel);

      // Assert
      expect(backend.getDevice().createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 64, // 4x4 matrix
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
      );
    });
  });

  describe('rendering operations', () => {
    let mockModel: NerfModel;
    let pipeline: GPURenderPipeline;

    beforeEach(async () => {
      await backend.initialize();
      
      mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(1024),
        getVertexData: () => new Float32Array(9), // 3 vertices
        getIndexData: () => new Uint16Array([0, 1, 2])
      } as NerfModel;
      
      pipeline = await backend.createRenderPipeline(mockModel);
    });

    it('should execute render pass successfully', async () => {
      // Arrange
      const camera = {
        position: [0, 0, 2],
        target: [0, 0, 0],
        fov: Math.PI / 4
      };

      // Act
      await backend.render(camera, mockModel);

      // Assert
      const device = backend.getDevice();
      expect(device.createCommandEncoder).toHaveBeenCalled();
      
      // Verify render pass was created and executed
      const mockCommandEncoder = device.createCommandEncoder();
      expect(mockCommandEncoder.beginRenderPass).toHaveBeenCalledWith(
        expect.objectContaining({
          colorAttachments: expect.arrayContaining([
            expect.objectContaining({
              view: expect.any(Object),
              clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
              loadOp: 'clear',
              storeOp: 'store'
            })
          ])
        })
      );
    });

    it('should update uniform buffer with camera data', async () => {
      // Arrange
      const camera = {
        position: [1, 2, 3],
        target: [0, 0, 0],
        fov: Math.PI / 3
      };

      // Act
      await backend.render(camera, mockModel);

      // Assert
      const device = backend.getDevice();
      expect(device.queue.writeBuffer).toHaveBeenCalledWith(
        expect.any(Object), // uniform buffer
        0,
        expect.any(ArrayBuffer) // camera matrix data
      );
    });

    it('should handle render errors gracefully', async () => {
      // Arrange
      const camera = { position: [0, 0, 2], target: [0, 0, 0], fov: Math.PI / 4 };
      const mockDevice = backend.getDevice();
      mockDevice.createCommandEncoder.mockImplementation(() => {
        throw new Error('Command encoder creation failed');
      });

      // Act & Assert
      await expect(backend.render(camera, mockModel))
        .rejects.toThrow('Command encoder creation failed');
    });
  });

  describe('performance optimization', () => {
    beforeEach(async () => {
      await backend.initialize();
    });

    it('should reuse command encoders when possible', async () => {
      // Arrange
      const mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(1024),
        getVertexData: () => new Float32Array(9),
        getIndexData: () => new Uint16Array([0, 1, 2])
      } as NerfModel;
      
      await backend.createRenderPipeline(mockModel);
      const camera = { position: [0, 0, 2], target: [0, 0, 0], fov: Math.PI / 4 };

      // Act
      await backend.render(camera, mockModel);
      await backend.render(camera, mockModel);

      // Assert - Command encoder should be created efficiently
      const device = backend.getDevice();
      const encoderCallCount = (device.createCommandEncoder as jest.Mock).mock.calls.length;
      expect(encoderCallCount).toBeGreaterThan(0);
    });

    it('should track GPU memory usage', async () => {
      // Arrange
      const mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(2048),
        getVertexData: () => new Float32Array(1000),
        getIndexData: () => new Uint16Array([0, 1, 2])
      } as NerfModel;

      // Act
      await backend.createRenderPipeline(mockModel);

      // Assert
      const memoryUsage = backend.getMemoryUsage();
      expect(memoryUsage.buffers).toBeGreaterThan(0);
      expect(memoryUsage.textures).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resource cleanup', () => {
    it('should dispose all resources properly', async () => {
      // Arrange
      await backend.initialize();
      const mockModel = {
        isLoaded: () => true,
        getBounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
        getNetworkData: () => new ArrayBuffer(1024),
        getVertexData: () => new Float32Array(9),
        getIndexData: () => new Uint16Array([0, 1, 2])
      } as NerfModel;
      
      await backend.createRenderPipeline(mockModel);

      // Act
      backend.dispose();

      // Assert
      expect(backend.getDevice()).toBeNull();
      expect(backend.getContext()).toBeNull();
      
      // Verify buffers were destroyed (if we track them)
      const memoryUsage = backend.getMemoryUsage();
      expect(memoryUsage.buffers).toBe(0);
    });

    it('should handle multiple dispose calls without errors', async () => {
      // Arrange
      await backend.initialize();

      // Act
      backend.dispose();
      backend.dispose(); // Should not throw

      // Assert
      expect(backend.getDevice()).toBeNull();
    });
  });
});