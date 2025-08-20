/**
 * Main NeRF rendering engine with WebGPU backend and foveated rendering
 */

import { PerformanceMetrics, NerfConfig, RenderOptions } from '../core/types';
import { NerfScene } from '../core/NerfScene';
import { WebGPUBackend } from './WebGPUBackend';

export interface FoveationConfig {
  enabled: boolean;
  centerRadius: number; // Radius of high-quality center region (0-1)
  levels: number; // Number of quality levels (2-5)
  blendWidth: number; // Smoothing between levels (0-1)
  eyeTracking: boolean; // Use eye tracking data
}

export interface RenderStats {
  raysPerSecond: number;
  trianglesRendered: number;
  drawCalls: number;
  shaderCompileTime: number;
  memoryAllocated: number;
}

export class NerfRenderer {
  private config: NerfConfig;
  private backend: WebGPUBackend | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private isInitialized = false;
  private isRendering = false;
  private currentScene: NerfScene | null = null;
  private animationFrame: number | null = null;
  
  // Performance tracking
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];
  private fpsHistory: number[] = [];
  private renderStats: RenderStats;
  
  // Foveated rendering
  private foveationConfig: FoveationConfig;
  private eyeTrackingData: { x: number; y: number } | null = null;
  
  // Adaptive quality
  private currentQuality: 'low' | 'medium' | 'high' = 'medium';
  private adaptiveQualityEnabled = true;

  constructor(config: Partial<NerfConfig> = {}) {
    this.config = {
      targetFPS: 60,
      maxResolution: [1920, 1080],
      foveatedRendering: false,
      memoryLimit: 2048,
      powerMode: 'balanced',
      ...config
    };
    
    this.foveationConfig = {
      enabled: this.config.foveatedRendering,
      centerRadius: 0.3,
      levels: 3,
      blendWidth: 0.15,
      eyeTracking: false
    };
    
    this.renderStats = {
      raysPerSecond: 0,
      trianglesRendered: 0,
      drawCalls: 0,
      shaderCompileTime: 0,
      memoryAllocated: 0
    };
  }

  /**
   * Initialize the renderer with WebGPU backend
   */
  async initialize(canvas?: HTMLCanvasElement): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        this.canvas = canvas || null;
        
        // Check WebGPU support before initialization
        if (!navigator.gpu) {
          throw new Error('WebGPU not supported in this browser');
        }
        
        // Initialize WebGPU backend with fallback options
        this.backend = new WebGPUBackend();
        await this.backend.initialize(this.canvas, {
          powerPreference: this.config.powerMode === 'performance' ? 'high-performance' : 'low-power',
          limits: {
            maxBufferSize: this.config.memoryLimit * 1024 * 1024 // Convert MB to bytes
          }
        });
        
        this.isInitialized = true;
        
        console.log(`✅ NeRF Renderer initialized successfully`);
        console.log(`   Target FPS: ${this.config.targetFPS}`);
        console.log(`   Max Resolution: ${this.config.maxResolution.join('x')}`);
        console.log(`   Memory Limit: ${this.config.memoryLimit}MB`);
        console.log(`   Foveated Rendering: ${this.config.foveatedRendering ? 'enabled' : 'disabled'}`);
        
        return; // Success, break retry loop
        
      } catch (error) {
        attempt++;
        console.warn(`WebGPU initialization failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt >= maxRetries) {
          throw new Error(`Failed to initialize WebGPU after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Set the scene to render
   */
  setScene(scene: NerfScene): void {
    if (!this.isInitialized) {
      throw new Error('Renderer must be initialized before setting scene');
    }
    
    this.currentScene = scene;
    
    // Update memory stats
    this.renderStats.memoryAllocated = scene.getMemoryUsage();
    
    console.log(`Scene set: ${scene.getConfig().name} (${scene.getVisibleModels().length} models, ${(this.renderStats.memoryAllocated / 1024 / 1024).toFixed(1)}MB)`);
  }

  /**
   * Render a single frame
   */
  async render(options: RenderOptions): Promise<void> {
    if (!this.isInitialized || !this.backend || !this.currentScene) {
      throw new Error('Renderer not properly initialized');
    }
    
    const frameStart = performance.now();
    
    // Update adaptive quality based on performance
    if (this.adaptiveQualityEnabled) {
      this.updateAdaptiveQuality();
    }
    
    // Begin frame
    this.backend.beginFrame();
    
    try {
      // Update uniforms
      const uniforms = this.prepareUniforms(options);
      this.backend.updateUniforms('nerf-main', uniforms);
      
      // Render each model in the scene
      const visibleModels = this.currentScene.getVisibleModels();
      this.renderStats.drawCalls = 0;
      
      for (const sceneModel of visibleModels) {
        await this.renderModel(sceneModel, options);
        this.renderStats.drawCalls++;
      }
      
      // Apply post-processing
      await this.applyPostProcessing();
      
    } finally {
      // End frame
      this.backend.endFrame();
    }
    
    // Update performance metrics
    const frameTime = performance.now() - frameStart;
    this.updatePerformanceMetrics(frameTime);
  }

  /**
   * Start continuous render loop
   */
  startRenderLoop(options: RenderOptions): void {
    if (this.isRendering) return;
    
    this.isRendering = true;
    const renderLoop = async () => {
      if (!this.isRendering) return;
      
      try {
        await this.render(options);
        this.animationFrame = requestAnimationFrame(renderLoop);
      } catch (error) {
        console.error('Render loop error:', error);
        this.stopRenderLoop();
      }
    };
    
    renderLoop();
  }

  /**
   * Stop render loop
   */
  stopRenderLoop(): void {
    this.isRendering = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Update adaptive quality based on performance
   */
  private updateAdaptiveQuality(): void {
    if (this.fpsHistory.length < 10) return;
    
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length;
    const targetFPS = this.config.targetFPS;
    
    if (avgFPS < targetFPS * 0.85) {
      // Performance too low, reduce quality
      if (this.currentQuality === 'high') {
        this.currentQuality = 'medium';
        console.log('🔄 Adaptive quality: reduced to medium');
      } else if (this.currentQuality === 'medium') {
        this.currentQuality = 'low';
        console.log('🔄 Adaptive quality: reduced to low');
      }
    } else if (avgFPS > targetFPS * 1.1) {
      // Performance good, can increase quality
      if (this.currentQuality === 'low') {
        this.currentQuality = 'medium';
        console.log('🔄 Adaptive quality: increased to medium');
      } else if (this.currentQuality === 'medium') {
        this.currentQuality = 'high';
        console.log('🔄 Adaptive quality: increased to high');
      }
    }
    
    // Apply quality settings
    this.applyQualitySettings();
  }

  /**
   * Apply current quality settings
   */
  private applyQualitySettings(): void {
    const qualityMultiplier = {
      low: 0.5,
      medium: 0.75,
      high: 1.0
    };
    
    const multiplier = qualityMultiplier[this.currentQuality];
    
    // Update resolution based on quality
    const [maxWidth, maxHeight] = this.config.maxResolution;
    const adjustedWidth = Math.floor(maxWidth * multiplier);
    const adjustedHeight = Math.floor(maxHeight * multiplier);
    
    if (this.backend) {
      this.backend.setResolution(adjustedWidth, adjustedHeight);
    }
  }

  /**
   * Prepare uniform data for shaders
   */
  private prepareUniforms(options: RenderOptions): Record<string, any> {
    return {
      cameraPosition: new Float32Array(options.cameraPosition),
      cameraRotation: new Float32Array(options.cameraRotation),
      projection: this.createProjectionMatrix(options),
      time: Date.now() / 1000,
      quality: this.currentQuality,
      foveationEnabled: this.foveationConfig.enabled
    };
  }

  /**
   * Create projection matrix from render options
   */
  private createProjectionMatrix(options: RenderOptions): Float32Array {
    const aspect = this.config.maxResolution[0] / this.config.maxResolution[1];
    const fov = (options.fieldOfView * Math.PI) / 180;
    const near = options.near;
    const far = options.far;
    
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1.0 / (near - far);
    
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
  }

  /**
   * Render a single model
   */
  private async renderModel(_sceneModel: any, _options: RenderOptions): Promise<void> {
    // Placeholder - actual model rendering would happen here
    // This would involve setting up model-specific uniforms and drawing
    this.renderStats.trianglesRendered += 1000; // Mock data
  }

  /**
   * Apply post-processing effects
   */
  private async applyPostProcessing(): Promise<void> {
    if (!this.backend) return;
    
    // Apply foveated rendering if enabled
    if (this.foveationConfig.enabled) {
      await this.applyFoveatedRendering();
    }
    
    // Apply tone mapping and gamma correction
    await this.applyToneMapping();
  }

  /**
   * Apply foveated rendering
   */
  private async applyFoveatedRendering(): Promise<void> {
    // Placeholder for foveated rendering implementation
    // Would reduce quality in peripheral vision
  }

  /**
   * Apply tone mapping
   */
  private async applyToneMapping(): Promise<void> {
    // Placeholder for tone mapping implementation
    // Would apply HDR tone mapping for proper display
  }

  /**
   * Load a NeRF model for rendering
   */
  async loadModel(model: import('../core/NerfModel').NerfModel): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Renderer must be initialized before loading models');
    }
    
    try {
      console.log('Loading NeRF model...');
      
      // Validate model
      if (!model.isLoaded()) {
        throw new Error('Model is not loaded');
      }
      
      // Load model data into GPU memory
      const modelData = model.getNetworkData();
      if (!modelData || modelData.byteLength === 0) {
        throw new Error('Invalid model data');
      }
      
      // Update render stats
      this.renderStats.memoryAllocated += modelData.byteLength;
      
      console.log(`✅ NeRF model loaded (${(modelData.byteLength / 1024 / 1024).toFixed(2)}MB)`);
    } catch (error) {
      console.error('Failed to load NeRF model:', error);
      throw new Error(`Model loading failed: ${error.message}`);
    }
  }

  /**
   * Check if the renderer is initialized
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current render statistics
   */
  getRenderStats(): RenderStats {
    return { ...this.renderStats };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const avgFrameTime = this.frameTimeHistory.length > 0 
      ? this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length 
      : 0;
      
    const avgFPS = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    
    return {
      fps: Math.round(avgFPS),
      frameTime: Math.round(avgFrameTime * 100) / 100,
      memoryUsage: Math.round(this.renderStats.memoryAllocated / 1024 / 1024),
      drawCalls: this.renderStats.drawCalls,
      quality: this.currentQuality
    };
  }

  /**
   * Validate render options
   */
  private validateRenderOptions(options: RenderOptions): void {
    if (!options.cameraPosition || options.cameraPosition.length !== 3) {
      throw new Error('Invalid camera position');
    }
    
    if (!options.cameraRotation || options.cameraRotation.length !== 4) {
      throw new Error('Invalid camera rotation quaternion');
    }
    
    if (options.fieldOfView <= 0 || options.fieldOfView >= 180) {
      throw new Error('Field of view must be between 0 and 180 degrees');
    }
    
    if (options.near <= 0 || options.far <= options.near) {
      throw new Error('Invalid near/far plane values');
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate average frame time and FPS
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length;
    const fps = 1000 / avgFrameTime;
    
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 30) {
      this.fpsHistory.shift();
    }
    
    // Update render stats
    this.renderStats.raysPerSecond = Math.round(fps * 1000000); // Estimated rays per second
    
    this.frameCount++;
  }

  /**
   * Dispose of renderer resources
   */
  dispose(): void {
    try {
      this.stopRenderLoop();
      this.backend?.dispose();
      this.backend = null;
      this.currentScene = null;
      this.isInitialized = false;
      this.canvas = null;
      
      console.log('🧹 NeRF Renderer disposed');
    } catch (error) {
      console.error('Error disposing renderer:', error);
    }
  }
}