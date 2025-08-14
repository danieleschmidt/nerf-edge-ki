/**
 * Unit tests for NerfService
 */

import { NerfService, ModelOptimizationOptions } from '../../src/services/NerfService';
// import { NerfModel } from '../../src/core/NerfModel';

describe('NerfService', () => {
  let service: NerfService;

  beforeEach(() => {
    service = new NerfService();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('model loading', () => {
    it('should load model from ArrayBuffer', async () => {
      // Arrange
      const mockData = new ArrayBuffer(1024);
      const modelId = 'test-model';

      // Act
      const model = await service.loadModel(mockData, modelId);

      // Assert
      expect(model).toBeDefined();
      expect(model.loaded).toBe(true);
    });

    it('should cache loaded models', async () => {
      // Arrange
      const mockData = new ArrayBuffer(1024);
      const modelId = 'cached-model';

      // Act
      const model1 = await service.loadModel(mockData, modelId);
      const model2 = await service.loadModel(mockData, modelId);

      // Assert
      expect(model1).toBe(model2); // Same instance from cache
    });
  });

  describe('model optimization', () => {
    const modelId = 'optimization-test';

    beforeEach(async () => {
      const mockData = new ArrayBuffer(4096);
      await service.loadModel(mockData, modelId);
    });

    it('should optimize model for Vision Pro', async () => {
      // Arrange
      const options: ModelOptimizationOptions = {
        targetDevice: 'vision-pro',
        quality: 'high'
      };

      // Act
      const optimizedModel = await service.optimizeModel(modelId, options);

      // Assert
      expect(optimizedModel).toBeDefined();
      expect(optimizedModel.optimized).toBe(true);
    });
  });

  describe('resource management', () => {
    it('should dispose resources properly', async () => {
      // Arrange
      const mockData = new ArrayBuffer(1024);
      await service.loadModel(mockData, 'dispose-test');

      // Act
      service.dispose();
      const stats = service.getCacheStats();

      // Assert
      expect(stats.totalModels).toBe(0);
    });
  });
});