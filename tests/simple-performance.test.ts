/**
 * Simple performance benchmarks for NeRF Edge Kit
 */

import { NerfModel } from '../src/core/NerfModel';
import { NerfScene } from '../src/core/NerfScene';

describe('Simple Performance Benchmarks', () => {
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
    expect(totalTime).toBeLessThan(2000); // Should complete in under 2 seconds
    
    console.log(`✅ Created 100 models in ${totalTime.toFixed(2)}ms`);
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
    expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second
    
    console.log(`✅ Added 50 models to scene in ${totalTime.toFixed(2)}ms`);
  });

  it('should maintain reasonable memory usage', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Create and reference many objects
    const objects = [];
    for (let i = 0; i < 500; i++) {
      objects.push(NerfModel.createMockModel());
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDiff = (finalMemory - initialMemory) / 1024 / 1024; // MB
    
    console.log(`✅ Memory usage increased by ${memoryDiff.toFixed(2)}MB for 500 models`);
    
    // Should not use more than 200MB for 500 mock models
    expect(memoryDiff).toBeLessThan(200);
    expect(objects).toHaveLength(500);
  });

  it('should validate NeRF scene configuration performance', () => {
    const startTime = performance.now();
    
    // Create complex scene with multiple configurations
    const scenes = [];
    for (let i = 0; i < 20; i++) {
      scenes.push(new NerfScene({
        name: `Scene ${i}`,
        bounds: [[-i, -i, -i], [i, i, i]],
        lighting: {
          ambient: [0.1, 0.1, 0.1]
        },
        background: {
          type: 'color',
          value: [0.2, 0.2, 0.3]
        }
      }));
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(scenes).toHaveLength(20);
    expect(totalTime).toBeLessThan(100); // Scene creation should be very fast
    
    console.log(`✅ Created 20 complex scenes in ${totalTime.toFixed(2)}ms`);
  });
});