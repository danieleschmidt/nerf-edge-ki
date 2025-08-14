/**
 * Advanced foveated rendering system with eye tracking integration
 */

export interface EyeTrackingData {
  leftEye: { x: number; y: number; confidence: number };
  rightEye: { x: number; y: number; confidence: number };
  combined: { x: number; y: number };
  timestamp: number;
}

export interface FoveationSettings {
  enabled: boolean;
  centerRadius: number; // High quality center region (0-1)
  peripheralRadius: number; // Low quality outer region (0-1) 
  qualityLevels: number; // Number of quality rings (2-5)
  blendWidth: number; // Smoothing between quality levels
  adaptiveLOD: boolean; // Dynamically adjust based on motion
  eyeTrackingEnabled: boolean;
}

export class FoveatedRenderer {
  private settings: FoveationSettings;
  private eyeTrackingData: EyeTrackingData | null = null;
  private foveationTexture: ImageData | null = null;
  private qualityMap: Float32Array | null = null;
  private lastUpdateTime = 0;

  constructor(settings: Partial<FoveationSettings> = {}) {
    this.settings = {
      enabled: true,
      centerRadius: 0.2,
      peripheralRadius: 0.8,
      qualityLevels: 3,
      blendWidth: 0.1,
      adaptiveLOD: true,
      eyeTrackingEnabled: false,
      ...settings
    };
  }

  /**
   * Update eye tracking data
   */
  updateEyeTracking(data: EyeTrackingData): void {
    this.eyeTrackingData = data;
    
    // Regenerate foveation map if eye position changed significantly
    const threshold = 0.05; // 5% screen movement threshold
    if (this.shouldRegenerateFoveation(data, threshold)) {
      this.generateFoveationMap();
    }
  }

  /**
   * Generate foveation quality map texture
   */
  generateFoveationMap(width = 512, height = 512): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    this.qualityMap = new Float32Array(width * height);
    
    // Get foveal center point
    const centerX = this.eyeTrackingData?.combined.x ?? 0.5;
    const centerY = this.eyeTrackingData?.combined.y ?? 0.5;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        
        // Normalize coordinates to [0, 1]
        const nx = x / width;
        const ny = y / height;
        
        // Calculate distance from foveal center
        const dx = nx - centerX;
        const dy = ny - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate quality based on distance
        const quality = this.calculateQualityAtDistance(distance);
        this.qualityMap[index] = quality;
        
        // Store as grayscale in red channel, others for future use
        const pixelIndex = index * 4;
        data[pixelIndex] = Math.round(quality * 255);     // R: Quality
        data[pixelIndex + 1] = Math.round(distance * 255); // G: Distance  
        data[pixelIndex + 2] = 0;                          // B: Reserved
        data[pixelIndex + 3] = 255;                        // A: Opaque
      }
    }
    
    this.foveationTexture = new ImageData(data, width, height);
    this.lastUpdateTime = performance.now();
    
    return this.foveationTexture;
  }

  /**
   * Calculate rendering quality based on distance from foveal center
   */
  private calculateQualityAtDistance(distance: number): number {
    if (!this.settings.enabled) return 1.0;
    
    const centerRadius = this.settings.centerRadius;
    const peripheralRadius = this.settings.peripheralRadius;
    const _blendWidth = this.settings.blendWidth;
    
    if (distance <= centerRadius) {
      // Full quality in center
      return 1.0;
    } else if (distance >= peripheralRadius) {
      // Minimum quality at periphery
      return 0.2;
    } else {
      // Smooth transition between center and periphery
      const normalizedDistance = (distance - centerRadius) / (peripheralRadius - centerRadius);
      
      // Use smooth step function for natural falloff
      const t = this.smoothstep(0, 1, normalizedDistance);
      return 1.0 - t * 0.8; // Quality ranges from 1.0 to 0.2
    }
  }

  /**
   * Smooth interpolation function
   */
  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Get quality multiplier at screen coordinates
   */
  getQualityAt(x: number, y: number): number {
    if (!this.settings.enabled || !this.qualityMap) return 1.0;
    
    const width = Math.sqrt(this.qualityMap.length);
    const height = width;
    
    const px = Math.floor(x * width);
    const py = Math.floor(y * height);
    const index = py * width + px;
    
    return this.qualityMap[index] || 1.0;
  }

  /**
   * Get adaptive ray count based on quality
   */
  getAdaptiveRayCount(baseRayCount: number, x: number, y: number): number {
    const quality = this.getQualityAt(x, y);
    return Math.max(2, Math.round(baseRayCount * quality));
  }

  /**
   * Get WebGPU shader code for foveated rendering
   */
  getFoveatedShaderCode(): string {
    return `
      @group(0) @binding(2) var foveationTexture: texture_2d<f32>;
      @group(0) @binding(3) var foveationSampler: sampler;
      
      fn getFoveationQuality(uv: vec2<f32>) -> f32 {
        return textureSample(foveationTexture, foveationSampler, uv).r;
      }
      
      fn getAdaptiveStepCount(baseSteps: i32, quality: f32) -> i32 {
        return max(2, i32(f32(baseSteps) * quality));
      }
      
      // Adaptive ray marching with foveation
      fn foveatedRayMarch(rayOrigin: vec3<f32>, rayDir: vec3<f32>, uv: vec2<f32>) -> vec3<f32> {
        let quality = getFoveationQuality(uv);
        let stepCount = getAdaptiveStepCount(64, quality);
        
        var color = vec3<f32>(0.0);
        var transmittance = 1.0;
        
        for (var i = 0; i < stepCount; i++) {
          let t = f32(i) / f32(stepCount) * 10.0; // Max distance
          let samplePos = rayOrigin + rayDir * t;
          
          // Sample neural network (simplified)
          let density = sampleNerf(samplePos, rayDir, quality);
          let rgb = sampleNerfColor(samplePos, rayDir, quality);
          
          // Alpha blending
          let alpha = 1.0 - exp(-density * (10.0 / f32(stepCount)));
          color += transmittance * alpha * rgb;
          transmittance *= 1.0 - alpha;
          
          if (transmittance < 0.01) { break; }
        }
        
        return color;
      }
      
      // Quality-adaptive neural network sampling
      fn sampleNerf(pos: vec3<f32>, dir: vec3<f32>, quality: f32) -> f32 {
        // Use fewer network evaluations for lower quality
        let networkComplexity = quality;
        return sin(pos.x + pos.y + pos.z) * 0.1 * networkComplexity;
      }
      
      fn sampleNerfColor(pos: vec3<f32>, dir: vec3<f32>, quality: f32) -> vec3<f32> {
        return vec3<f32>(0.5 + 0.5 * cos(pos + quality), 0.6, 0.8);
      }
    `;
  }

  /**
   * Check if foveation map needs regeneration
   */
  private shouldRegenerateFoveation(data: EyeTrackingData, threshold: number): boolean {
    if (!this.eyeTrackingData) return true;
    
    const dx = Math.abs(data.combined.x - this.eyeTrackingData.combined.x);
    const dy = Math.abs(data.combined.y - this.eyeTrackingData.combined.y);
    
    return (dx > threshold || dy > threshold);
  }

  /**
   * Get current foveation settings
   */
  getSettings(): FoveationSettings {
    return { ...this.settings };
  }

  /**
   * Update foveation settings
   */
  updateSettings(newSettings: Partial<FoveationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    if (this.settings.enabled) {
      this.generateFoveationMap();
    }
  }

  /**
   * Get current foveation texture
   */
  getFoveationTexture(): ImageData | null {
    return this.foveationTexture;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): { qualityReduction: number; estimatedSpeedup: number } {
    if (!this.qualityMap || !this.settings.enabled) {
      return { qualityReduction: 0, estimatedSpeedup: 1 };
    }
    
    // Calculate average quality reduction
    const avgQuality = this.qualityMap.reduce((sum, q) => sum + q, 0) / this.qualityMap.length;
    const qualityReduction = 1 - avgQuality;
    
    // Estimate rendering speedup (non-linear relationship)
    const estimatedSpeedup = 1 / avgQuality;
    
    return { qualityReduction, estimatedSpeedup };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.foveationTexture = null;
    this.qualityMap = null;
    this.eyeTrackingData = null;
  }
}