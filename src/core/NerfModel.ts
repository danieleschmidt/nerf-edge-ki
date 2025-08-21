/**
 * Individual NeRF model representation with neural network weights and scene data
 */

import { SpatialTransform } from './types';

export interface NerfModelData {
  /** Neural network weights as Float32Array */
  weights: Float32Array;
  /** Model metadata */
  metadata: {
    version: string;
    resolution: [number, number, number];
    bounds: [[number, number, number], [number, number, number]];
    layers: number;
    hiddenSize: number;
  };
  /** Encoding parameters */
  encoding: {
    posEncoding: number;
    dirEncoding: number;
    hashTableSize: number;
  };
}

export class NerfModel {
  private transform: SpatialTransform;
  private _isLoaded = false;
  private modelData: NerfModelData | null = null;
  private boundingBox: [[number, number, number], [number, number, number]];
  private quality: 'low' | 'medium' | 'high' = 'medium';

  constructor() {
    this.transform = {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1]
    };
    this.boundingBox = [[-1, -1, -1], [1, 1, 1]];
  }

  /**
   * Load NeRF model from binary data or URL
   */
  async load(source: ArrayBuffer | string): Promise<void> {
    try {
      let data: ArrayBuffer;
      
      if (typeof source === 'string') {
        // Load from URL
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to load model from ${source}: ${response.statusText}`);
        }
        data = await response.arrayBuffer();
      } else {
        data = source;
      }

      // Parse binary model data
      this.modelData = this.parseModelData(data);
      this.boundingBox = this.modelData.metadata.bounds;
      this._isLoaded = true;
      
      console.log(`Successfully loaded NeRF model: ${this.modelData.metadata.resolution.join('x')} resolution, ${this.modelData.weights.length} weights`);
    } catch (error) {
      console.error('Failed to load NeRF model:', error);
      throw error;
    }
  }

  /**
   * Parse binary model data into structured format
   */
  private parseModelData(buffer: ArrayBuffer): NerfModelData {
    const view = new DataView(buffer);
    let offset = 0;

    // Read header
    const version = new TextDecoder().decode(buffer.slice(offset, offset + 8)).replace(/\0/g, '');
    offset += 8;
    
    const resolution: [number, number, number] = [
      view.getUint32(offset, true), 
      view.getUint32(offset + 4, true), 
      view.getUint32(offset + 8, true)
    ];
    offset += 12;

    const layers = view.getUint32(offset, true);
    offset += 4;
    const hiddenSize = view.getUint32(offset, true);
    offset += 4;

    // Read bounding box
    const bounds: [[number, number, number], [number, number, number]] = [
      [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)],
      [view.getFloat32(offset + 12, true), view.getFloat32(offset + 16, true), view.getFloat32(offset + 20, true)]
    ];
    offset += 24;

    // Read encoding parameters
    const posEncoding = view.getUint32(offset, true);
    offset += 4;
    const dirEncoding = view.getUint32(offset, true);
    offset += 4;
    const hashTableSize = view.getUint32(offset, true);
    offset += 4;

    // Read weights
    const weightsSize = view.getUint32(offset, true);
    offset += 4;
    const weights = new Float32Array(buffer, offset, weightsSize / 4);

    return {
      weights,
      metadata: {
        version,
        resolution,
        bounds,
        layers,
        hiddenSize
      },
      encoding: {
        posEncoding,
        dirEncoding,
        hashTableSize
      }
    };
  }

  /**
   * Load NeRF model from file with automatic format detection
   */
  static async loadFromFile(file: File): Promise<NerfModel> {
    const model = new NerfModel();
    const buffer = await file.arrayBuffer();
    await model.load(buffer);
    return model;
  }

  /**
   * Create a mock model for testing and development
   */
  static createMockModel(): NerfModel {
    const model = new NerfModel();
    const mockWeights = new Float32Array(1024); // 4KB of mock weights
    mockWeights.fill(0.5); // Initialize with reasonable values
    
    // Create mock binary data
    const buffer = new ArrayBuffer(1024 * 4 + 100); // weights + headers
    const view = new DataView(buffer);
    
    // Write header
    const encoder = new TextEncoder();
    const versionBytes = encoder.encode('NERF1.0\0');
    new Uint8Array(buffer, 0, 8).set(versionBytes);
    
    let offset = 8;
    view.setUint32(offset, 512, true); // resolution x
    view.setUint32(offset + 4, 512, true); // resolution y  
    view.setUint32(offset + 8, 512, true); // resolution z
    offset += 12;
    
    view.setUint32(offset, 8, true); // layers
    view.setUint32(offset + 4, 256, true); // hidden size
    offset += 8;
    
    // Bounding box
    const bounds = [[-2, -2, -2], [2, 2, 2]];
    for (let i = 0; i < 6; i++) {
      view.setFloat32(offset + i * 4, bounds[Math.floor(i / 3)][i % 3], true);
    }
    offset += 24;
    
    // Encoding params
    view.setUint32(offset, 10, true); // pos encoding
    view.setUint32(offset + 4, 4, true); // dir encoding
    view.setUint32(offset + 8, 16384, true); // hash table size
    offset += 12;
    
    // Weights size and data
    view.setUint32(offset, mockWeights.byteLength, true);
    offset += 4;
    new Float32Array(buffer, offset).set(mockWeights);
    
    model.modelData = model.parseModelData(buffer);
    model._isLoaded = true;
    
    return model;
  }

  /**
   * Set model transform in world space
   */
  setTransform(transform: Partial<SpatialTransform>): void {
    this.transform = { ...this.transform, ...transform };
  }

  /**
   * Get current model transform
   */
  getTransform(): SpatialTransform {
    return { ...this.transform };
  }

  /**
   * Set rendering quality level
   */
  setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.quality = quality;
  }

  /**
   * Get current quality level
   */
  getQuality(): 'low' | 'medium' | 'high' {
    return this.quality;
  }

  /**
   * Get model bounding box in world coordinates
   */
  getBoundingBox(): [[number, number, number], [number, number, number]] {
    // Apply transform to bounding box
    const [min, max] = this.boundingBox;
    const [px, py, pz] = this.transform.position;
    const [sx, sy, sz] = this.transform.scale;
    
    return [
      [min[0] * sx + px, min[1] * sy + py, min[2] * sz + pz],
      [max[0] * sx + px, max[1] * sy + py, max[2] * sz + pz]
    ];
  }

  /**
   * Get neural network weights
   */
  getWeights(): Float32Array | null {
    return this.modelData?.weights || null;
  }

  /**
   * Get model metadata
   */
  getMetadata(): NerfModelData['metadata'] | null {
    return this.modelData?.metadata || null;
  }

  /**
   * Check if model is loaded and ready for rendering
   */
  isModelLoaded(): boolean {
    return this._isLoaded && this.modelData !== null;
  }

  /**
   * Get neural network data for GPU upload
   */
  getNetworkData(): ArrayBuffer | null {
    if (!this.modelData) {
      return null;
    }
    return this.modelData.weights.buffer.slice(0) as ArrayBuffer;
  }

  /**
   * Get memory usage in bytes
   */
  getMemoryUsage(): number {
    if (!this.modelData) return 0;
    return this.modelData.weights.byteLength + 1024; // weights + metadata overhead
  }

  /**
   * Generate optimized LOD versions of the model
   */
  generateLODVersions(): { low: Float32Array; medium: Float32Array; high: Float32Array } {
    if (!this.modelData) throw new Error('Model not loaded');
    
    const originalWeights = this.modelData.weights;
    
    // Generate LOD by reducing weight precision and network complexity
    return {
      low: this.quantizeWeights(originalWeights, 8), // 8-bit quantization
      medium: this.quantizeWeights(originalWeights, 16), // 16-bit quantization  
      high: originalWeights // Full precision
    };
  }

  /**
   * Quantize weights to reduce memory usage
   */
  private quantizeWeights(weights: Float32Array, bits: number): Float32Array {
    const scale = Math.pow(2, bits) - 1;
    const quantized = new Float32Array(weights.length);
    
    for (let i = 0; i < weights.length; i++) {
      const normalized = Math.max(-1, Math.min(1, weights[i])); // Clamp to [-1, 1]
      const quantizedValue = Math.round((normalized + 1) * 0.5 * scale);
      quantized[i] = (quantizedValue / scale) * 2 - 1;
    }
    
    return quantized;
  }

  /**
   * Export model to binary format
   */
  exportToBinary(): ArrayBuffer {
    if (!this.modelData) throw new Error('Model not loaded');
    
    const headerSize = 100;
    const weightsSize = this.modelData.weights.byteLength;
    const buffer = new ArrayBuffer(headerSize + weightsSize);
    const view = new DataView(buffer);
    
    // Write header (same format as parseModelData)
    const encoder = new TextEncoder();
    const versionBytes = encoder.encode(this.modelData.metadata.version.padEnd(8, '\0'));
    new Uint8Array(buffer, 0, 8).set(versionBytes.slice(0, 8));
    
    let offset = 8;
    view.setUint32(offset, this.modelData.metadata.resolution[0], true);
    view.setUint32(offset + 4, this.modelData.metadata.resolution[1], true);
    view.setUint32(offset + 8, this.modelData.metadata.resolution[2], true);
    offset += 12;
    
    view.setUint32(offset, this.modelData.metadata.layers, true);
    view.setUint32(offset + 4, this.modelData.metadata.hiddenSize, true);
    offset += 8;
    
    // Write bounding box
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        view.setFloat32(offset, this.modelData.metadata.bounds[i][j], true);
        offset += 4;
      }
    }
    
    // Write encoding parameters
    view.setUint32(offset, this.modelData.encoding.posEncoding, true);
    view.setUint32(offset + 4, this.modelData.encoding.dirEncoding, true);
    view.setUint32(offset + 8, this.modelData.encoding.hashTableSize, true);
    offset += 12;
    
    // Write weights
    view.setUint32(offset, weightsSize, true);
    offset += 4;
    new Float32Array(buffer, offset).set(this.modelData.weights);
    
    return buffer;
  }

  /**
   * Dispose of model data to free memory
   */
  dispose(): void {
    this.modelData = null;
    this._isLoaded = false;
  }
}