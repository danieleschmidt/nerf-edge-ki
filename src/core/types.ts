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

// WebGPU type declarations for compatibility
declare global {
  interface Navigator {
    gpu?: GPU;
  }

  interface GPU {
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat(): GPUTextureFormat;
  }

  interface GPUAdapter {
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
    info?: GPUAdapterInfo;
  }

  interface GPUAdapterInfo {
    vendor?: string;
    device?: string;
  }

  interface GPUDevice {
    limits: GPUSupportedLimits;
    features: GPUSupportedFeatures;
    createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
    createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
    createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
    createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
    createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
    createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
    queue: GPUQueue;
    destroy(): void;
    addEventListener(type: string, listener: (event: Event) => void): void;
  }

  interface GPUSupportedLimits {
    maxBufferSize?: number;
    maxTextureSize?: number;
    maxBindGroups?: number;
    [key: string]: number | undefined;
  }

  interface GPUSupportedFeatures extends Set<string> {
    // WebGPU supported features
  }

  interface GPUQueue {
    writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: ArrayBuffer | ArrayBufferView, dataOffset?: number, size?: number): void;
    writeTexture(destination: GPUImageCopyTexture, data: ArrayBuffer | ArrayBufferView, dataLayout: GPUImageDataLayout, size: GPUExtent3D): void;
    submit(commandBuffers: GPUCommandBuffer[]): void;
  }

  interface GPUShaderModule {
    // WebGPU shader module
  }
  interface GPUBuffer {
    size: number;
    destroy(): void;
  }
  interface GPUTexture {
    createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView;
    destroy(): void;
  }
  interface GPUTextureView {
    // WebGPU texture view
  }
  interface GPUBindGroupLayout {
    // WebGPU bind group layout
  }
  interface GPUPipelineLayout {
    // WebGPU pipeline layout
  }
  interface GPURenderPipeline {
    // WebGPU render pipeline
  }
  interface GPUCommandEncoder {
    beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder;
    finish(): GPUCommandBuffer;
  }
  interface GPUCommandBuffer {
    // WebGPU command buffer
  }
  interface GPURenderPassEncoder {
    end(): void;
  }
  interface GPUCanvasContext {
    configure(configuration: GPUCanvasConfiguration): void;
    getCurrentTexture(): GPUTexture;
  }

  type GPUTextureFormat = 'bgra8unorm' | 'rgba8unorm' | string;
  type GPUShaderStage = number;
  type GPUBufferUsage = number;
  type GPUTextureUsage = number;

  interface GPURequestAdapterOptions {
    powerPreference?: 'low-power' | 'high-performance';
    forceFallbackAdapter?: boolean;
  }

  interface GPUDeviceDescriptor {
    label?: string;
    requiredLimits?: Record<string, number>;
  }

  interface GPUShaderModuleDescriptor {
    label?: string;
    code: string;
  }

  interface GPUBufferDescriptor {
    label?: string;
    size: number;
    usage: number;
  }

  interface GPUTextureDescriptor {
    label?: string;
    size: GPUExtent3D;
    format: GPUTextureFormat;
    usage: number;
  }

  interface GPUExtent3D {
    width: number;
    height: number;
    depth?: number;
  }

  interface GPUBindGroupLayoutDescriptor {
    label?: string;
    entries: GPUBindGroupLayoutEntry[];
  }

  interface GPUBindGroupLayoutEntry {
    binding: number;
    visibility: number;
    buffer?: { type: string };
    texture?: { sampleType: string; viewDimension: string };
    sampler?: { type: string };
  }

  interface GPUPipelineLayoutDescriptor {
    label?: string;
    bindGroupLayouts: GPUBindGroupLayout[];
  }

  interface GPURenderPipelineDescriptor {
    label?: string;
    layout: GPUPipelineLayout;
    vertex: GPUVertexState;
    fragment?: GPUFragmentState;
    primitive?: GPUPrimitiveState;
    multisample?: GPUMultisampleState;
  }

  interface GPUVertexState {
    module: GPUShaderModule;
    entryPoint: string;
  }

  interface GPUFragmentState {
    module: GPUShaderModule;
    entryPoint: string;
    targets: GPUColorTargetState[];
  }

  interface GPUColorTargetState {
    format: GPUTextureFormat;
    blend?: GPUBlendState;
  }

  interface GPUBlendState {
    color: GPUBlendComponent;
    alpha: GPUBlendComponent;
  }

  interface GPUBlendComponent {
    srcFactor: string;
    dstFactor: string;
  }

  interface GPUPrimitiveState {
    topology: string;
    cullMode?: string;
  }

  interface GPUMultisampleState {
    count: number;
  }

  interface GPUCommandEncoderDescriptor {
    label?: string;
  }

  interface GPURenderPassDescriptor {
    label?: string;
    colorAttachments: GPURenderPassColorAttachment[];
  }

  interface GPURenderPassColorAttachment {
    view: GPUTextureView;
    clearValue: { r: number; g: number; b: number; a: number };
    loadOp: string;
    storeOp: string;
  }

  interface GPUTextureViewDescriptor {
    // WebGPU texture view descriptor
  }

  interface GPUCanvasConfiguration {
    device: GPUDevice;
    format: GPUTextureFormat;
    usage: number;
    alphaMode: string;
  }

  interface GPUImageCopyTexture {
    texture: GPUTexture;
    mipLevel?: number;
    origin?: GPUOrigin3D;
  }

  interface GPUOrigin3D {
    x?: number;
    y?: number;
    z?: number;
  }

  interface GPUImageDataLayout {
    bytesPerRow: number;
    rowsPerImage?: number;
  }

  const GPUShaderStage: {
    VERTEX: number;
    FRAGMENT: number;
    COMPUTE: number;
  };

  const GPUBufferUsage: {
    VERTEX: number;
    INDEX: number;
    UNIFORM: number;
    STORAGE: number;
    COPY_SRC: number;
    COPY_DST: number;
    INDIRECT: number;
    QUERY_RESOLVE: number;
  };

  const GPUTextureUsage: {
    COPY_SRC: number;
    COPY_DST: number;
    TEXTURE_BINDING: number;
    STORAGE_BINDING: number;
    RENDER_ATTACHMENT: number;
  };
}