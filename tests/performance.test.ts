/**
 * Basic performance benchmarks for NeRF Edge Kit
 */

import { NerfModel } from '../src/core/NerfModel';
import { NerfScene } from '../src/core/NerfScene';
import { NerfRenderer } from '../src/rendering/NerfRenderer';

describe('Performance Benchmarks', () => {
  beforeAll(() => {
    jest.setTimeout(30000);
  });

  it('should create models efficiently', async () => {
    const startTime = performance.now();
    
    // Create 100 mock models
    const models = [];
    for (let i = 0; i < 100; i++) {
      models.push(NerfModel.createMockModel());
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(models).toHaveLength(100);
    expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second
    
    console.log(`Created 100 models in ${totalTime.toFixed(2)}ms`);
  });

  it('should handle scene operations efficiently', async () => {
    const startTime = performance.now();
    
    const scene = new NerfScene({
      name: 'Performance Test Scene',
      bounds: [[-10, -10, -10], [10, 10, 10]]
    });
    
    // Add 50 models to scene
    for (let i = 0; i < 50; i++) {
      const model = NerfModel.createMockModel();
      scene.addModel(`model-${i}`, model);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(scene.getModels()).toHaveLength(50);
    expect(totalTime).toBeLessThan(500); // Should complete in under 500ms
    
    console.log(`Added 50 models to scene in ${totalTime.toFixed(2)}ms`);
  });

  it('should initialize renderer within performance targets', async () => {
    const startTime = performance.now();
    
    const renderer = new NerfRenderer({
      targetFPS: 60,
      maxResolution: [1920, 1080] as [number, number],
      foveatedRendering: true
    });
    
    // Mock canvas
    const mockCanvas = document.createElement('canvas');
    await renderer.initialize(mockCanvas);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(totalTime).toBeLessThan(100); // Should initialize in under 100ms
    
    console.log(`Renderer initialized in ${totalTime.toFixed(2)}ms`);
    
    renderer.dispose();
  });

  it('should maintain memory efficiency', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Create and dispose many objects
    const objects = [];
    for (let i = 0; i < 1000; i++) {
      objects.push(NerfModel.createMockModel());
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDiff = (finalMemory - initialMemory) / 1024 / 1024; // MB
    
    console.log(`Memory usage increased by ${memoryDiff.toFixed(2)}MB for 1000 models`);
    
    // Should not use more than 100MB for 1000 mock models
    expect(memoryDiff).toBeLessThan(100);
  });
});