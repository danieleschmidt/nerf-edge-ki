/**
 * Advanced Performance Optimizer for NeRF Edge Kit
 * Provides intelligent performance optimization and resource management
 */

import { systemHealth } from '../monitoring/SystemHealth';
import { enhancedErrorHandler, ErrorCategory, ErrorSeverity } from '../core/EnhancedErrorHandler';

export interface PerformanceProfile {
  name: string;
  targetFPS: number;
  maxMemoryMB: number;
  qualityLevel: 'low' | 'medium' | 'high';
  adaptiveQuality: boolean;
  foveatedRendering: boolean;
  cachingStrategy: 'aggressive' | 'balanced' | 'minimal';
  networkOptimizations: boolean;
}

export interface OptimizationMetrics {
  fpsGain: number;
  memoryReduction: number;
  qualityRetention: number;
  loadTimeImprovement: number;
  powerEfficiency: number;
}

export interface PerformanceTarget {
  fps: number;
  latency: number; // ms
  memoryUsage: number; // MB
  powerConsumption: number; // watts
}

export class AdvancedPerformanceOptimizer {
  private currentProfile: PerformanceProfile;
  private optimizationHistory: Array<{
    timestamp: number;
    profile: PerformanceProfile;
    metrics: OptimizationMetrics;
  }> = [];
  private adaptiveMode = true;
  private performanceTargets: PerformanceTarget;
  private resourceMonitor: NodeJS.Timeout | null = null;

  // Predefined performance profiles
  private profiles: Record<string, PerformanceProfile> = {
    'vision-pro': {
      name: 'Vision Pro',
      targetFPS: 90,
      maxMemoryMB: 1024,
      qualityLevel: 'high',
      adaptiveQuality: true,
      foveatedRendering: true,
      cachingStrategy: 'aggressive',
      networkOptimizations: true
    },
    'iphone-15-pro': {
      name: 'iPhone 15 Pro',
      targetFPS: 60,
      maxMemoryMB: 512,
      qualityLevel: 'high',
      adaptiveQuality: true,
      foveatedRendering: true,
      cachingStrategy: 'balanced',
      networkOptimizations: true
    },
    'web-high': {
      name: 'Web High Performance',
      targetFPS: 60,
      maxMemoryMB: 2048,
      qualityLevel: 'high',
      adaptiveQuality: true,
      foveatedRendering: false,
      cachingStrategy: 'aggressive',
      networkOptimizations: true
    },
    'web-balanced': {
      name: 'Web Balanced',
      targetFPS: 30,
      maxMemoryMB: 1024,
      qualityLevel: 'medium',
      adaptiveQuality: true,
      foveatedRendering: false,
      cachingStrategy: 'balanced',
      networkOptimizations: true
    },
    'power-saving': {
      name: 'Power Saving',
      targetFPS: 30,
      maxMemoryMB: 256,
      qualityLevel: 'low',
      adaptiveQuality: true,
      foveatedRendering: true,
      cachingStrategy: 'minimal',
      networkOptimizations: false
    }
  };

  constructor() {
    this.currentProfile = this.profiles['web-balanced'];
    this.performanceTargets = {
      fps: 60,
      latency: 16.67, // 1000/60
      memoryUsage: 512,
      powerConsumption: 5.0
    };

    this.initializeOptimizer();
  }

  /**
   * Initialize the performance optimizer
   */
  private initializeOptimizer(): void {
    // Auto-detect device capabilities and set appropriate profile
    this.autoDetectOptimalProfile();
    
    // Start continuous performance monitoring
    this.startResourceMonitoring();
    
    console.log(`🚀 Advanced Performance Optimizer initialized with profile: ${this.currentProfile.name}`);
  }

  /**
   * Auto-detect the optimal performance profile based on device capabilities
   */
  private autoDetectOptimalProfile(): void {
    try {
      const deviceCapabilities = this.detectDeviceCapabilities();
      
      if (deviceCapabilities.isVisionPro) {
        this.setProfile('vision-pro');
      } else if (deviceCapabilities.isHighEndMobile) {
        this.setProfile('iphone-15-pro');
      } else if (deviceCapabilities.isDesktop && deviceCapabilities.memoryGB >= 8) {
        this.setProfile('web-high');
      } else if (deviceCapabilities.isMobile || deviceCapabilities.memoryGB <= 4) {
        this.setProfile('power-saving');
      } else {
        this.setProfile('web-balanced');
      }
      
    } catch (error) {
      console.warn('Failed to auto-detect device capabilities, using balanced profile');
      enhancedErrorHandler.handleError(
        error as Error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.LOW,
        {
          component: 'AdvancedPerformanceOptimizer',
          operation: 'autoDetectOptimalProfile'
        }
      );
    }
  }

  /**
   * Detect device capabilities
   */
  private detectDeviceCapabilities(): {
    isVisionPro: boolean;
    isHighEndMobile: boolean;
    isDesktop: boolean;
    isMobile: boolean;
    memoryGB: number;
    coreCount: number;
    supportsWebGPU: boolean;
  } {
    const userAgent = navigator.userAgent.toLowerCase();
    const isVisionPro = /visionos/i.test(userAgent) || /reality/i.test(userAgent);
    const isHighEndMobile = /iphone.*os 16|iphone.*os 17/i.test(userAgent) && /version.*safari/i.test(userAgent);
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    const isDesktop = !isMobile;
    
    let memoryGB = 4; // Default assumption
    if ('memory' in (navigator as any)) {
      memoryGB = Math.round(((navigator as any).memory?.deviceMemory || 4));
    }
    
    const coreCount = navigator.hardwareConcurrency || 4;
    const supportsWebGPU = !!navigator.gpu;

    return {
      isVisionPro,
      isHighEndMobile,
      isDesktop,
      isMobile,
      memoryGB,
      coreCount,
      supportsWebGPU
    };
  }

  /**
   * Set performance profile
   */
  setProfile(profileName: string): void {
    const profile = this.profiles[profileName];
    if (!profile) {
      throw new Error(`Performance profile '${profileName}' not found`);
    }

    this.currentProfile = { ...profile };
    
    // Update performance targets based on profile
    this.performanceTargets = {
      fps: profile.targetFPS,
      latency: 1000 / profile.targetFPS,
      memoryUsage: profile.maxMemoryMB,
      powerConsumption: profile.qualityLevel === 'high' ? 8.0 : 
                       profile.qualityLevel === 'medium' ? 5.0 : 3.0
    };

    console.log(`🔧 Performance profile set to: ${profile.name}`);
    this.emitProfileChangeEvent(profile);
  }

  /**
   * Start continuous resource monitoring for adaptive optimizations
   */
  private startResourceMonitoring(): void {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
    }

    this.resourceMonitor = setInterval(() => {
      if (this.adaptiveMode) {
        this.performAdaptiveOptimization();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Perform adaptive optimization based on current performance
   */
  private async performAdaptiveOptimization(): Promise<void> {
    try {
      const healthSummary = systemHealth.getHealthSummary();
      const recentMetrics = healthSummary.recentMetrics;
      
      if (!recentMetrics) return;

      const shouldOptimize = this.shouldOptimize(recentMetrics);
      
      if (shouldOptimize.memory && recentMetrics.memory.percentage > 85) {
        await this.optimizeMemoryUsage();
      }
      
      if (shouldOptimize.performance && recentMetrics.rendering.fps < this.performanceTargets.fps * 0.8) {
        await this.optimizeRenderingPerformance();
      }
      
      if (shouldOptimize.power && recentMetrics.gpu.usage > 90) {
        await this.optimizePowerConsumption();
      }
      
    } catch (error) {
      enhancedErrorHandler.handleError(
        error as Error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.LOW,
        {
          component: 'AdvancedPerformanceOptimizer',
          operation: 'performAdaptiveOptimization'
        }
      );
    }
  }

  /**
   * Determine if optimization is needed
   */
  private shouldOptimize(metrics: any): {
    memory: boolean;
    performance: boolean;
    power: boolean;
    network: boolean;
  } {
    return {
      memory: metrics.memory.percentage > 80,
      performance: metrics.rendering.fps < this.performanceTargets.fps * 0.85,
      power: metrics.gpu.usage > 85,
      network: metrics.network.latency > 100
    };
  }

  /**
   * Optimize memory usage
   */
  private async optimizeMemoryUsage(): Promise<void> {
    console.log('🧠 Optimizing memory usage...');
    
    const optimizations = [
      this.clearUnusedCaches,
      this.reduceTextureQuality,
      this.limitModelLOD,
      this.enableGarbageCollection
    ];

    for (const optimization of optimizations) {
      try {
        await optimization.call(this);
      } catch (error) {
        console.warn('Memory optimization step failed:', error);
      }
    }
  }

  /**
   * Optimize rendering performance
   */
  private async optimizeRenderingPerformance(): Promise<void> {
    console.log('🎨 Optimizing rendering performance...');
    
    const optimizations = [
      this.enableFoveatedRendering,
      this.reduceRayMarchingSteps,
      this.optimizeShaderComplexity,
      this.enablePerformanceCaching
    ];

    for (const optimization of optimizations) {
      try {
        await optimization.call(this);
      } catch (error) {
        console.warn('Rendering optimization step failed:', error);
      }
    }
  }

  /**
   * Optimize power consumption
   */
  private async optimizePowerConsumption(): Promise<void> {
    console.log('🔋 Optimizing power consumption...');
    
    // Reduce quality temporarily
    if (this.currentProfile.qualityLevel === 'high') {
      this.currentProfile.qualityLevel = 'medium';
    } else if (this.currentProfile.qualityLevel === 'medium') {
      this.currentProfile.qualityLevel = 'low';
    }

    // Enable power-saving features
    this.currentProfile.foveatedRendering = true;
    this.currentProfile.targetFPS = Math.min(this.currentProfile.targetFPS, 30);
    
    this.emitProfileChangeEvent(this.currentProfile);
  }

  // Individual optimization methods
  private async clearUnusedCaches(): Promise<void> {
    // Clear texture caches that haven't been used recently
    if (typeof window !== 'undefined' && (window as any).nerfRenderer) {
      const renderer = (window as any).nerfRenderer;
      if (renderer.clearUnusedCaches) {
        renderer.clearUnusedCaches();
      }
    }
  }

  private async reduceTextureQuality(): Promise<void> {
    console.log('🎯 Reducing texture quality for memory optimization');
    // Implementation would reduce texture resolution
  }

  private async limitModelLOD(): Promise<void> {
    console.log('📐 Limiting model Level of Detail');
    // Implementation would reduce LOD levels
  }

  private async enableGarbageCollection(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  private async enableFoveatedRendering(): Promise<void> {
    if (!this.currentProfile.foveatedRendering) {
      this.currentProfile.foveatedRendering = true;
      console.log('👁️ Enabled foveated rendering for performance boost');
      this.emitProfileChangeEvent(this.currentProfile);
    }
  }

  private async reduceRayMarchingSteps(): Promise<void> {
    console.log('📏 Reducing ray marching steps for performance');
    // Implementation would reduce ray marching complexity
  }

  private async optimizeShaderComplexity(): Promise<void> {
    console.log('🔧 Optimizing shader complexity');
    // Implementation would switch to simpler shader variants
  }

  private async enablePerformanceCaching(): Promise<void> {
    this.currentProfile.cachingStrategy = 'aggressive';
    console.log('⚡ Enabled aggressive performance caching');
  }

  /**
   * Get performance benchmark for current settings
   */
  async runPerformanceBenchmark(durationMs: number = 10000): Promise<{
    averageFPS: number;
    memoryUsage: number;
    powerConsumption: number;
    renderTime: number;
    qualityScore: number;
  }> {
    console.log(`🏁 Running performance benchmark for ${durationMs}ms...`);
    
    const startTime = performance.now();
    const endTime = startTime + durationMs;
    
    const fpsReadings: number[] = [];
    const memoryReadings: number[] = [];
    
    return new Promise((resolve) => {
      const benchmarkInterval = setInterval(() => {
        const healthSummary = systemHealth.getHealthSummary();
        if (healthSummary.recentMetrics) {
          fpsReadings.push(healthSummary.recentMetrics.rendering.fps);
          memoryReadings.push(healthSummary.recentMetrics.memory.used);
        }
        
        if (performance.now() >= endTime) {
          clearInterval(benchmarkInterval);
          
          const averageFPS = fpsReadings.length > 0 ? 
            fpsReadings.reduce((a, b) => a + b) / fpsReadings.length : 0;
          const memoryUsage = memoryReadings.length > 0 ?
            Math.max(...memoryReadings) : 0;
          
          // Calculate quality score based on profile
          const qualityScore = this.currentProfile.qualityLevel === 'high' ? 0.9 :
                              this.currentProfile.qualityLevel === 'medium' ? 0.75 : 0.6;
          
          const result = {
            averageFPS,
            memoryUsage,
            powerConsumption: this.performanceTargets.powerConsumption,
            renderTime: 1000 / averageFPS,
            qualityScore
          };
          
          console.log('📊 Benchmark results:', result);
          resolve(result);
        }
      }, 100);
    });
  }

  /**
   * Export performance optimization report
   */
  generateOptimizationReport(): {
    currentProfile: PerformanceProfile;
    targets: PerformanceTarget;
    history: typeof this.optimizationHistory;
    recommendations: string[];
  } {
    const recommendations = [];
    
    if (this.currentProfile.qualityLevel === 'low') {
      recommendations.push('Consider upgrading hardware for better visual quality');
    }
    
    if (!this.currentProfile.foveatedRendering && this.currentProfile.targetFPS < 60) {
      recommendations.push('Enable foveated rendering for better performance');
    }
    
    if (this.currentProfile.cachingStrategy === 'minimal') {
      recommendations.push('Increase caching for better performance');
    }
    
    return {
      currentProfile: this.currentProfile,
      targets: this.performanceTargets,
      history: this.optimizationHistory,
      recommendations
    };
  }

  /**
   * Emit profile change event
   */
  private emitProfileChangeEvent(profile: PerformanceProfile): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nerf-profile-changed', { detail: profile }));
    }
  }

  /**
   * Get available profiles
   */
  getAvailableProfiles(): Record<string, PerformanceProfile> {
    return { ...this.profiles };
  }

  /**
   * Get current profile
   */
  getCurrentProfile(): PerformanceProfile {
    return { ...this.currentProfile };
  }

  /**
   * Set adaptive mode
   */
  setAdaptiveMode(enabled: boolean): void {
    this.adaptiveMode = enabled;
    console.log(`🤖 Adaptive optimization ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Dispose of optimizer
   */
  dispose(): void {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }
    this.optimizationHistory.length = 0;
    console.log('🧹 Advanced Performance Optimizer disposed');
  }
}

// Global performance optimizer instance
export const advancedPerformanceOptimizer = new AdvancedPerformanceOptimizer();