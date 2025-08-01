/**
 * Core type definitions for NeRF Edge Kit
 */

export interface NerfConfig {
  /** Target frame rate (90 for Vision Pro, 60 for iPhone/Web) */
  targetFPS: number;
  /** Maximum rendering resolution */
  maxResolution: [number, number];
  /** Enable foveated rendering */
  foveatedRendering: boolean;
  /** GPU memory limit in MB */
  memoryLimit: number;
  /** Power management mode */
  powerMode: 'performance' | 'balanced' | 'power-saving';
}

export interface RenderOptions {
  /** Camera position in world space */
  cameraPosition: [number, number, number];
  /** Camera rotation quaternion */
  cameraRotation: [number, number, number, number];
  /** Field of view in degrees */
  fieldOfView: number;
  /** Near clipping plane */
  near: number;
  /** Far clipping plane */
  far: number;
}

export interface SpatialTransform {
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
}

export interface PerformanceMetrics {
  /** Current frame rate */
  fps: number;
  /** Frame time in milliseconds */
  frameTime: number;
  /** GPU utilization percentage */
  gpuUtilization: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Power consumption in watts */
  powerConsumption: number;
}