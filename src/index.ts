/**
 * NeRF Edge Kit - Main Entry Point
 * Real-time Neural Radiance Field SDK for spatial computing
 */

// Core exports
export { NerfRenderer } from './rendering/NerfRenderer';
export { NerfScene } from './core/NerfScene';
export { NerfModel } from './core/NerfModel';
export { WebGPUBackend } from './rendering/WebGPUBackend';
export { SpatialUtils } from './utils/SpatialUtils';

// Service exports
export { NerfService } from './services/NerfService';
export { PerformanceService } from './services/PerformanceService';

// Database exports
export { NeRFStorage } from './database/NeRFStorage';
export { CacheManager } from './database/CacheManager';
export { ModelRepository } from './repositories/ModelRepository';

// Type exports
export type {
  NerfConfig,
  RenderOptions,
  SpatialTransform,
  PerformanceMetrics
} from './core/types';

export type {
  NerfModelData,
  SceneConfig,
  SceneModel
} from './core/NerfScene';

export type {
  FoveationConfig,
  RenderStats
} from './rendering/NerfRenderer';

export type {
  ModelOptimizationOptions,
  TrainingConfig,
  ModelMetrics
} from './services/NerfService';

export type {
  PerformanceTarget,
  PerformanceProfile,
  BenchmarkResult
} from './services/PerformanceService';

export type {
  StoredModel,
  StorageStats
} from './database/NeRFStorage';

export type {
  CacheEntry,
  CacheConfig,
  CacheMetrics
} from './database/CacheManager';

export type {
  ModelQuery,
  ModelCreateRequest,
  ModelUpdateRequest,
  ModelStats
} from './repositories/ModelRepository';

/**
 * SDK Version
 */
export const VERSION = '1.0.0';

/**
 * Global SDK instance for easier usage
 */
let globalSDK: {
  renderer: NerfRenderer | null;
  service: NerfService | null;
  performance: PerformanceService | null;
} = {
  renderer: null,
  service: null,
  performance: null
};

/**
 * Initialize the NeRF Edge Kit with comprehensive setup
 */
export async function initialize(config?: Partial<NerfConfig>): Promise<{
  renderer: NerfRenderer;
  service: NerfService;
  performance: PerformanceService;
}> {
  console.log('🚀 Initializing NeRF Edge Kit v1.0.0...');
  
  try {
    // Initialize core services
    const service = new NerfService();
    const performance = new PerformanceService();
    
    // Create renderer with config
    const defaultConfig: NerfConfig = {
      targetFPS: 60,
      maxResolution: [1920, 1080],
      foveatedRendering: false,
      memoryLimit: 1024,
      powerMode: 'balanced'
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    const renderer = new NerfRenderer(finalConfig);
    
    // Set performance profile based on config
    if (finalConfig.targetFPS >= 90) {
      performance.setProfile('vision-pro');
    } else if (finalConfig.memoryLimit <= 512) {
      performance.setProfile('iphone-15-pro');
    } else {
      performance.setProfile('web-high');
    }
    
    // Store global references
    globalSDK = { renderer, service, performance };
    
    console.log('✅ NeRF Edge Kit initialized successfully');
    console.log(`   Target FPS: ${finalConfig.targetFPS}`);
    console.log(`   Resolution: ${finalConfig.maxResolution.join('x')}`);
    console.log(`   Memory Limit: ${finalConfig.memoryLimit}MB`);
    console.log(`   Power Mode: ${finalConfig.powerMode}`);
    console.log(`   Foveated Rendering: ${finalConfig.foveatedRendering ? 'enabled' : 'disabled'}`);
    
    return { renderer, service, performance };
    
  } catch (error) {
    console.error('❌ Failed to initialize NeRF Edge Kit:', error);
    throw error;
  }
}

/**
 * Get the global SDK instance (must call initialize first)
 */
export function getSDK(): typeof globalSDK {
  return globalSDK;
}

/**
 * Create a quick demo scene for testing and development
 */
export async function createDemoScene(): Promise<NerfScene> {
  console.log('🎬 Creating demo scene...');
  
  const scene = NerfScene.createDemoScene();
  
  console.log('✅ Demo scene created with 3 mock NeRF models');
  return scene;
}

/**
 * Quick start function for common use cases
 */
export async function quickStart(canvas?: HTMLCanvasElement): Promise<{
  renderer: NerfRenderer;
  scene: NerfScene;
  service: NerfService;
}> {
  console.log('⚡ NeRF Edge Kit quick start...');
  
  // Initialize with optimal settings for web
  const { renderer, service } = await initialize({
    targetFPS: 60,
    maxResolution: [1280, 720],
    foveatedRendering: true,
    memoryLimit: 512,
    powerMode: 'balanced'
  });
  
  // Initialize renderer with canvas
  if (canvas) {
    await renderer.initialize(canvas);
  }
  
  // Create demo scene
  const scene = await createDemoScene();
  renderer.setScene(scene);
  
  // Start render loop with default camera
  const renderOptions: RenderOptions = {
    cameraPosition: [0, 1.6, 3], // Typical eye height, pulled back
    cameraRotation: [0, 0, 0, 1], // No rotation
    fieldOfView: 75,
    near: 0.1,
    far: 100
  };
  
  renderer.startRenderLoop(renderOptions);
  
  console.log('✅ Quick start complete - NeRF rendering active!');
  
  return { renderer, scene, service };
}

/**
 * Cleanup and dispose of all SDK resources
 */
export function dispose(): void {
  if (globalSDK.renderer) {
    globalSDK.renderer.dispose();
    globalSDK.renderer = null;
  }
  
  if (globalSDK.service) {
    globalSDK.service.dispose();
    globalSDK.service = null;
  }
  
  if (globalSDK.performance) {
    globalSDK.performance.dispose();
    globalSDK.performance = null;
  }
  
  console.log('🧹 NeRF Edge Kit disposed');
}