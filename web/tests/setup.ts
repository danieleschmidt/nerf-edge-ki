/**
 * Jest test setup for nerf-edge-kit
 * Configures test environment for WebGPU, performance testing, and mocking
 */

import 'jest-extended';

// Mock WebGPU API for testing
Object.defineProperty(global, 'navigator', {
  value: {
    ...global.navigator,
    gpu: {
      requestAdapter: jest.fn().mockResolvedValue({
        requestDevice: jest.fn().mockResolvedValue({
          createShaderModule: jest.fn(),
          createRenderPipeline: jest.fn(),
          createBuffer: jest.fn(),
          queue: {
            submit: jest.fn(),
            writeBuffer: jest.fn(),
          },
        }),
      }),
    },
  },
  writable: true,
});

// Mock Performance APIs
Object.defineProperty(global, 'performance', {
  value: {
    ...global.performance,
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn().mockReturnValue([]),
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

// Mock Canvas and WebGL contexts
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgpu') {
    return {
      configure: jest.fn(),
      getCurrentTexture: jest.fn().mockReturnValue({
        createView: jest.fn(),
      }),
    };
  }
  return null;
});

// Custom matchers for NeRF testing
expect.extend({
  toBeWithinRenderTime(received: number, maxTime: number) {
    const pass = received <= maxTime;
    return {
      message: () =>
        `expected render time ${received}ms to be ${
          pass ? 'greater than' : 'within'
        } ${maxTime}ms`,
      pass,
    };
  },

  toHaveValidNeRFFormat(received: any) {
    const hasRequiredFields = 
      received &&
      typeof received.metadata === 'object' &&
      Array.isArray(received.layers) &&
      typeof received.bounds === 'object';
    
    return {
      message: () =>
        `expected object to ${
          hasRequiredFields ? 'not ' : ''
        }have valid NeRF format`,
      pass: hasRequiredFields,
    };
  },
});

// Global test timeout for performance tests
jest.setTimeout(10000);

// Mock console methods in tests but preserve in CI
if (process.env.NODE_ENV === 'test' && !process.env.CI) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Set up fake timers for animation testing
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});