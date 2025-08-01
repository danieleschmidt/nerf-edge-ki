/**
 * NeRF Edge Kit - Main Entry Point
 * Real-time Neural Radiance Field SDK for spatial computing
 */

export { NerfRenderer } from './rendering/NerfRenderer';
export { NerfScene } from './core/NerfScene';
export { NerfModel } from './core/NerfModel';
export { WebGPUBackend } from './rendering/WebGPUBackend';
export { SpatialUtils } from './utils/SpatialUtils';

export type {
  NerfConfig,
  RenderOptions,
  SpatialTransform,
  PerformanceMetrics
} from './core/types';

/**
 * SDK Version
 */
export const VERSION = '1.0.0';

/**
 * Initialize the NeRF Edge Kit
 */
import type { NerfConfig } from './core/types';

export async function initialize(config?: Partial<NerfConfig>): Promise<void> {
  // Initialization logic will be implemented
  if (config) {
    console.log('NeRF Edge Kit v1.0.0 initialized with config:', config);
  } else {
    console.log('NeRF Edge Kit v1.0.0 initialized');
  }
}