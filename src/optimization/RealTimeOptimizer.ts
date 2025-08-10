/**
 * Real-Time NeRF Optimization Engine
 * Generation 1 Enhancement: Smart optimization for spatial computing
 */

export interface OptimizationConfig {
  /** Enable real-time optimization */
  enabled: boolean;
  /** Optimization update frequency (ms) */
  updateInterval: number;
  /** Target performance metrics */
  targets: {
    minFPS: number;
    maxLatency: number; // ms
    maxMemory: number;  // MB
    maxPower: number;   // W
  };
}

export interface OptimizationMetrics {
  fps: number;
  latency: number;
  memoryUsage: number;
  powerConsumption: number;
  renderQuality: number; // 0-1
}

export interface OptimizationAction {
  type: 'quality' | 'resolution' | 'foveation' | 'culling' | 'lod';
  action: 'increase' | 'decrease' | 'enable' | 'disable';
  value?: number;
  priority: number;
  reason: string;
}

/**
 * Real-time optimization engine for NeRF rendering
 */
export class RealTimeOptimizer {
  private config: OptimizationConfig;
  private metricsHistory: OptimizationMetrics[] = [];
  private optimizationTimer: number | null = null;
  private currentOptimizations: Map<string, any> = new Map();
  
  // Optimization state
  private qualityLevel = 1.0;
  private resolutionScale = 1.0;
  private foveationStrength = 0.5;
  private cullingAggression = 0.5;
  private lodBias = 0.0;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      enabled: true,
      updateInterval: 100, // 10 FPS optimization updates
      targets: {
        minFPS: 60,
        maxLatency: 16.7, // ~60fps
        maxMemory: 1024,  // 1GB
        maxPower: 8       // 8W for Vision Pro
      },
      ...config
    };
  }

  /**
   * Start real-time optimization
   */
  start(): void {
    if (!this.config.enabled || this.optimizationTimer) return;
    
    console.log('🚀 Starting real-time optimization engine');
    
    this.optimizationTimer = window.setInterval(() => {
      this.optimizeFrame();
    }, this.config.updateInterval);
  }

  /**
   * Stop optimization engine
   */
  stop(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
      console.log('🛑 Stopped real-time optimization engine');
    }
  }

  /**
   * Update current performance metrics
   */
  updateMetrics(metrics: OptimizationMetrics): void {
    this.metricsHistory.push({
      ...metrics,
      timestamp: Date.now()
    } as any);
    
    // Keep only recent history
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Main optimization loop
   */
  private optimizeFrame(): void {
    if (this.metricsHistory.length < 3) return;
    
    const currentMetrics = this.getCurrentMetrics();
    const actions = this.analyzeAndGenerateActions(currentMetrics);
    
    // Apply the highest priority actions
    actions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 2) // Apply top 2 actions per frame
      .forEach(action => this.applyOptimization(action));
  }

  /**
   * Analyze current performance and generate optimization actions
   */
  private analyzeAndGenerateActions(metrics: OptimizationMetrics): OptimizationAction[] {
    const actions: OptimizationAction[] = [];
    const targets = this.config.targets;

    // FPS optimization
    if (metrics.fps < targets.minFPS) {
      const fpsDelta = targets.minFPS - metrics.fps;
      
      if (fpsDelta > 10) {
        // Severe performance issue - aggressive optimization
        actions.push({
          type: 'quality',
          action: 'decrease',
          value: 0.2,
          priority: 10,
          reason: `FPS too low: ${metrics.fps.toFixed(1)} < ${targets.minFPS}`
        });
        
        actions.push({
          type: 'resolution',
          action: 'decrease',
          value: 0.1,
          priority: 9,
          reason: 'Reduce resolution for performance'
        });
      } else {
        // Moderate performance issue
        actions.push({
          type: 'foveation',
          action: 'increase',
          value: 0.1,
          priority: 7,
          reason: 'Increase foveation to improve FPS'
        });
      }
    } else if (metrics.fps > targets.minFPS + 5) {
      // Performance headroom - can increase quality
      actions.push({
        type: 'quality',
        action: 'increase',
        value: 0.05,
        priority: 3,
        reason: 'FPS headroom available'
      });
    }

    // Latency optimization
    if (metrics.latency > targets.maxLatency) {
      actions.push({
        type: 'culling',
        action: 'increase',
        value: 0.1,
        priority: 8,
        reason: `Latency too high: ${metrics.latency.toFixed(1)}ms`
      });
    }

    // Memory optimization
    if (metrics.memoryUsage > targets.maxMemory) {
      actions.push({
        type: 'lod',
        action: 'increase',
        value: 0.1,
        priority: 6,
        reason: `Memory usage high: ${metrics.memoryUsage.toFixed(0)}MB`
      });
    }

    // Power optimization
    if (metrics.powerConsumption > targets.maxPower) {
      actions.push({
        type: 'quality',
        action: 'decrease',
        value: 0.1,
        priority: 5,
        reason: `Power consumption high: ${metrics.powerConsumption.toFixed(1)}W`
      });
    }

    return actions;
  }

  /**
   * Apply optimization action
   */
  private applyOptimization(action: OptimizationAction): void {
    const value = action.value || 0.1;
    
    switch (action.type) {
      case 'quality':
        this.qualityLevel = Math.max(0.1, Math.min(1.0, 
          this.qualityLevel + (action.action === 'increase' ? value : -value)
        ));
        break;
        
      case 'resolution':
        this.resolutionScale = Math.max(0.5, Math.min(1.0,
          this.resolutionScale + (action.action === 'increase' ? value : -value)
        ));
        break;
        
      case 'foveation':
        this.foveationStrength = Math.max(0.0, Math.min(1.0,
          this.foveationStrength + (action.action === 'increase' ? value : -value)
        ));
        break;
        
      case 'culling':
        this.cullingAggression = Math.max(0.0, Math.min(1.0,
          this.cullingAggression + (action.action === 'increase' ? value : -value)
        ));
        break;
        
      case 'lod':
        this.lodBias = Math.max(0.0, Math.min(2.0,
          this.lodBias + (action.action === 'increase' ? value : -value)
        ));
        break;
    }
    
    // Store optimization action
    this.currentOptimizations.set(action.type, {
      value: this.getOptimizationValue(action.type),
      action,
      timestamp: Date.now()
    });
    
    console.log(`🎛️ Applied ${action.type} ${action.action}: ${action.reason}`);
  }

  /**
   * Get current optimization settings
   */
  getCurrentOptimizations(): Record<string, number> {
    return {
      quality: this.qualityLevel,
      resolution: this.resolutionScale,
      foveation: this.foveationStrength,
      culling: this.cullingAggression,
      lod: this.lodBias
    };
  }

  /**
   * Get optimization recommendations for renderer
   */
  getRendererConfig(): {
    qualityLevel: number;
    resolutionScale: number;
    foveationConfig: {
      enabled: boolean;
      centerRadius: number;
      levels: number;
    };
    cullingDistance: number;
    lodBias: number;
  } {
    return {
      qualityLevel: this.qualityLevel,
      resolutionScale: this.resolutionScale,
      foveationConfig: {
        enabled: this.foveationStrength > 0.1,
        centerRadius: 0.3 - (this.foveationStrength * 0.2),
        levels: Math.ceil(2 + this.foveationStrength * 3)
      },
      cullingDistance: 50 * (1 - this.cullingAggression),
      lodBias: this.lodBias
    };
  }

  /**
   * Get optimization statistics
   */
  getStatistics(): {
    totalOptimizations: number;
    averageMetrics: OptimizationMetrics | null;
    recentActions: OptimizationAction[];
    effectiveness: number;
  } {
    const recentActions = Array.from(this.currentOptimizations.values())
      .map(opt => opt.action)
      .slice(-10);
    
    const averageMetrics = this.calculateAverageMetrics();
    const effectiveness = this.calculateOptimizationEffectiveness();
    
    return {
      totalOptimizations: this.currentOptimizations.size,
      averageMetrics,
      recentActions,
      effectiveness
    };
  }

  // Helper methods
  
  private getCurrentMetrics(): OptimizationMetrics {
    return this.metricsHistory[this.metricsHistory.length - 1];
  }
  
  private getOptimizationValue(type: string): number {
    switch (type) {
      case 'quality': return this.qualityLevel;
      case 'resolution': return this.resolutionScale;
      case 'foveation': return this.foveationStrength;
      case 'culling': return this.cullingAggression;
      case 'lod': return this.lodBias;
      default: return 0;
    }
  }
  
  private calculateAverageMetrics(): OptimizationMetrics | null {
    if (this.metricsHistory.length === 0) return null;
    
    const sum = this.metricsHistory.reduce((acc, metrics) => ({
      fps: acc.fps + metrics.fps,
      latency: acc.latency + metrics.latency,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage,
      powerConsumption: acc.powerConsumption + metrics.powerConsumption,
      renderQuality: acc.renderQuality + metrics.renderQuality
    }), { fps: 0, latency: 0, memoryUsage: 0, powerConsumption: 0, renderQuality: 0 });
    
    const count = this.metricsHistory.length;
    return {
      fps: sum.fps / count,
      latency: sum.latency / count,
      memoryUsage: sum.memoryUsage / count,
      powerConsumption: sum.powerConsumption / count,
      renderQuality: sum.renderQuality / count
    };
  }
  
  private calculateOptimizationEffectiveness(): number {
    if (this.metricsHistory.length < 20) return 0.5;
    
    const recent = this.metricsHistory.slice(-10);
    const older = this.metricsHistory.slice(-20, -10);
    
    const recentFPS = recent.reduce((sum, m) => sum + m.fps, 0) / recent.length;
    const olderFPS = older.reduce((sum, m) => sum + m.fps, 0) / older.length;
    
    // Simple effectiveness metric based on FPS improvement
    return Math.max(0, Math.min(1, (recentFPS - olderFPS) / this.config.targets.minFPS + 0.5));
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.metricsHistory.length = 0;
    this.currentOptimizations.clear();
  }
}