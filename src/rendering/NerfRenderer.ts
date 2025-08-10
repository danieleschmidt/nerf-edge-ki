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
    try {
      this.canvas = canvas || null;
      
      // Initialize WebGPU backend
      this.backend = new WebGPUBackend();
      await this.backend.initialize(this.canvas, {
        powerPreference: this.config.powerMode === 'performance' ? 'high-performance' : 'low-power',
        limits: {
          maxBufferSize: this.config.memoryLimit * 1024 * 1024 // Convert MB to bytes
        }
      });
      
      // Setup render pipeline
      await this.setupRenderPipeline();
      
      this.isInitialized = true;
      
      console.log(`NerfRenderer initialized: ${this.config.maxResolution.join('x')} @ ${this.config.targetFPS}fps`);
      console.log(`Backend: ${this.backend.getInfo().vendor} ${this.backend.getInfo().device}`);
      
    } catch (error) {
      console.error('Failed to initialize NerfRenderer:', error);
      throw error;
    }
  }

  /**
   * Setup the rendering pipeline with shaders and buffers
   */
  private async setupRenderPipeline(): Promise<void> {
    if (!this.backend) throw new Error('Backend not initialized');
    
    const startTime = performance.now();
    
    // Create render pipeline for NeRF rendering
    await this.backend.createRenderPipeline('nerf-main', {
      vertex: this.getVertexShader(),
      fragment: this.getFragmentShader(),
      uniforms: [
        { name: 'viewMatrix', type: 'mat4' },
        { name: 'projMatrix', type: 'mat4' },
        { name: 'time', type: 'f32' },
        { name: 'resolution', type: 'vec2' },
        { name: 'foveationCenter', type: 'vec2' },
        { name: 'foveationParams', type: 'vec4' }
      ]
    });
    
    // Create foveated rendering pipeline if enabled
    if (this.foveationConfig.enabled) {
      await this.backend.createRenderPipeline('nerf-foveated', {
        vertex: this.getVertexShader(),
        fragment: this.getFoveatedFragmentShader(),
        uniforms: [
          { name: 'viewMatrix', type: 'mat4' },
          { name: 'projMatrix', type: 'mat4' },
          { name: 'foveationLUT', type: 'texture2d' }
        ]
      });
    }
    
    this.renderStats.shaderCompileTime = performance.now() - startTime;
  }

  /**
   * Set the scene to render
   */
  setScene(scene: NerfScene): void {
    if (!scene.isSceneLoaded()) {
      throw new Error('Scene is not loaded');
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
   * Start the render loop
   */
  startRenderLoop(options: RenderOptions): void {
    if (this.isRendering) return;
    
    this.isRendering = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    
    const renderLoop = async () => {
      if (!this.isRendering) return;
      
      try {
        await this.render(options);
      } catch (error) {
        console.error('Render error:', error);
      }
      
      this.animationFrame = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
    console.log('Render loop started');
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop(): void {
    this.isRendering = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    console.log('Render loop stopped');
  }

  /**
   * Enable/disable foveated rendering
   */
  setFoveatedRendering(config: Partial<FoveationConfig>): void {
    this.foveationConfig = { ...this.foveationConfig, ...config };
    
    if (this.foveationConfig.enabled) {
      console.log(`Foveated rendering enabled: ${this.foveationConfig.levels} levels, ${this.foveationConfig.centerRadius} center radius`);
    } else {
      console.log('Foveated rendering disabled');
    }
  }

  /**
   * Update eye tracking data for foveated rendering
   */
  updateEyeTracking(x: number, y: number): void {
    if (this.foveationConfig.enabled && this.foveationConfig.eyeTracking) {
      this.eyeTrackingData = { x, y };
    }
  }

  /**
   * Set rendering quality level
   */
  setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.currentQuality = quality;
    
    // Update all models in the current scene
    if (this.currentScene) {
      for (const sceneModel of this.currentScene.getModels()) {
        sceneModel.model.setQuality(quality);
      }
    }
    
    console.log(`Rendering quality set to: ${quality}`);
  }

  /**
   * Enable/disable adaptive quality
   */
  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQualityEnabled = enabled;
    console.log(`Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const avgFrameTime = this.frameTimeHistory.length > 0 
      ? this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length 
      : 0;
    
    const avgFPS = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length
      : 0;
    
    return {
      fps: Math.round(avgFPS * 10) / 10,
      frameTime: Math.round(avgFrameTime * 100) / 100,
      gpuUtilization: this.backend?.getGPUUsage() || 0,
      memoryUsage: this.renderStats.memoryAllocated / 1024 / 1024, // MB
      powerConsumption: this.estimatePowerConsumption()
    };
  }

  /**
   * Get detailed render statistics
   */
  getRenderStats(): RenderStats {
    return { ...this.renderStats };
  }

  /**
   * Get renderer info and capabilities
   */
  getInfo(): any {
    return {
      backend: this.backend?.getInfo() || null,
      config: this.config,
      foveation: this.foveationConfig,
      quality: this.currentQuality,
      adaptiveQuality: this.adaptiveQualityEnabled,
      initialized: this.isInitialized,
      rendering: this.isRendering
    };
  }

  // Private helper methods
  
  private prepareUniforms(options: RenderOptions): Record<string, any> {
    const [width, height] = this.config.maxResolution;
    
    return {
      viewMatrix: this.createViewMatrix(options),
      projMatrix: this.createProjectionMatrix(options, width / height),
      time: performance.now() / 1000,
      resolution: [width, height],
      foveationCenter: this.eyeTrackingData ? [this.eyeTrackingData.x, this.eyeTrackingData.y] : [0.5, 0.5],
      foveationParams: [this.foveationConfig.centerRadius, this.foveationConfig.levels, this.foveationConfig.blendWidth, 0]
    };
  }
  
  private createViewMatrix(options: RenderOptions): number[] {
    // Simplified view matrix creation
    return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  }
  
  private createProjectionMatrix(options: RenderOptions, aspectRatio: number): number[] {
    // Simplified projection matrix creation
    const fov = options.fieldOfView * Math.PI / 180;
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (options.near - options.far);
    
    return [
      f / aspectRatio, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (options.far + options.near) * nf, -1,
      0, 0, 2 * options.far * options.near * nf, 0
    ];
  }
  
  private async renderModel(sceneModel: any, options: RenderOptions): Promise<void> {
    // Model-specific rendering logic would go here
    this.renderStats.trianglesRendered += 1000; // Mock value
  }
  
  private async applyPostProcessing(): Promise<void> {
    // Post-processing effects (TAA, tone mapping, etc.)
  }
  
  private updatePerformanceMetrics(frameTime: number): void {
    this.frameCount++;
    
    // Update frame time history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate FPS
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    if (deltaTime >= 1000) { // Update FPS every second
      const fps = this.frameCount * 1000 / deltaTime;
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }
      
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }
    
    // Update rays per second estimate
    const [width, height] = this.config.maxResolution;
    this.renderStats.raysPerSecond = Math.round((width * height) / (frameTime / 1000));
  }
  
  private updateAdaptiveQuality(): void {
    const metrics = this.getPerformanceMetrics();
    const targetFPS = this.config.targetFPS;
    
    if (metrics.fps < targetFPS * 0.8) {
      // Performance is poor, lower quality
      if (this.currentQuality === 'high') {
        this.setQuality('medium');
      } else if (this.currentQuality === 'medium') {
        this.setQuality('low');
      }
    } else if (metrics.fps > targetFPS * 0.95) {
      // Performance is good, try higher quality
      if (this.currentQuality === 'low') {
        this.setQuality('medium');
      } else if (this.currentQuality === 'medium') {
        this.setQuality('high');
      }
    }
  }
  
  private estimatePowerConsumption(): number {
    // Simple power estimation based on GPU usage and quality
    const baseWatts = this.config.powerMode === 'performance' ? 8 : 4;
    const gpuUsage = this.backend?.getGPUUsage() || 0.5;
    return baseWatts * gpuUsage;
  }
  
  private getVertexShader(): string {
    return `
      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) uv: vec2<f32>,
      };
      
      @vertex
      fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
        var pos = array<vec2<f32>, 6>(
          vec2<f32>(-1.0, -1.0),
          vec2<f32>( 1.0, -1.0),
          vec2<f32>(-1.0,  1.0),
          vec2<f32>( 1.0, -1.0),
          vec2<f32>( 1.0,  1.0),
          vec2<f32>(-1.0,  1.0)
        );
        
        var output: VertexOutput;
        output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
        output.uv = pos[vertexIndex] * 0.5 + 0.5;
        return output;
      }
    `;
  }
  
  private getFragmentShader(): string {
    return `
      struct Uniforms {
        viewMatrix: mat4x4<f32>,
        projMatrix: mat4x4<f32>,
        time: f32,
        resolution: vec2<f32>,
        foveationCenter: vec2<f32>,
        foveationParams: vec4<f32>,
      };
      
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      
      @fragment
      fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
        // Simple NeRF-style ray marching
        let rayDir = normalize(vec3<f32>(uv * 2.0 - 1.0, 1.0));
        
        // Sample color based on ray direction and time
        let color = vec3<f32>(
          0.5 + 0.5 * sin(uniforms.time + rayDir.x * 3.14159),
          0.5 + 0.5 * sin(uniforms.time + rayDir.y * 3.14159 + 2.094),
          0.5 + 0.5 * sin(uniforms.time + rayDir.z * 3.14159 + 4.188)
        );
        
        return vec4<f32>(color, 1.0);
      }
    `;
  }
  
  private getFoveatedFragmentShader(): string {
    return `
      struct Uniforms {
        viewMatrix: mat4x4<f32>,
        projMatrix: mat4x4<f32>,
        foveationLUT: texture_2d<f32>,
      };
      
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      @group(0) @binding(1) var textureSampler: sampler;
      
      @fragment
      fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
        // Sample foveation quality from lookup texture
        let quality = textureSample(uniforms.foveationLUT, textureSampler, uv).r;
        
        // Adjust ray marching steps based on quality
        let steps = i32(8.0 * quality + 2.0);
        
        // Simplified foveated ray marching
        let rayDir = normalize(vec3<f32>(uv * 2.0 - 1.0, 1.0));
        var color = vec3<f32>(0.0);
        
        for (var i = 0; i < steps; i++) {
          let t = f32(i) / f32(steps);
          let samplePos = rayDir * t;
          color += vec3<f32>(0.1) * (1.0 - t);
        }
        
        return vec4<f32>(color, 1.0);
      }
    `;
  }

  /**
   * Dispose of renderer resources
   */
  dispose(): void {
    this.stopRenderLoop();
    this.backend?.dispose();
    this.backend = null;
    this.canvas = null;
    this.currentScene = null;
    this.isInitialized = false;
    console.log('NerfRenderer disposed');
  }
}