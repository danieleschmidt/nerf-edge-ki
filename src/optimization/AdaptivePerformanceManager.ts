/**
 * Adaptive Performance Management System
 * Dynamically optimizes NeRF rendering based on real-time performance metrics
 */

import { systemHealth } from '../monitoring/SystemHealth';
import { globalErrorRecovery } from '../core/ErrorRecovery';

export interface PerformanceTarget {
  targetFPS: number;
  maxLatency: number; // ms
  maxMemoryUsage: number; // MB
  powerEfficiency: 'low' | 'medium' | 'high';
}

export interface OptimizationStrategy {
  name: string;
  priority: number;
  applicableScenarios: string[];
  estimatedGain: number; // Expected FPS improvement
  costFactor: number; // Quality/resource cost (0-1)
  apply(context: PerformanceContext): Promise<boolean>;
  revert(context: PerformanceContext): Promise<boolean>;
}

export interface PerformanceContext {
  currentFPS: number;
  targetFPS: number;
  memoryPressure: 'low' | 'medium' | 'high';
  thermalState: 'nominal' | 'fair' | 'critical';
  batteryLevel?: number; // 0-100
  deviceProfile: 'mobile' | 'desktop' | 'hmd'; // Head-mounted display
  renderComplexity: 'simple' | 'moderate' | 'complex';
}

export class AdaptivePerformanceManager {
  private strategies: OptimizationStrategy[] = [];
  private activeOptimizations: Set<string> = new Set();
  private performanceHistory: number[] = [];
  private optimizationHistory: Array<{
    timestamp: number;
    strategy: string;
    applied: boolean;
    fpsChange: number;
  }> = [];

  private monitoringInterval: number | null = null;
  private isOptimizing = false;

  constructor() {
    this.registerDefaultStrategies();
    this.startPerformanceMonitoring();
  }

  private registerDefaultStrategies(): void {
    // Dynamic Quality Scaling
    this.registerStrategy({
      name: 'Dynamic Quality Scaling',
      priority: 10,
      applicableScenarios: ['low_fps', 'high_memory'],
      estimatedGain: 15,
      costFactor: 0.3,
      apply: async (context) => {
        if (context.currentFPS < context.targetFPS * 0.8) {
          // Reduce rendering quality by 25%
          this.applyQualityReduction(0.75);
          return true;
        }
        return false;
      },
      revert: async (context) => {
        this.applyQualityReduction(1.0);
        return true;
      }
    });

    // Adaptive LOD (Level of Detail)
    this.registerStrategy({
      name: 'Adaptive LOD',
      priority: 9,
      applicableScenarios: ['low_fps', 'high_complexity'],
      estimatedGain: 20,
      costFactor: 0.4,
      apply: async (context) => {
        // Implement dynamic LOD based on distance and importance
        this.enableAdaptiveLOD(true);
        return true;
      },
      revert: async (context) => {
        this.enableAdaptiveLOD(false);
        return true;
      }
    });

    // Foveated Rendering Intensity
    this.registerStrategy({
      name: 'Foveated Rendering Boost',
      priority: 8,
      applicableScenarios: ['low_fps', 'hmd_device'],
      estimatedGain: 25,
      costFactor: 0.2,
      apply: async (context) => {
        if (context.deviceProfile === 'hmd') {
          this.adjustFoveationIntensity(0.6); // More aggressive foveation
          return true;
        }
        return false;
      },
      revert: async (context) => {
        this.adjustFoveationIntensity(0.3); // Standard foveation
        return true;
      }
    });

    // Resolution Scaling
    this.registerStrategy({
      name: 'Dynamic Resolution Scaling',
      priority: 7,
      applicableScenarios: ['low_fps', 'thermal_throttling'],
      estimatedGain: 30,
      costFactor: 0.6,
      apply: async (context) => {
        const scaleFactor = context.thermalState === 'critical' ? 0.5 : 0.75;
        this.adjustResolution(scaleFactor);
        return true;
      },
      revert: async (context) => {
        this.adjustResolution(1.0);
        return true;
      }
    });

    // Temporal Upsampling
    this.registerStrategy({
      name: 'Temporal Upsampling',
      priority: 6,
      applicableScenarios: ['low_fps', 'desktop_device'],
      estimatedGain: 12,
      costFactor: 0.1,
      apply: async (context) => {
        // Use previous frame information to reduce rendering load
        this.enableTemporalUpsampling(true);
        return true;
      },
      revert: async (context) => {
        this.enableTemporalUpsampling(false);
        return true;
      }
    });

    // Neural Network Quantization
    this.registerStrategy({
      name: 'Neural Network Quantization',
      priority: 5,
      applicableScenarios: ['low_fps', 'high_memory', 'mobile_device'],
      estimatedGain: 18,
      costFactor: 0.3,
      apply: async (context) => {
        // Switch to quantized neural network weights
        this.enableQuantization(true);
        return true;
      },
      revert: async (context) => {
        this.enableQuantization(false);
        return true;
      }
    });

    // Batched Ray Marching
    this.registerStrategy({
      name: 'Batched Ray Marching',
      priority: 4,
      applicableScenarios: ['low_fps', 'desktop_device'],
      estimatedGain: 10,
      costFactor: 0.1,
      apply: async (context) => {
        // Process rays in larger batches for better GPU utilization
        this.adjustRayBatchSize(64);
        return true;
      },
      revert: async (context) => {
        this.adjustRayBatchSize(32);
        return true;
      }
    });

    // Memory Pool Optimization
    this.registerStrategy({
      name: 'Memory Pool Optimization',
      priority: 3,
      applicableScenarios: ['high_memory', 'memory_pressure'],
      estimatedGain: 5,
      costFactor: 0.0,
      apply: async (context) => {
        // Optimize memory allocation patterns
        this.optimizeMemoryPools();
        return true;
      },
      revert: async (context) => {
        // Memory optimizations don't typically need reverting
        return true;
      }
    });
  }

  /**
   * Register a new optimization strategy
   */
  registerStrategy(strategy: OptimizationStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Start continuous performance monitoring and optimization
   */
  private startPerformanceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.analyzeAndOptimize();
    }, 1000) as unknown as number; // Check every second
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Analyze current performance and apply optimizations
   */
  private async analyzeAndOptimize(): Promise<void> {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    
    try {
      const context = await this.buildPerformanceContext();
      
      // Record performance history
      this.performanceHistory.push(context.currentFPS);
      if (this.performanceHistory.length > 60) {
        this.performanceHistory.shift();
      }

      // Determine if optimization is needed
      const needsOptimization = this.evaluateOptimizationNeed(context);
      
      if (needsOptimization) {
        await this.applyOptimizations(context);
      } else {
        // Consider reverting optimizations if performance is good
        await this.considerOptimizationReversal(context);
      }
      
    } catch (error) {
      console.error('Performance optimization failed:', error);
      await globalErrorRecovery.attemptRecovery(
        error as Error,
        globalErrorRecovery.constructor.createContext('AdaptivePerformanceManager', 'analyzeAndOptimize')
      );
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Build current performance context
   */
  private async buildPerformanceContext(): Promise<PerformanceContext> {
    const healthSummary = systemHealth.getHealthSummary();
    const recentMetrics = healthSummary.recentMetrics;

    // Determine device profile
    const deviceProfile = this.detectDeviceProfile();
    
    // Assess thermal state
    const thermalState = this.assessThermalState();
    
    // Determine render complexity
    const renderComplexity = this.assessRenderComplexity();

    return {
      currentFPS: recentMetrics?.rendering.fps || 60,
      targetFPS: 60, // This would come from user settings
      memoryPressure: recentMetrics?.rendering.memoryPressure || 'low',
      thermalState,
      batteryLevel: await this.getBatteryLevel(),
      deviceProfile,
      renderComplexity
    };
  }

  private detectDeviceProfile(): 'mobile' | 'desktop' | 'hmd' {
    const userAgent = navigator.userAgent;
    
    // Check for HMD indicators
    if (userAgent.includes('Quest') || userAgent.includes('Pico') || userAgent.includes('VisionPro')) {
      return 'hmd';
    }
    
    // Check for mobile indicators
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  private assessThermalState(): 'nominal' | 'fair' | 'critical' {
    // In a real implementation, this would use thermal APIs
    // For now, estimate based on performance degradation
    const recentFPS = this.performanceHistory.slice(-10);
    if (recentFPS.length > 5) {
      const avgFPS = recentFPS.reduce((a, b) => a + b, 0) / recentFPS.length;
      const initialFPS = this.performanceHistory.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      
      if (avgFPS < initialFPS * 0.6) {
        return 'critical';
      } else if (avgFPS < initialFPS * 0.8) {
        return 'fair';
      }
    }
    
    return 'nominal';
  }

  private assessRenderComplexity(): 'simple' | 'moderate' | 'complex' {
    // This would be determined by the current scene
    // For now, return a default value
    return 'moderate';
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return Math.round(battery.level * 100);
      } catch (error) {
        // Battery API not available or permission denied
      }
    }
    return undefined;
  }

  /**
   * Evaluate if optimization is needed
   */
  private evaluateOptimizationNeed(context: PerformanceContext): boolean {
    const fpsRatio = context.currentFPS / context.targetFPS;
    
    // Need optimization if:
    return (
      fpsRatio < 0.85 || // FPS is below 85% of target
      context.memoryPressure === 'high' ||
      context.thermalState === 'critical' ||
      (context.batteryLevel !== undefined && context.batteryLevel < 20)
    );
  }

  /**
   * Apply appropriate optimizations based on context
   */
  private async applyOptimizations(context: PerformanceContext): Promise<void> {
    const scenarios = this.determineActiveScenarios(context);
    
    // Find applicable strategies
    const applicableStrategies = this.strategies.filter(strategy =>
      strategy.applicableScenarios.some(scenario => scenarios.includes(scenario)) &&
      !this.activeOptimizations.has(strategy.name)
    );

    // Apply strategies in priority order
    for (const strategy of applicableStrategies.slice(0, 3)) { // Limit to 3 concurrent optimizations
      try {
        console.log(`🎯 Applying optimization: ${strategy.name}`);
        const applied = await strategy.apply(context);
        
        if (applied) {
          this.activeOptimizations.add(strategy.name);
          this.recordOptimization(strategy.name, true, strategy.estimatedGain);
          
          // Wait a bit to see the effect
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to apply optimization ${strategy.name}:`, error);
      }
    }
  }

  /**
   * Consider reverting optimizations if performance is good
   */
  private async considerOptimizationReversal(context: PerformanceContext): Promise<void> {
    const fpsRatio = context.currentFPS / context.targetFPS;
    
    // Only revert if performance is significantly above target
    if (fpsRatio > 1.2 && this.activeOptimizations.size > 0) {
      // Revert the lowest-priority active optimization
      const activeStrategies = this.strategies.filter(s => this.activeOptimizations.has(s.name));
      const lowestPriority = activeStrategies[activeStrategies.length - 1];
      
      if (lowestPriority) {
        try {
          console.log(`🔄 Reverting optimization: ${lowestPriority.name}`);
          await lowestPriority.revert(context);
          this.activeOptimizations.delete(lowestPriority.name);
          this.recordOptimization(lowestPriority.name, false, -lowestPriority.estimatedGain);
        } catch (error) {
          console.error(`Failed to revert optimization ${lowestPriority.name}:`, error);
        }
      }
    }
  }

  private determineActiveScenarios(context: PerformanceContext): string[] {
    const scenarios: string[] = [];
    
    if (context.currentFPS < context.targetFPS * 0.85) scenarios.push('low_fps');
    if (context.memoryPressure === 'high') scenarios.push('high_memory');
    if (context.thermalState === 'critical') scenarios.push('thermal_throttling');
    if (context.renderComplexity === 'complex') scenarios.push('high_complexity');
    if (context.deviceProfile === 'mobile') scenarios.push('mobile_device');
    if (context.deviceProfile === 'desktop') scenarios.push('desktop_device');
    if (context.deviceProfile === 'hmd') scenarios.push('hmd_device');
    if (context.memoryPressure !== 'low') scenarios.push('memory_pressure');
    
    return scenarios;
  }

  private recordOptimization(strategyName: string, applied: boolean, fpsChange: number): void {
    this.optimizationHistory.push({
      timestamp: Date.now(),
      strategy: strategyName,
      applied,
      fpsChange
    });
    
    // Keep only recent history
    if (this.optimizationHistory.length > 1000) {
      this.optimizationHistory.shift();
    }
  }

  // Optimization implementation methods
  
  private applyQualityReduction(factor: number): void {
    // Implementation would reduce rendering quality
    console.log(`🎨 Adjusting quality scale: ${factor}`);
  }

  private enableAdaptiveLOD(enabled: boolean): void {
    // Implementation would enable/disable Level of Detail optimization
    console.log(`📐 Adaptive LOD: ${enabled ? 'enabled' : 'disabled'}`);
  }

  private adjustFoveationIntensity(intensity: number): void {
    // Implementation would adjust foveated rendering intensity
    console.log(`👁️  Foveation intensity: ${intensity}`);
  }

  private adjustResolution(scale: number): void {
    // Implementation would scale rendering resolution
    console.log(`🖥️  Resolution scale: ${scale}`);
  }

  private enableTemporalUpsampling(enabled: boolean): void {
    // Implementation would enable/disable temporal upsampling
    console.log(`⏱️  Temporal upsampling: ${enabled ? 'enabled' : 'disabled'}`);
  }

  private enableQuantization(enabled: boolean): void {
    // Implementation would switch neural network precision
    console.log(`🔢 Neural quantization: ${enabled ? 'enabled' : 'disabled'}`);
  }

  private adjustRayBatchSize(batchSize: number): void {
    // Implementation would adjust ray marching batch size
    console.log(`📦 Ray batch size: ${batchSize}`);
  }

  private optimizeMemoryPools(): void {
    // Implementation would optimize memory allocation patterns
    console.log(`🧠 Memory pools optimized`);
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    activeOptimizations: string[];
    totalOptimizations: number;
    averageGain: number;
    recentHistory: typeof this.optimizationHistory;
  } {
    const recentHistory = this.optimizationHistory.slice(-20);
    const totalGain = this.optimizationHistory.reduce((sum, opt) => sum + opt.fpsChange, 0);
    const averageGain = this.optimizationHistory.length > 0 ? totalGain / this.optimizationHistory.length : 0;

    return {
      activeOptimizations: Array.from(this.activeOptimizations),
      totalOptimizations: this.optimizationHistory.length,
      averageGain: Math.round(averageGain * 100) / 100,
      recentHistory
    };
  }

  /**
   * Force a specific optimization strategy
   */
  async forceOptimization(strategyName: string, context?: Partial<PerformanceContext>): Promise<boolean> {
    const strategy = this.strategies.find(s => s.name === strategyName);
    if (!strategy) {
      throw new Error(`Unknown optimization strategy: ${strategyName}`);
    }

    const fullContext = context ? 
      { ...await this.buildPerformanceContext(), ...context } :
      await this.buildPerformanceContext();

    try {
      const applied = await strategy.apply(fullContext);
      if (applied) {
        this.activeOptimizations.add(strategy.name);
        this.recordOptimization(strategy.name, true, strategy.estimatedGain);
      }
      return applied;
    } catch (error) {
      console.error(`Failed to force optimization ${strategyName}:`, error);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.activeOptimizations.clear();
    this.performanceHistory.length = 0;
    this.optimizationHistory.length = 0;
    console.log('🧹 Adaptive Performance Manager disposed');
  }
}

// Global performance manager instance
export const adaptivePerformanceManager = new AdaptivePerformanceManager();