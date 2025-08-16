/**
 * NeRF scene management with multiple models and spatial relationships
 */

import { NerfModel } from './NerfModel';
import { SpatialTransform } from './types';

export interface NerfModelData {
  id: string;
  name: string;
  networkWeights: ArrayBuffer;
  boundingBox: [number, number, number, number, number, number];
  resolution: [number, number, number];
  format: 'instant-ngp' | 'tensorf' | 'neus';
  metadata: Record<string, any>;
}

export interface SceneConfig {
  /** Scene name */
  name: string;
  /** Scene description */
  description?: string;
  /** Maximum number of models in scene */
  maxModels?: number;
  /** Global lighting parameters */
  lighting: {
    ambient: [number, number, number];
    directional?: {
      direction: [number, number, number];
      intensity: number;
      color: [number, number, number];
    };
  };
  /** Background color or environment map */
  background: {
    type: 'color' | 'hdri' | 'transparent';
    value: [number, number, number] | string;
  };
  /** Scene bounds for optimization */
  bounds: [[number, number, number], [number, number, number]];
}

export interface SceneModel {
  id: string;
  model: NerfModel;
  transform: SpatialTransform;
  visible: boolean;
  opacity: number;
  priority: number; // Rendering order
}

export class NerfScene {
  private models: Map<string, SceneModel> = new Map();
  private config: SceneConfig;
  private isLoaded = false;
  private lastUpdateTime = 0;

  constructor(config?: Partial<SceneConfig>) {
    this.config = {
      name: 'Untitled Scene',
      lighting: {
        ambient: [0.1, 0.1, 0.1]
      },
      background: {
        type: 'color',
        value: [0.05, 0.05, 0.1]
      },
      bounds: [[-10, -10, -10], [10, 10, 10]],
      ...config
    };
  }

  /**
   * Add a NeRF model to the scene
   */
  addModel(id: string, model: NerfModel, transform?: Partial<SpatialTransform>): void {
    if (this.models.has(id)) {
      console.warn(`Model with id '${id}' already exists, replacing...`);
    }

    const sceneModel: SceneModel = {
      id,
      model,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
        ...transform
      },
      visible: true,
      opacity: 1.0,
      priority: this.models.size
    };

    // Update model transform
    model.setTransform(sceneModel.transform);
    this.models.set(id, sceneModel);
    this.lastUpdateTime = Date.now();
    
    console.log(`Added model '${id}' to scene '${this.config.name}'`);
  }

  /**
   * Remove a model from the scene
   */
  removeModel(id: string): boolean {
    const removed = this.models.delete(id);
    if (removed) {
      this.lastUpdateTime = Date.now();
      console.log(`Removed model '${id}' from scene`);
    }
    return removed;
  }

  /**
   * Get a specific model from the scene
   */
  getModel(id: string): SceneModel | undefined {
    return this.models.get(id);
  }

  /**
   * Get all models in the scene, sorted by priority
   */
  getModels(): SceneModel[] {
    return Array.from(this.models.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get only visible models for rendering
   */
  getVisibleModels(): SceneModel[] {
    return this.getModels().filter(model => model.visible && model.model.isModelLoaded());
  }

  /**
   * Update model transform
   */
  updateModelTransform(id: string, transform: Partial<SpatialTransform>): boolean {
    const sceneModel = this.models.get(id);
    if (!sceneModel) return false;

    sceneModel.transform = { ...sceneModel.transform, ...transform };
    sceneModel.model.setTransform(sceneModel.transform);
    this.lastUpdateTime = Date.now();
    return true;
  }

  /**
   * Set model visibility
   */
  setModelVisibility(id: string, visible: boolean): boolean {
    const sceneModel = this.models.get(id);
    if (!sceneModel) return false;

    sceneModel.visible = visible;
    this.lastUpdateTime = Date.now();
    return true;
  }

  /**
   * Set model opacity
   */
  setModelOpacity(id: string, opacity: number): boolean {
    const sceneModel = this.models.get(id);
    if (!sceneModel) return false;

    sceneModel.opacity = Math.max(0, Math.min(1, opacity));
    this.lastUpdateTime = Date.now();
    return true;
  }

  /**
   * Set model rendering priority
   */
  setModelPriority(id: string, priority: number): boolean {
    const sceneModel = this.models.get(id);
    if (!sceneModel) return false;

    sceneModel.priority = priority;
    this.lastUpdateTime = Date.now();
    return true;
  }

  /**
   * Load multiple models from a scene configuration
   */
  async loadFromConfig(sceneData: any): Promise<void> {
    try {
      if (sceneData.config) {
        this.config = { ...this.config, ...sceneData.config };
      }

      if (sceneData.models && Array.isArray(sceneData.models)) {
        for (const modelData of sceneData.models) {
          const model = new NerfModel();
          await model.load(modelData.source);
          this.addModel(modelData.id, model, modelData.transform);
          
          if (modelData.visible !== undefined) {
            this.setModelVisibility(modelData.id, modelData.visible);
          }
          if (modelData.opacity !== undefined) {
            this.setModelOpacity(modelData.id, modelData.opacity);
          }
        }
      }

      this.isLoaded = true;
      console.log(`Scene '${this.config.name}' loaded with ${this.models.size} models`);
    } catch (error) {
      console.error('Failed to load scene:', error);
      throw error;
    }
  }

  /**
   * Create a demo scene for testing
   */
  static createDemoScene(): NerfScene {
    const scene = new NerfScene({
      name: 'Demo Scene',
      description: 'A demonstration scene with mock NeRF models',
      lighting: {
        ambient: [0.2, 0.2, 0.25],
        directional: {
          direction: [0.5, -1, 0.3],
          intensity: 1.0,
          color: [1, 0.95, 0.8]
        }
      },
      background: {
        type: 'color',
        value: [0.1, 0.15, 0.2]
      },
      bounds: [[-5, -5, -5], [5, 5, 5]]
    });

    // Add some demo models
    const centerModel = NerfModel.createMockModel();
    scene.addModel('center', centerModel, {
      position: [0, 0, 0],
      scale: [1.5, 1.5, 1.5]
    });

    const leftModel = NerfModel.createMockModel();
    scene.addModel('left', leftModel, {
      position: [-3, 0, 0],
      scale: [0.8, 0.8, 0.8]
    });

    const rightModel = NerfModel.createMockModel();
    scene.addModel('right', rightModel, {
      position: [3, 0, 0],
      scale: [0.8, 0.8, 0.8]
    });

    scene.isLoaded = true;
    return scene;
  }

  /**
   * Get scene configuration
   */
  getConfig(): SceneConfig {
    return { ...this.config };
  }

  /**
   * Update scene configuration
   */
  updateConfig(config: Partial<SceneConfig>): void {
    this.config = { ...this.config, ...config };
    this.lastUpdateTime = Date.now();
  }

  /**
   * Get scene bounds that encompass all models
   */
  getSceneBounds(): [[number, number, number], [number, number, number]] {
    if (this.models.size === 0) {
      return this.config.bounds;
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const sceneModel of this.models.values()) {
      if (!sceneModel.visible) continue;
      
      const bounds = sceneModel.model.getBoundingBox();
      const [min, max] = bounds;
      
      minX = Math.min(minX, min[0]);
      minY = Math.min(minY, min[1]);
      minZ = Math.min(minZ, min[2]);
      maxX = Math.max(maxX, max[0]);
      maxY = Math.max(maxY, max[1]);
      maxZ = Math.max(maxZ, max[2]);
    }

    return [[minX, minY, minZ], [maxX, maxY, maxZ]];
  }

  /**
   * Check if scene is loaded and ready for rendering
   */
  isSceneLoaded(): boolean {
    return this.isLoaded && this.getVisibleModels().length > 0;
  }

  /**
   * Get the last update timestamp
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * Get total memory usage of all models in the scene
   */
  getMemoryUsage(): number {
    let total = 0;
    for (const sceneModel of this.models.values()) {
      total += sceneModel.model.getMemoryUsage();
    }
    return total;
  }

  /**
   * Optimize scene by removing invisible or distant models
   */
  optimizeForCamera(cameraPosition: [number, number, number], maxDistance: number = 50): void {
    for (const [, sceneModel] of this.models.entries()) {
      const modelPos = sceneModel.transform.position;
      const distance = Math.sqrt(
        Math.pow(cameraPosition[0] - modelPos[0], 2) +
        Math.pow(cameraPosition[1] - modelPos[1], 2) +
        Math.pow(cameraPosition[2] - modelPos[2], 2)
      );
      
      // Hide models that are too far away
      if (distance > maxDistance) {
        sceneModel.visible = false;
      }
    }
    
    this.lastUpdateTime = Date.now();
  }

  /**
   * Dispose of all models and free memory
   */
  dispose(): void {
    for (const sceneModel of this.models.values()) {
      sceneModel.model.dispose();
    }
    this.models.clear();
    this.isLoaded = false;
    this.lastUpdateTime = Date.now();
  }
}