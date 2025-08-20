/**
 * Performance test setup for NeRF Edge Kit
 */

// Performance test utilities
(global as any).performance = {
  ...performance,
  mark: (name: string) => performance.mark ? performance.mark(name) : Date.now(),
  measure: (name: string, start?: string, end?: string) => {
    if (performance.measure) {
      return performance.measure(name, start, end);
    }
    return { duration: Math.random() * 100 }; // Mock duration
  }
};

// WebGPU mock for testing
(global as any).navigator = {
  ...navigator,
  gpu: {
    requestAdapter: jest.fn().mockResolvedValue({
      requestDevice: jest.fn().mockResolvedValue({
        queue: { submit: jest.fn() },
        createBuffer: jest.fn(),
        createTexture: jest.fn(),
        createRenderPipeline: jest.fn(),
        createCommandEncoder: jest.fn().mockReturnValue({
          beginRenderPass: jest.fn().mockReturnValue({
            setPipeline: jest.fn(),
            draw: jest.fn(),
            end: jest.fn()
          }),
          finish: jest.fn()
        })
      })
    })
  }
};

// Performance test helpers
export const perfTestHelpers = {
  measurePerformance: async (testFn: () => Promise<void>, iterations: number = 100): Promise<number> => {
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await testFn();
    }
    
    const end = performance.now();
    return (end - start) / iterations;
  },

  expectPerformance: (actualTime: number, expectedTime: number, tolerance: number = 0.2) => {
    const toleranceMs = expectedTime * tolerance;
    expect(actualTime).toBeLessThanOrEqual(expectedTime + toleranceMs);
  }
};

console.log('🏁 Performance test environment initialized');