/**
 * Performance monitoring and optimization service
 */

import { PerformanceMetrics } from '../core/types';

export interface PerformanceTarget {
  fps: number;
  frameTime: number; // ms
  memoryLimit: number; // MB
  powerLimit: number; // watts
}

export interface PerformanceProfile {
  name: string;
  target: PerformanceTarget;
  adaptiveQuality: boolean;
  foveatedRendering: boolean;
  temporalUpsampling: boolean;
}

export interface BenchmarkResult {
  testName: string;
  duration: number; // seconds
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  averageFrameTime: number;
  percentile95FrameTime: number;
  memoryPeak: number; // MB
  powerAverage: number; // watts
  qualityScore: number; // 0-1
}

export class PerformanceService {
  private metrics: PerformanceMetrics[] = [];
  private benchmarkResults: BenchmarkResult[] = [];
  private currentProfile: PerformanceProfile;
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  
  // Performance history
  private readonly maxHistorySize = 300; // 5 minutes at 60fps
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private memoryHistory: number[] = [];
  private powerHistory: number[] = [];
  
  // Auto-scaling and optimization
  private autoScalingEnabled = false;
  private lastOptimization = 0;
  private optimizationCooldown = 5000; // 5 seconds
  private performanceTrends: { direction: 'up' | 'down' | 'stable'; confidence: number } = {
    direction: 'stable',
    confidence: 0
  };

  constructor() {
    this.currentProfile = this.getDefaultProfile();
  }

  /**
   * Get performance profiles for different devices
   */
  static getDeviceProfiles(): Record<string, PerformanceProfile> {
    return {
      'vision-pro': {
        name: 'Apple Vision Pro',
        target: {
          fps: 90,
          frameTime: 11.1,
          memoryLimit: 1024,
          powerLimit: 8.0
        },
        adaptiveQuality: true,
        foveatedRendering: true,
        temporalUpsampling: true
      },
      'iphone-15-pro': {
        name: 'iPhone 15 Pro',
        target: {
          fps: 60,
          frameTime: 16.7,
          memoryLimit: 512,
          powerLimit: 3.0
        },
        adaptiveQuality: true,
        foveatedRendering: false,
        temporalUpsampling: true
      },
      'web-high': {
        name: 'Web (High Performance)',
        target: {
          fps: 60,
          frameTime: 16.7,
          memoryLimit: 1024,
          powerLimit: 15.0
        },
        adaptiveQuality: true,
        foveatedRendering: true,
        temporalUpsampling: false
      },
      'web-low': {
        name: 'Web (Low Power)',
        target: {
          fps: 30,
          frameTime: 33.3,
          memoryLimit: 256,
          powerLimit: 5.0
        },
        adaptiveQuality: true,
        foveatedRendering: true,
        temporalUpsampling: false
      }
    };
  }

  /**
   * Set performance profile
   */
  setProfile(profileName: string): void {
    const profiles = PerformanceService.getDeviceProfiles();
    if (profiles[profileName]) {
      this.currentProfile = profiles[profileName];
      console.log(`Performance profile set to: ${this.currentProfile.name}`);
    } else {
      console.warn(`Unknown performance profile: ${profileName}`);
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(metricsProvider: () => PerformanceMetrics, interval: number = 1000): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring already active');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      try {
        const metrics = metricsProvider();
        this.recordMetrics(metrics);
      } catch (error) {
        console.error('Error collecting performance metrics:', error);
      }
    }, interval);

    console.log(`Performance monitoring started (${interval}ms interval)`);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Maintain history
    this.fpsHistory.push(metrics.fps);
    this.frameTimeHistory.push(metrics.frameTime);
    this.memoryHistory.push(metrics.memoryUsage);
    this.powerHistory.push(metrics.powerConsumption);
    
    // Trim history to max size
    if (this.fpsHistory.length > this.maxHistorySize) {
      this.fpsHistory.shift();
      this.frameTimeHistory.shift();
      this.memoryHistory.shift();
      this.powerHistory.shift();
    }
    
    // Trim metrics array
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }
    
    // Trigger auto-optimization if enabled
    this.autoOptimize();
  }

  /**
   * Get current performance statistics
   */
  getCurrentStats(): {
    current: PerformanceMetrics;
    averages: PerformanceMetrics;
    target: PerformanceTarget;
    meetingTargets: boolean;
  } {
    if (this.metrics.length === 0) {
      const empty: PerformanceMetrics = { fps: 0, frameTime: 0, gpuUtilization: 0, memoryUsage: 0, powerConsumption: 0 };
      return {
        current: empty,
        averages: empty,
        target: this.currentProfile.target,
        meetingTargets: false
      };
    }

    const current = this.metrics[this.metrics.length - 1];
    const averages: PerformanceMetrics = {
      fps: this.average(this.fpsHistory),
      frameTime: this.average(this.frameTimeHistory),
      gpuUtilization: current.gpuUtilization, // GPU utilization is instantaneous
      memoryUsage: this.average(this.memoryHistory),
      powerConsumption: this.average(this.powerHistory)
    };

    const target = this.currentProfile.target;
    const meetingTargets = 
      averages.fps >= target.fps * 0.9 &&
      averages.frameTime <= target.frameTime * 1.1 &&
      averages.memoryUsage <= target.memoryLimit &&
      averages.powerConsumption <= target.powerLimit;

    return {
      current,
      averages,
      target,
      meetingTargets
    };
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(
    testName: string,
    duration: number,
    metricsProvider: () => PerformanceMetrics
  ): Promise<BenchmarkResult> {
    console.log(`Starting benchmark: ${testName} (${duration}s)`);
    
    const startTime = performance.now();
    const endTime = startTime + duration * 1000;
    const samples: PerformanceMetrics[] = [];
    
    return new Promise((resolve) => {
      const collectSample = () => {
        const now = performance.now();
        if (now >= endTime) {
          // Benchmark complete
          const result = this.analyzeBenchmarkData(testName, samples, duration);
          this.benchmarkResults.push(result);
          console.log(`Benchmark complete: ${testName}`, result);
          resolve(result);
          return;
        }
        
        try {
          const metrics = metricsProvider();
          samples.push(metrics);
        } catch (error) {
          console.error('Error collecting benchmark sample:', error);
        }
        
        // Schedule next sample
        setTimeout(collectSample, 16.67); // ~60fps sampling
      };
      
      collectSample();
    });
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const stats = this.getCurrentStats();
    const recommendations: string[] = [];
    
    if (stats.averages.fps < stats.target.fps * 0.9) {
      recommendations.push('Consider lowering rendering quality to improve frame rate');
      if (this.currentProfile.foveatedRendering) {
        recommendations.push('Enable or increase foveated rendering aggressiveness');
      }
    }
    
    if (stats.averages.frameTime > stats.target.frameTime * 1.1) {
      recommendations.push('Frame time is above target - optimize rendering pipeline');
      recommendations.push('Consider reducing ray marching steps or network complexity');
    }
    
    if (stats.averages.memoryUsage > stats.target.memoryLimit * 0.9) {
      recommendations.push('Memory usage is high - consider model compression');
      recommendations.push('Implement more aggressive model streaming and caching');
    }
    
    if (stats.averages.powerConsumption > stats.target.powerLimit * 0.9) {
      recommendations.push('Power consumption is high - enable power-saving optimizations');
      recommendations.push('Consider reducing target frame rate or resolution');
    }
    
    if (stats.current.gpuUtilization > 0.95) {
      recommendations.push('GPU utilization is very high - GPU may be the bottleneck');
    } else if (stats.current.gpuUtilization < 0.3) {
      recommendations.push('GPU utilization is low - CPU or memory may be the bottleneck');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is meeting all targets - consider increasing quality');
    }
    
    return recommendations;
  }

  /**
   * Get performance percentiles
   */
  getPercentiles(): {
    fps: { p50: number; p95: number; p99: number };
    frameTime: { p50: number; p95: number; p99: number };
  } {
    return {
      fps: {
        p50: this.percentile(this.fpsHistory, 0.5),
        p95: this.percentile(this.fpsHistory, 0.95),
        p99: this.percentile(this.fpsHistory, 0.99)
      },
      frameTime: {
        p50: this.percentile(this.frameTimeHistory, 0.5),
        p95: this.percentile(this.frameTimeHistory, 0.95),
        p99: this.percentile(this.frameTimeHistory, 0.99)
      }
    };
  }

  /**
   * Get all benchmark results
   */
  getBenchmarkResults(): BenchmarkResult[] {
    return [...this.benchmarkResults];
  }

  /**
   * Export performance data for analysis
   */
  exportData(): {
    profile: PerformanceProfile;
    metrics: PerformanceMetrics[];
    benchmarks: BenchmarkResult[];
    stats: { current: PerformanceMetrics; averages: PerformanceMetrics; target: PerformanceTarget; meetingTargets: boolean };
    percentiles: { fps: { p50: number; p95: number; p99: number }; frameTime: { p50: number; p95: number; p99: number } };
    recommendations: string[];
  } {
    return {
      profile: this.currentProfile,
      metrics: [...this.metrics],
      benchmarks: [...this.benchmarkResults],
      stats: this.getCurrentStats(),
      percentiles: this.getPercentiles(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Enable auto-scaling for dynamic performance optimization
   */
  enableAutoScaling(): void {
    this.autoScalingEnabled = true;
    console.log('🚀 Auto-scaling enabled - system will optimize performance automatically');
  }

  /**
   * Disable auto-scaling
   */
  disableAutoScaling(): void {
    this.autoScalingEnabled = false;
    console.log('⏸️  Auto-scaling disabled');
  }

  /**
   * Intelligent auto-optimization based on performance trends
   */
  private autoOptimize(): void {
    if (!this.autoScalingEnabled || Date.now() - this.lastOptimization < this.optimizationCooldown) {
      return;
    }

    const stats = this.getCurrentStats();
    this.updatePerformanceTrends(stats);

    if (this.performanceTrends.confidence > 0.7) {
      const optimizations = this.generateOptimizations(stats);
      if (optimizations.length > 0) {
        console.log(`🎯 Auto-optimization triggered: ${optimizations.join(', ')}`);
        this.lastOptimization = Date.now();
        
        // Apply optimizations (would integrate with renderer in real implementation)
        this.applyOptimizations(optimizations);
      }
    }
  }

  /**
   * Update performance trend analysis
   */
  private updatePerformanceTrends(stats: any): void {
    if (this.fpsHistory.length < 10) return; // Need enough data
    
    const recentFPS = this.fpsHistory.slice(-10);
    const trend = this.calculateTrend(recentFPS);
    
    const target = stats.target.fps;
    const current = stats.averages.fps;
    
    if (current < target * 0.85) {
      this.performanceTrends = { direction: 'down', confidence: Math.min(1, trend.confidence + 0.2) };
    } else if (current > target * 1.1) {
      this.performanceTrends = { direction: 'up', confidence: Math.min(1, trend.confidence + 0.1) };
    } else {
      this.performanceTrends = { direction: 'stable', confidence: Math.max(0, trend.confidence - 0.1) };
    }
  }

  /**
   * Calculate statistical trend from data points
   */
  private calculateTrend(data: number[]): { direction: 'up' | 'down' | 'stable'; confidence: number } {
    if (data.length < 3) return { direction: 'stable', confidence: 0 };
    
    // Simple linear regression for trend detection
    const n = data.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const confidence = Math.abs(slope) * 10; // Simple confidence metric
    
    if (slope > 0.1) return { direction: 'up', confidence: Math.min(1, confidence) };
    if (slope < -0.1) return { direction: 'down', confidence: Math.min(1, confidence) };
    return { direction: 'stable', confidence: Math.min(1, confidence) };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizations(stats: any): string[] {
    const optimizations: string[] = [];
    const { current, target } = stats;
    
    if (current.fps < target.fps * 0.8) {
      optimizations.push('reduce_quality');
      optimizations.push('enable_foveated_rendering');
    }
    
    if (current.memoryUsage > target.memoryLimit * 0.9) {
      optimizations.push('clear_cache');
      optimizations.push('reduce_texture_quality');
    }
    
    if (current.powerConsumption > target.powerLimit * 0.9) {
      optimizations.push('reduce_frame_rate');
      optimizations.push('enable_power_saving');
    }
    
    return optimizations;
  }

  /**
   * Apply optimizations (placeholder for integration with renderer)
   */
  private applyOptimizations(optimizations: string[]): void {
    // In a real implementation, this would call renderer methods
    for (const optimization of optimizations) {
      console.log(`🔧 Applying optimization: ${optimization}`);
    }
  }

  /**
   * Clear performance history
   */
  clearHistory(): void {
    this.metrics.length = 0;
    this.fpsHistory.length = 0;
    this.frameTimeHistory.length = 0;
    this.memoryHistory.length = 0;
    this.powerHistory.length = 0;
    this.benchmarkResults.length = 0;
    this.performanceTrends = { direction: 'stable', confidence: 0 };
    console.log('Performance history cleared');
  }

  // Private helper methods
  
  private getDefaultProfile(): PerformanceProfile {
    const profiles = PerformanceService.getDeviceProfiles();
    return profiles['web-high'];
  }
  
  private average(array: number[]): number {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }
  
  private percentile(array: number[], p: number): number {
    if (array.length === 0) return 0;
    const sorted = [...array].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
  
  private analyzeBenchmarkData(
    testName: string, 
    samples: PerformanceMetrics[], 
    duration: number
  ): BenchmarkResult {
    if (samples.length === 0) {
      return {
        testName,
        duration,
        averageFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        averageFrameTime: 0,
        percentile95FrameTime: 0,
        memoryPeak: 0,
        powerAverage: 0,
        qualityScore: 0
      };
    }
    
    const fpsValues = samples.map(s => s.fps);
    const frameTimeValues = samples.map(s => s.frameTime);
    const memoryValues = samples.map(s => s.memoryUsage);
    const powerValues = samples.map(s => s.powerConsumption);
    
    // Calculate quality score based on how well targets are met
    const target = this.currentProfile.target;
    const avgFPS = this.average(fpsValues);
    const avgFrameTime = this.average(frameTimeValues);
    const avgMemory = this.average(memoryValues);
    const avgPower = this.average(powerValues);
    
    const fpsScore = Math.min(1, avgFPS / target.fps);
    const frameTimeScore = Math.min(1, target.frameTime / avgFrameTime);
    const memoryScore = Math.min(1, target.memoryLimit / Math.max(avgMemory, 1));
    const powerScore = Math.min(1, target.powerLimit / Math.max(avgPower, 1));
    
    const qualityScore = (fpsScore + frameTimeScore + memoryScore + powerScore) / 4;
    
    return {
      testName,
      duration,
      averageFPS: avgFPS,
      minFPS: Math.min(...fpsValues),
      maxFPS: Math.max(...fpsValues),
      averageFrameTime: avgFrameTime,
      percentile95FrameTime: this.percentile(frameTimeValues, 0.95),
      memoryPeak: Math.max(...memoryValues),
      powerAverage: avgPower,
      qualityScore
    };
  }

  /**
   * Dispose of service resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.clearHistory();
  }
}