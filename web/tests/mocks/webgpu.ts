/**
 * WebGPU Mock Implementation for Testing
 * Provides comprehensive mocking of WebGPU API for unit testing
 */

// Mock GPU adapter
export const mockGPUAdapter = {
  requestDevice: jest.fn().mockResolvedValue({
    features: new Set(['timestamp-query', 'depth-clip-control']),
    limits: {
      maxBindGroups: 4,
      maxTextureSize2D: 8192,
      maxBufferSize: 256 * 1024 * 1024,
    },
    createShaderModule: jest.fn().mockReturnValue({
      getCompilationInfo: jest.fn().mockResolvedValue({ messages: [] }),
    }),
    createBuffer: jest.fn().mockReturnValue({
      mapAsync: jest.fn().mockResolvedValue(undefined),
      getMappedRange: jest.fn().mockReturnValue(new ArrayBuffer(1024)),
      unmap: jest.fn(),
      destroy: jest.fn(),
    }),
    createTexture: jest.fn().mockReturnValue({
      createView: jest.fn().mockReturnValue({}),
      destroy: jest.fn(),
    }),
    createBindGroup: jest.fn().mockReturnValue({}),
    createBindGroupLayout: jest.fn().mockReturnValue({}),
    createPipelineLayout: jest.fn().mockReturnValue({}),
    createRenderPipeline: jest.fn().mockReturnValue({
      getBindGroupLayout: jest.fn().mockReturnValue({}),
    }),
    createComputePipeline: jest.fn().mockReturnValue({
      getBindGroupLayout: jest.fn().mockReturnValue({}),
    }),
    createCommandEncoder: jest.fn().mockReturnValue({
      beginRenderPass: jest.fn().mockReturnValue({
        setPipeline: jest.fn(),
        setBindGroup: jest.fn(),
        draw: jest.fn(),
        drawIndexed: jest.fn(),
        end: jest.fn(),
      }),
      beginComputePass: jest.fn().mockReturnValue({
        setPipeline: jest.fn(),
        setBindGroup: jest.fn(),
        dispatchWorkgroups: jest.fn(),
        end: jest.fn(),
      }),
      copyBufferToBuffer: jest.fn(),
      copyTextureToBuffer: jest.fn(),
      finish: jest.fn().mockReturnValue({}),
    }),
    queue: {
      submit: jest.fn(),
      writeBuffer: jest.fn(),
      writeTexture: jest.fn(),
      onSubmittedWorkDone: jest.fn().mockResolvedValue(undefined),
    },
    lost: Promise.resolve({ reason: 'destroyed' }),
    destroy: jest.fn(),
  }),
  features: new Set(['timestamp-query']),
  limits: {
    maxBindGroups: 4,
  },
  info: {
    vendor: 'mock-vendor',
    architecture: 'mock-arch',
    device: 'mock-device',
    description: 'Mock WebGPU Adapter',
  },
};

// Mock GPU interface
export const mockGPU = {
  requestAdapter: jest.fn().mockResolvedValue(mockGPUAdapter),
  getPreferredCanvasFormat: jest.fn().mockReturnValue('bgra8unorm'),
};

// Mock canvas context
export const mockCanvasContext = {
  configure: jest.fn(),
  unconfigure: jest.fn(),
  getCurrentTexture: jest.fn().mockReturnValue({
    createView: jest.fn().mockReturnValue({}),
    destroy: jest.fn(),
  }),
  canvas: {
    width: 1920,
    height: 1080,
  },
};

// Helper function to setup WebGPU mocks
export function setupWebGPUMocks() {
  Object.defineProperty(navigator, 'gpu', {
    value: mockGPU,
    writable: true,
    configurable: true,
  });

  HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
    if (contextId === 'webgpu') {
      return mockCanvasContext;
    }
    if (contextId === '2d') {
      return {
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(),
        putImageData: jest.fn(),
        createImageData: jest.fn(),
        drawImage: jest.fn(),
        canvas: { width: 1920, height: 1080 }
      };
    }
    return null;
  }) as any;
}

// Performance measurement mocks
export const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn().mockReturnValue([]),
  getEntriesByName: jest.fn().mockReturnValue([]),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  now: jest.fn(() => Date.now()),
};

// Mock OffscreenCanvas for worker testing
export const mockOffscreenCanvas = {
  getContext: jest.fn().mockReturnValue(mockCanvasContext),
  transferToImageBitmap: jest.fn().mockReturnValue({}),
  width: 1920,
  height: 1080,
};

// Setup all mocks
export function setupAllMocks() {
  setupWebGPUMocks();
  
  Object.defineProperty(global, 'performance', {
    value: mockPerformance,
    writable: true,
    configurable: true,
  });
  
  Object.defineProperty(global, 'OffscreenCanvas', {
    value: jest.fn().mockImplementation(() => mockOffscreenCanvas),
    writable: true,
    configurable: true,
  });
}