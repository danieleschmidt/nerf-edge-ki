/**
 * WebGPU rendering backend with pipeline management and resource handling
 */

export interface WebGPUConfig {
  powerPreference?: 'low-power' | 'high-performance';
  limits?: {
    maxBufferSize?: number;
    maxTextureSize?: number;
    maxBindGroups?: number;
  };
}

export interface PipelineConfig {
  vertex: string;
  fragment: string;
  uniforms: Array<{
    name: string;
    type: 'f32' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'texture2d';
  }>;
}

export interface BackendInfo {
  vendor: string;
  device: string;
  limits: any;
  features: string[];
}

export class WebGPUBackend {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private context: GPUCanvasContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private swapChainFormat: GPUTextureFormat = 'bgra8unorm';
  
  // Pipeline and resource management
  private pipelines: Map<string, GPURenderPipeline> = new Map();
  private uniformBuffers: Map<string, GPUBuffer> = new Map();
  private bindGroups: Map<string, GPUBindGroup> = new Map();
  private textures: Map<string, GPUTexture> = new Map();
  
  // Command buffers and passes  
  private commandEncoder: GPUCommandEncoder | null = null;
  private renderPass: GPURenderPassEncoder | null = null;
  
  // Performance tracking
  private gpuUsage = 0;
  private lastFrameTime = 0;
  private frameCount = 0;
  
  // Circuit breaker pattern for fault tolerance
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitBreakerOpen = false;
  private readonly maxFailures = 5;
  private readonly resetTimeout = 30000; // 30 seconds

  /**
   * Initialize WebGPU with optional canvas and configuration
   */
  async initialize(canvas?: HTMLCanvasElement | null, config: WebGPUConfig = {}): Promise<void> {
    try {
      if (!this.isSupported()) {
        throw new Error('WebGPU not supported in this browser');
      }

      // Request adapter with preferences
      this.adapter = await navigator.gpu!.requestAdapter({
        powerPreference: config.powerPreference || 'high-performance',
        forceFallbackAdapter: false
      });
      
      if (!this.adapter) {
        throw new Error('Failed to get WebGPU adapter');
      }

      // Get device with requested limits
      const deviceDescriptor: GPUDeviceDescriptor = {
        label: 'NeRF Renderer Device'
      };
      
      if (config.limits) {
        deviceDescriptor.requiredLimits = {
          maxBufferSize: config.limits.maxBufferSize || 268435456, // 256MB default
          maxTextureSize: config.limits.maxTextureSize || 8192,
          maxBindGroups: config.limits.maxBindGroups || 4
        };
      }
      
      this.device = await this.adapter.requestDevice(deviceDescriptor);
      
      // Setup error handling
      this.device.addEventListener('uncapturederror', (event: any) => {
        console.error('WebGPU uncaptured error:', event.error);
      });
      
      // Setup canvas if provided
      if (canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;
        
        if (!this.context) {
          throw new Error('Failed to get WebGPU context from canvas');
        }
        
        // Configure swap chain
        this.swapChainFormat = navigator.gpu!.getPreferredCanvasFormat();
        this.context.configure({
          device: this.device,
          format: this.swapChainFormat,
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
          alphaMode: 'premultiplied'
        });
      }
      
      console.log('WebGPU backend initialized:', this.getInfo());
      
    } catch (error) {
      console.error('Failed to initialize WebGPU backend:', error);
      throw error;
    }
  }

  /**
   * Create a render pipeline with shaders
   */
  async createRenderPipeline(name: string, config: PipelineConfig): Promise<void> {
    if (!this.device) throw new Error('WebGPU device not initialized');
    
    try {
      // Create shader modules
      const vertexModule = this.device.createShaderModule({
        label: `${name}-vertex`,
        code: config.vertex
      });
      
      const fragmentModule = this.device.createShaderModule({
        label: `${name}-fragment`, 
        code: config.fragment
      });
      
      // Create bind group layout for uniforms
      const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = [];
      
      config.uniforms.forEach((uniform, index) => {
        let bindingType: GPUBindGroupLayoutEntry['buffer' | 'texture' | 'sampler'];
        
        if (uniform.type === 'texture2d') {
          bindingType = {
            texture: {
              sampleType: 'float',
              viewDimension: '2d'
            }
          } as any;
        } else {
          bindingType = {
            buffer: {
              type: 'uniform'
            }
          } as any;
        }
        
        bindGroupLayoutEntries.push({
          binding: index,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          ...bindingType
        });
      });
      
      const bindGroupLayout = this.device.createBindGroupLayout({
        label: `${name}-bind-group-layout`,
        entries: bindGroupLayoutEntries
      });
      
      // Create pipeline layout
      const pipelineLayout = this.device.createPipelineLayout({
        label: `${name}-pipeline-layout`,
        bindGroupLayouts: [bindGroupLayout]
      });
      
      // Create render pipeline
      const pipeline = this.device.createRenderPipeline({
        label: name,
        layout: pipelineLayout,
        vertex: {
          module: vertexModule,
          entryPoint: 'main'
        },
        fragment: {
          module: fragmentModule,
          entryPoint: 'main',
          targets: [{
            format: this.swapChainFormat,
            blend: {
              color: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha'
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha'
              }
            }
          }]
        },
        primitive: {
          topology: 'triangle-list',
          cullMode: 'back'
        },
        multisample: {
          count: 1
        }
      });
      
      this.pipelines.set(name, pipeline);
      console.log(`Created render pipeline: ${name}`);
      
    } catch (error) {
      console.error(`Failed to create pipeline '${name}':`, error);
      throw error;
    }
  }

  /**
   * Update uniform buffer data
   */
  updateUniforms(pipelineName: string, uniforms: Record<string, any>): void {
    if (!this.device) throw new Error('WebGPU device not initialized');
    
    // Create or update uniform buffer
    const uniformData = this.packUniforms(uniforms);
    
    let buffer = this.uniformBuffers.get(pipelineName);
    if (!buffer || buffer.size < uniformData.byteLength) {
      // Create new buffer if it doesn't exist or is too small
      buffer?.destroy();
      
      buffer = this.device.createBuffer({
        label: `${pipelineName}-uniforms`,
        size: Math.max(uniformData.byteLength, 256), // Minimum 256 bytes
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      
      this.uniformBuffers.set(pipelineName, buffer);
    }
    
    // Write data to buffer
    this.device.queue.writeBuffer(buffer, 0, uniformData);
  }

  /**
   * Begin a new frame
   */
  beginFrame(): void {
    if (!this.device || !this.context) throw new Error('WebGPU not properly initialized');
    
    this.commandEncoder = this.device.createCommandEncoder({
      label: 'Frame Command Encoder'
    });
    
    const textureView = this.context.getCurrentTexture().createView();
    
    this.renderPass = this.commandEncoder.beginRenderPass({
      label: 'Main Render Pass',
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    
    this.frameCount++;
    this.lastFrameTime = performance.now();
  }

  /**
   * End the current frame and submit commands
   */
  endFrame(): void {
    if (!this.device || !this.renderPass || !this.commandEncoder) {
      throw new Error('No active render pass');
    }
    
    this.renderPass.end();
    const commandBuffer = this.commandEncoder.finish();
    this.device.queue.submit([commandBuffer]);
    
    this.renderPass = null;
    this.commandEncoder = null;
    
    // Update GPU usage estimate
    this.updateGPUUsage();
  }

  /**
   * Create a texture from image data
   */
  createTexture(name: string, data: ImageData | ArrayBuffer, width: number, height: number): void {
    if (!this.device) throw new Error('WebGPU device not initialized');
    
    const texture = this.device.createTexture({
      label: name,
      size: { width, height },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    
    // Upload data if provided
    if (data instanceof ImageData) {
      this.device.queue.writeTexture(
        { texture },
        data.data,
        { bytesPerRow: width * 4 },
        { width, height }
      );
    } else if (data instanceof ArrayBuffer) {
      this.device.queue.writeTexture(
        { texture },
        data,
        { bytesPerRow: width * 4 },
        { width, height }
      );
    }
    
    this.textures.set(name, texture);
  }

  /**
   * Get device information and capabilities
   */
  getInfo(): BackendInfo {
    if (!this.adapter || !this.device) {
      return {
        vendor: 'Unknown',
        device: 'Unknown', 
        limits: {},
        features: []
      };
    }
    
    return {
      vendor: this.adapter.info?.vendor || 'Unknown',
      device: this.adapter.info?.device || 'Unknown',
      limits: this.device.limits,
      features: Array.from(this.device.features)
    };
  }

  /**
   * Get current GPU usage estimate (0-1)
   */
  getGPUUsage(): number {
    return this.gpuUsage;
  }

  /**
   * Check if WebGPU is supported
   */
  isSupported(): boolean {
    return !!(navigator as any).gpu;
  }

  /**
   * Get the WebGPU device
   */
  getDevice(): GPUDevice | null {
    return this.device;
  }

  /**
   * Get canvas context
   */
  getContext(): GPUCanvasContext | null {
    return this.context;
  }

  /**
   * Circuit breaker methods for fault tolerance
   */
  private checkCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.resetTimeout) {
        console.log('🔄 Circuit breaker reset - attempting to recover');
        this.circuitBreakerOpen = false;
        this.failureCount = 0;
      } else {
        throw new Error('Circuit breaker is open - WebGPU operations suspended');
      }
    }
  }

  private recordFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.maxFailures) {
      this.circuitBreakerOpen = true;
      console.error(`⚠️  Circuit breaker opened after ${this.failureCount} failures. Last error:`, error);
    }
  }

  private recordSuccess(): void {
    if (this.failureCount > 0) {
      this.failureCount = Math.max(0, this.failureCount - 1); // Gradually reduce failure count on success
    }
  }

  // Private helper methods
  
  private packUniforms(uniforms: Record<string, any>): ArrayBuffer {
    // Simple uniform packing - in production would need proper alignment
    const buffer = new ArrayBuffer(1024); // 1KB buffer
    const view = new DataView(buffer);
    let offset = 0;
    
    for (const [, value] of Object.entries(uniforms)) {
      if (Array.isArray(value)) {
        // Vector or matrix data
        for (const element of value) {
          view.setFloat32(offset, element, true);
          offset += 4;
        }
      } else if (typeof value === 'number') {
        // Scalar value
        view.setFloat32(offset, value, true);
        offset += 4;
      }
      
      // Align to 16 bytes for next uniform
      offset = Math.ceil(offset / 16) * 16;
    }
    
    return buffer.slice(0, offset);
  }
  
  private updateGPUUsage(): void {
    // Simple GPU usage estimation based on frame time
    const frameTime = performance.now() - this.lastFrameTime;
    const targetFrameTime = 1000 / 60; // 60 FPS target
    
    this.gpuUsage = Math.min(1.0, frameTime / targetFrameTime);
  }

  /**
   * Dispose of all resources
   */
  
  /**
   * Render a frame with the given camera parameters
   */
  async render(
    cameraPosition: [number, number, number],
    cameraRotation: [number, number, number, number],
    fieldOfView: number
  ): Promise<void> {
    if (!this.device || !this.context || !this.canvas) {
      throw new Error('WebGPU backend not initialized');
    }
    
    try {
      // Begin command encoding
      const commandEncoder = this.device.createCommandEncoder({
        label: 'NeRF Render Command Encoder'
      });
      
      // Get current canvas texture
      const canvasTexture = this.context.getCurrentTexture();
      const view = canvasTexture.createView();
      
      // Begin render pass
      const renderPass = commandEncoder.beginRenderPass({
        label: 'NeRF Render Pass',
        colorAttachments: [{
          view,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });
      
      // Update camera uniforms (simplified)
      const cameraData = new Float32Array([
        ...cameraPosition,
        fieldOfView / 180 * Math.PI, // Convert to radians
        ...cameraRotation
      ]);
      
      // Write camera data to uniform buffer if available
      if (this.uniformBuffers.has('camera')) {
        const cameraBuffer = this.uniformBuffers.get('camera')!;
        this.device.queue.writeBuffer(cameraBuffer, 0, cameraData);
      }
      
      // Set pipeline and draw (simplified for basic functionality)
      if (this.pipelines.has('default')) {
        const pipeline = this.pipelines.get('default')!;
        // Cast to any to bypass TypeScript issues with WebGPU types
        (renderPass as any).setPipeline(pipeline);
        
        // Draw fullscreen quad for ray marching
        (renderPass as any).draw(3, 1, 0, 0); // Triangle trick for fullscreen
      }
      
      renderPass.end();
      
      // Submit commands
      const commands = commandEncoder.finish();
      this.device.queue.submit([commands]);
      
    } catch (error) {
      console.error('WebGPU render failed:', error);
      throw new Error(`WebGPU rendering failed: ${error.message}`);
    }
  }
  
  dispose(): void {
    // Destroy all buffers
    for (const buffer of this.uniformBuffers.values()) {
      buffer.destroy();
    }
    this.uniformBuffers.clear();
    
    // Destroy all textures
    for (const texture of this.textures.values()) {
      texture.destroy();
    }
    this.textures.clear();
    
    // Clear pipelines and bind groups
    this.pipelines.clear();
    this.bindGroups.clear();
    
    // Clean up device
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    
    this.adapter = null;
    this.context = null;
    this.canvas = null;
    
    console.log('WebGPU backend disposed');
  }

  /**
   * Set rendering resolution
   */
  setResolution(width: number, height: number): void {
    if (!this.canvas || !this.context) return;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Reconfigure context with new size
    this.context.configure({
      device: this.device!,
      format: this.swapChainFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      alphaMode: 'premultiplied'
    });
  }
}