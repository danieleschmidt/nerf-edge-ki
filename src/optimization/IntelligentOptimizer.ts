/**
 * Intelligent Performance Optimizer for NeRF Edge Kit
 * Implements AI-driven optimization strategies for real-time performance tuning
 */

export interface OptimizationMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  gpuUtilization: number;
  cpuUtilization: number;
  networkLatency: number;
  renderQuality: number; // 0-1
  userSatisfaction: number; // 0-1 (derived from interaction patterns)
}

export interface OptimizationTarget {
  minFPS: number;
  maxFrameTime: number;
  maxMemoryUsage: number;
  minQuality: number;
  priority: 'performance' | 'quality' | 'balanced' | 'power-saving';
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  impact: {
    performance: number; // -1 to 1 (negative = worse, positive = better)
    quality: number;
    memory: number;
    power: number;
  };
  cost: number; // 0-1 (computational cost)
  conditions: (metrics: OptimizationMetrics) => boolean;
  apply: () => Promise<void>;
  rollback: () => Promise<void>;
}

export interface OptimizationResult {
  appliedStrategies: string[];
  expectedImprovement: {
    fps: number;
    quality: number;
    memory: number;
  };
  confidence: number;
  reasoning: string[];
}

export class IntelligentOptimizer {
  private strategies: Map<string, OptimizationStrategy> = new Map();
  private appliedStrategies: Set<string> = new Set();
  private metricsHistory: OptimizationMetrics[] = [];
  private optimizationHistory: Array<{
    timestamp: number;
    strategies: string[];
    beforeMetrics: OptimizationMetrics;
    afterMetrics?: OptimizationMetrics;
    success: boolean;
  }> = [];
  
  private target: OptimizationTarget;
  private learningRate = 0.1;
  private maxHistorySize = 1000;

  constructor(target: OptimizationTarget) {
    this.target = target;
    this.initializeStrategies();
  }

  /**
   * Continuously optimize performance based on current metrics
   */
  async optimize(currentMetrics: OptimizationMetrics): Promise<OptimizationResult> {
    console.log('🎯 Starting intelligent optimization...');
    
    // Store metrics for learning
    this.addMetrics(currentMetrics);
    
    // Analyze current performance gaps
    const gaps = this.analyzePerformanceGaps(currentMetrics);
    
    // Select optimal strategies using AI-driven selection
    const selectedStrategies = await this.selectOptimalStrategies(currentMetrics, gaps);
    
    // Apply strategies
    const appliedStrategies: string[] = [];
    for (const strategy of selectedStrategies) {
      try {
        await strategy.apply();
        this.appliedStrategies.add(strategy.id);
        appliedStrategies.push(strategy.id);
        console.log(`✅ Applied optimization strategy: ${strategy.name}`);
      } catch (error) {
        console.error(`❌ Failed to apply strategy ${strategy.name}:`, error);
      }
    }
    
    // Calculate expected improvement
    const expectedImprovement = this.calculateExpectedImprovement(selectedStrategies);
    const confidence = this.calculateConfidence(selectedStrategies, currentMetrics);
    const reasoning = this.generateReasoning(selectedStrategies, gaps);
    
    // Record optimization attempt
    this.recordOptimization(currentMetrics, appliedStrategies, true);
    
    return {
      appliedStrategies,
      expectedImprovement,
      confidence,
      reasoning
    };
  }

  /**
   * Rollback optimizations if they're not working
   */
  async rollbackOptimizations(strategiesToRollback?: string[]): Promise<void> {
    const toRollback = strategiesToRollback || Array.from(this.appliedStrategies);
    
    for (const strategyId of toRollback) {
      const strategy = this.strategies.get(strategyId);
      if (strategy) {
        try {
          await strategy.rollback();
          this.appliedStrategies.delete(strategyId);
          console.log(`↩️ Rolled back strategy: ${strategy.name}`);
        } catch (error) {
          console.error(`❌ Failed to rollback strategy ${strategy.name}:`, error);
        }
      }
    }
  }

  /**
   * Add a custom optimization strategy
   */
  addStrategy(strategy: OptimizationStrategy): void {
    this.strategies.set(strategy.id, strategy);
    console.log(`📋 Added optimization strategy: ${strategy.name}`);
  }

  /**
   * Get optimization analytics
   */
  getAnalytics(): {
    totalOptimizations: number;
    successRate: number;
    averageImprovement: {
      fps: number;
      quality: number;
      memory: number;
    };
    mostEffectiveStrategies: Array<{
      strategy: string;
      effectivenessScore: number;
      usageCount: number;
    }>;
    currentlyApplied: string[];
  } {
    const totalOptimizations = this.optimizationHistory.length;
    const successfulOptimizations = this.optimizationHistory.filter(opt => opt.success).length;
    const successRate = totalOptimizations > 0 ? successfulOptimizations / totalOptimizations : 0;
    
    // Calculate average improvement
    const improvements = this.optimizationHistory
      .filter(opt => opt.success && opt.afterMetrics)
      .map(opt => ({
        fps: (opt.afterMetrics!.fps - opt.beforeMetrics.fps) / opt.beforeMetrics.fps,
        quality: (opt.afterMetrics!.renderQuality - opt.beforeMetrics.renderQuality),
        memory: (opt.beforeMetrics.memoryUsage - opt.afterMetrics!.memoryUsage) / opt.beforeMetrics.memoryUsage
      }));
    
    const averageImprovement = improvements.length > 0 ? {
      fps: improvements.reduce((sum, imp) => sum + imp.fps, 0) / improvements.length,
      quality: improvements.reduce((sum, imp) => sum + imp.quality, 0) / improvements.length,
      memory: improvements.reduce((sum, imp) => sum + imp.memory, 0) / improvements.length
    } : { fps: 0, quality: 0, memory: 0 };
    
    // Calculate strategy effectiveness
    const strategyUsage = new Map<string, { count: number; totalImprovement: number }>();
    
    for (const opt of this.optimizationHistory) {
      if (opt.success && opt.afterMetrics) {
        const fpsImprovement = (opt.afterMetrics.fps - opt.beforeMetrics.fps) / opt.beforeMetrics.fps;
        
        for (const strategyId of opt.strategies) {
          const current = strategyUsage.get(strategyId) || { count: 0, totalImprovement: 0 };
          current.count++;
          current.totalImprovement += fpsImprovement;
          strategyUsage.set(strategyId, current);
        }
      }
    }
    
    const mostEffectiveStrategies = Array.from(strategyUsage.entries())
      .map(([strategy, data]) => ({
        strategy,
        effectivenessScore: data.totalImprovement / data.count,
        usageCount: data.count
      }))
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
      .slice(0, 5);
    
    return {
      totalOptimizations,
      successRate,
      averageImprovement,
      mostEffectiveStrategies,
      currentlyApplied: Array.from(this.appliedStrategies)
    };
  }

  /**
   * Update optimization target
   */
  updateTarget(newTarget: Partial<OptimizationTarget>): void {
    this.target = { ...this.target, ...newTarget };
    console.log('🎯 Updated optimization target:', this.target);
  }

  /**
   * Initialize default optimization strategies
   */
  private initializeStrategies(): void {
    // Reduce ray sampling strategy
    this.addStrategy({
      id: 'reduce_ray_samples',
      name: 'Reduce Ray Samples',
      description: 'Decrease the number of ray samples per pixel',
      impact: { performance: 0.7, quality: -0.3, memory: 0.2, power: 0.4 },
      cost: 0.1,
      conditions: (metrics) => metrics.fps < this.target.minFPS * 0.9,
      apply: async () => {
        // Implementation would reduce ray samples
        console.log('🔧 Reducing ray samples for better performance');
      },
      rollback: async () => {
        // Implementation would restore ray samples
        console.log('↩️ Restoring ray samples');
      }
    });

    // Enable foveated rendering strategy
    this.addStrategy({
      id: 'enable_foveation',
      name: 'Enable Foveated Rendering',
      description: 'Enable foveated rendering to reduce peripheral quality',
      impact: { performance: 0.5, quality: -0.1, memory: 0.1, power: 0.3 },
      cost: 0.2,
      conditions: (metrics) => metrics.fps < this.target.minFPS && metrics.renderQuality > 0.7,
      apply: async () => {
        console.log('👁️ Enabling foveated rendering');
      },
      rollback: async () => {
        console.log('↩️ Disabling foveated rendering');
      }
    });

    // Reduce resolution strategy
    this.addStrategy({
      id: 'reduce_resolution',
      name: 'Reduce Resolution',
      description: 'Temporarily reduce rendering resolution',
      impact: { performance: 0.8, quality: -0.4, memory: 0.3, power: 0.5 },
      cost: 0.3,
      conditions: (metrics) => metrics.fps < this.target.minFPS * 0.8,
      apply: async () => {
        console.log('📐 Reducing rendering resolution');
      },
      rollback: async () => {
        console.log('↩️ Restoring rendering resolution');
      }
    });

    // Memory optimization strategy
    this.addStrategy({
      id: 'optimize_memory',
      name: 'Optimize Memory Usage',
      description: 'Clear caches and optimize memory allocation',
      impact: { performance: 0.2, quality: 0, memory: 0.6, power: 0.1 },
      cost: 0.1,
      conditions: (metrics) => metrics.memoryUsage > this.target.maxMemoryUsage * 0.9,
      apply: async () => {
        console.log('🧹 Optimizing memory usage');
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      },
      rollback: async () => {
        console.log('↩️ Memory optimization rollback (no action needed)');
      }
    });

    // LOD adjustment strategy
    this.addStrategy({
      id: 'adjust_lod',
      name: 'Adjust Level of Detail',
      description: 'Reduce level of detail for distant objects',
      impact: { performance: 0.4, quality: -0.2, memory: 0.2, power: 0.3 },
      cost: 0.1,
      conditions: (metrics) => metrics.frameTime > this.target.maxFrameTime,
      apply: async () => {
        console.log('🔍 Adjusting level of detail');
      },
      rollback: async () => {
        console.log('↩️ Restoring level of detail');
      }
    });
  }

  /**
   * Store metrics for historical analysis
   */
  private addMetrics(metrics: OptimizationMetrics): void {
    this.metricsHistory.push({ ...metrics });
    
    // Keep only recent history
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Analyze performance gaps against targets
   */
  private analyzePerformanceGaps(metrics: OptimizationMetrics): {
    fpsGap: number;
    frameTimeGap: number;
    memoryGap: number;
    qualityGap: number;
  } {
    return {
      fpsGap: Math.max(0, this.target.minFPS - metrics.fps),
      frameTimeGap: Math.max(0, metrics.frameTime - this.target.maxFrameTime),
      memoryGap: Math.max(0, metrics.memoryUsage - this.target.maxMemoryUsage),
      qualityGap: Math.max(0, this.target.minQuality - metrics.renderQuality)
    };
  }

  /**
   * Select optimal strategies using AI-driven selection
   */
  private async selectOptimalStrategies(
    metrics: OptimizationMetrics,
    gaps: ReturnType<typeof this.analyzePerformanceGaps>
  ): Promise<OptimizationStrategy[]> {
    // Get all applicable strategies
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => 
        !this.appliedStrategies.has(strategy.id) && 
        strategy.conditions(metrics)
      );

    if (applicableStrategies.length === 0) {
      return [];
    }

    // Score strategies based on current needs and historical effectiveness
    const scoredStrategies = applicableStrategies.map(strategy => ({
      strategy,
      score: this.calculateStrategyScore(strategy, gaps, metrics)
    }));

    // Sort by score and select top strategies
    scoredStrategies.sort((a, b) => b.score - a.score);
    
    // Use a smart selection algorithm to avoid conflicts
    const selected: OptimizationStrategy[] = [];
    let totalCost = 0;
    const maxCost = 1.0; // Maximum computational cost budget
    
    for (const { strategy } of scoredStrategies) {
      if (totalCost + strategy.cost <= maxCost) {
        selected.push(strategy);
        totalCost += strategy.cost;
      }
      
      // Don't apply too many strategies at once
      if (selected.length >= 3) break;
    }

    return selected;
  }

  /**
   * Calculate strategy score based on current needs and effectiveness
   */
  private calculateStrategyScore(
    strategy: OptimizationStrategy,
    gaps: ReturnType<typeof this.analyzePerformanceGaps>,
    metrics: OptimizationMetrics
  ): number {
    let score = 0;

    // Base score from impact vs needs
    if (gaps.fpsGap > 0) {
      score += strategy.impact.performance * (gaps.fpsGap / this.target.minFPS);
    }
    
    if (gaps.memoryGap > 0) {
      score += strategy.impact.memory * (gaps.memoryGap / this.target.maxMemoryUsage);
    }

    // Penalty for quality reduction if quality is already low
    if (metrics.renderQuality < this.target.minQuality * 1.1) {
      score -= Math.abs(strategy.impact.quality) * 0.5;
    }

    // Historical effectiveness bonus
    const historicalEffectiveness = this.getHistoricalEffectiveness(strategy.id);
    score += historicalEffectiveness * 0.3;

    // Cost penalty
    score -= strategy.cost * 0.2;

    // Priority-based weighting
    switch (this.target.priority) {
      case 'performance':
        score += strategy.impact.performance * 0.5;
        break;
      case 'quality':
        score -= Math.abs(strategy.impact.quality) * 0.5;
        break;
      case 'power-saving':
        score += strategy.impact.power * 0.3;
        break;
      default: // balanced
        break;
    }

    return score;
  }

  /**
   * Get historical effectiveness of a strategy
   */
  private getHistoricalEffectiveness(strategyId: string): number {
    const relevantOptimizations = this.optimizationHistory
      .filter(opt => opt.strategies.includes(strategyId) && opt.success && opt.afterMetrics);

    if (relevantOptimizations.length === 0) return 0;

    const improvements = relevantOptimizations.map(opt => {
      const fpsImprovement = (opt.afterMetrics!.fps - opt.beforeMetrics.fps) / opt.beforeMetrics.fps;
      return Math.max(-1, Math.min(1, fpsImprovement)); // Clamp between -1 and 1
    });

    return improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
  }

  /**
   * Calculate expected improvement from strategies
   */
  private calculateExpectedImprovement(strategies: OptimizationStrategy[]): {
    fps: number;
    quality: number;
    memory: number;
  } {
    const totalImpact = strategies.reduce(
      (acc, strategy) => ({
        performance: acc.performance + strategy.impact.performance,
        quality: acc.quality + strategy.impact.quality,
        memory: acc.memory + strategy.impact.memory
      }),
      { performance: 0, quality: 0, memory: 0 }
    );

    // Convert impact to percentage improvements
    return {
      fps: Math.min(2.0, totalImpact.performance * 0.3), // Max 200% improvement
      quality: Math.max(-0.5, totalImpact.quality * 0.2), // Max 50% degradation
      memory: Math.min(0.8, totalImpact.memory * 0.25) // Max 80% memory reduction
    };
  }

  /**
   * Calculate confidence in optimization result
   */
  private calculateConfidence(
    strategies: OptimizationStrategy[],
    metrics: OptimizationMetrics
  ): number {
    if (strategies.length === 0) return 0;

    // Base confidence from historical data
    const historicalConfidence = strategies.reduce((sum, strategy) => {
      const effectiveness = this.getHistoricalEffectiveness(strategy.id);
      return sum + Math.abs(effectiveness);
    }, 0) / strategies.length;

    // Reduce confidence if metrics are very poor (harder to improve)
    const metricsQuality = Math.min(1, metrics.fps / this.target.minFPS);
    
    // Reduce confidence if applying many strategies at once
    const complexityPenalty = Math.max(0, 1 - (strategies.length - 1) * 0.2);

    return Math.max(0.1, Math.min(0.9, 
      historicalConfidence * 0.5 + 
      metricsQuality * 0.3 + 
      complexityPenalty * 0.2
    ));
  }

  /**
   * Generate reasoning for optimization decisions
   */
  private generateReasoning(
    strategies: OptimizationStrategy[],
    gaps: ReturnType<typeof this.analyzePerformanceGaps>
  ): string[] {
    const reasoning: string[] = [];

    if (strategies.length === 0) {
      reasoning.push('No optimization strategies applicable at this time');
      return reasoning;
    }

    reasoning.push(`Applied ${strategies.length} optimization strategies`);

    if (gaps.fpsGap > 0) {
      reasoning.push(`FPS below target by ${gaps.fpsGap.toFixed(1)}`);
    }

    if (gaps.memoryGap > 0) {
      reasoning.push(`Memory usage above target by ${(gaps.memoryGap / 1024 / 1024).toFixed(1)}MB`);
    }

    strategies.forEach(strategy => {
      reasoning.push(`${strategy.name}: ${strategy.description}`);
    });

    return reasoning;
  }

  /**
   * Record optimization attempt for learning
   */
  private recordOptimization(
    beforeMetrics: OptimizationMetrics,
    strategies: string[],
    success: boolean,
    afterMetrics?: OptimizationMetrics
  ): void {
    this.optimizationHistory.push({
      timestamp: Date.now(),
      strategies,
      beforeMetrics,
      afterMetrics,
      success
    });

    // Keep only recent history
    if (this.optimizationHistory.length > this.maxHistorySize) {
      this.optimizationHistory.shift();
    }
  }
}

export default IntelligentOptimizer;