/**
 * Basic functionality tests
 */

import { NerfModel } from '../src/core/NerfModel';
import { NerfScene } from '../src/core/NerfScene';

describe('Basic NeRF Functionality', () => {
  test('should create a NerfModel', () => {
    const model = new NerfModel();
    expect(model).toBeDefined();
    expect(model.isModelLoaded()).toBe(false);
  });

  test('should create a mock model', () => {
    const model = NerfModel.createMockModel();
    expect(model).toBeDefined();
    expect(model.isModelLoaded()).toBe(true);
  });

  test('should create a NerfScene', () => {
    const scene = new NerfScene({
      name: 'test-scene',
      bounds: [[-1, -1, -1], [1, 1, 1]],
      maxModels: 10
    });
    
    expect(scene).toBeDefined();
    expect(scene.getConfig().name).toBe('test-scene');
  });

  test('should add model to scene', async () => {
    const scene = new NerfScene({
      name: 'test-scene',
      bounds: [[-1, -1, -1], [1, 1, 1]],
      maxModels: 10
    });

    const model = NerfModel.createMockModel();
    await scene.addModel(model, { id: 'test-model' });
    
    expect(scene.getModels().length).toBe(1);
    expect(scene.getModel('test-model')).toBeDefined();
  });

  test('should validate core types', () => {
    const renderOptions = {
      cameraPosition: [0, 0, 5] as [number, number, number],
      cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
      fieldOfView: 60,
      near: 0.1,
      far: 100
    };

    expect(renderOptions.cameraPosition).toEqual([0, 0, 5]);
    expect(renderOptions.fieldOfView).toBe(60);
  });
});