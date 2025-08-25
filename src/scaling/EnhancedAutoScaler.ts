/**
 * Enhanced Auto Scaler for NeRF Edge Kit - Generation 3
 * Advanced intelligent scaling with predictive analytics
 */

import { systemHealth } from '../monitoring/SystemHealth';
import { enhancedErrorHandler, ErrorCategory, ErrorSeverity } from '../core/EnhancedErrorHandler';
import { advancedPerformanceOptimizer } from '../optimization/AdvancedPerformanceOptimizer';

export interface ScalingMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  gpuUtilization: number;
  requestRate: number;
  responseTime: number;
  errorRate: number;
  networkLatency: number;
  renderingQuality: number;
}

export interface PredictiveScalingRule {
  name: string;
  pattern: 'trending_up' | 'trending_down' | 'spike' | 'oscillating';
  threshold: number;
  confidence: number;
  action: ScalingAction;
  predictiveWindow: number; // ms
}

export interface ScalingAction {
  type: 'quality' | 'resources' | 'cache' | 'workers' | 'network';
  adjustment: number;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class EnhancedAutoScaler {
  private metricsHistory: Array<{ timestamp: number; metrics: ScalingMetrics }> = [];
  private scalingActions: Array<{
    timestamp: number;
    action: ScalingAction;
    effectiveness: number;
    reason: string;
  }> = [];
  
  private monitoringActive = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private predictiveRules: PredictiveScalingRule[] = [];
  
  // Machine learning-like pattern recognition
  private patterns: Map<string, {
    occurrences: number;
    avgEffectiveness: number;
    lastSeen: number;
  }> = new Map();

  constructor() {
    this.initializePredictiveRules();
    console.log('🤖 Enhanced Auto Scaler initialized with predictive analytics');
  }

  /**
   * Initialize predictive scaling rules
   */
  private initializePredictiveRules(): void {
    // CPU trending up prediction
    this.predictiveRules.push({
      name: 'CPU Spike Prediction',
      pattern: 'trending_up',
      threshold: 70, // Start scaling before reaching 80%
      confidence: 0.7,
      action: {
        type: 'quality',
        adjustment: -0.1,
        description: 'Preemptive quality reduction due to predicted CPU spike',
        priority: 'medium'
      },
      predictiveWindow: 10000 // 10 seconds ahead
    });

    // Memory pressure prediction
    this.predictiveRules.push({
      name: 'Memory Pressure Prediction',
      pattern: 'trending_up',
      threshold: 75,
      confidence: 0.8,
      action: {
        type: 'cache',
        adjustment: -0.2,
        description: 'Preemptive cache reduction due to predicted memory pressure',
        priority: 'high'
      },
      predictiveWindow: 15000
    });

    // Performance oscillation detection
    this.predictiveRules.push({
      name: 'Performance Oscillation Stabilization',
      pattern: 'oscillating',
      threshold: 20, // 20% variation
      confidence: 0.6,
      action: {
        type: 'workers',
        adjustment: 0.1,
        description: 'Stabilize performance oscillations with additional workers',
        priority: 'medium'
      },
      predictiveWindow: 30000
    });

    // Network degradation prediction
    this.predictiveRules.push({
      name: 'Network Degradation Prediction',
      pattern: 'trending_up',
      threshold: 100, // 100ms latency
      confidence: 0.65,
      action: {
        type: 'network',
        adjustment: -0.15,
        description: 'Reduce network load due to predicted degradation',
        priority: 'high'
      },
      predictiveWindow: 20000
    });
  }

  /**
   * Start enhanced monitoring with predictive analytics
   */
  startMonitoring(): void {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runPredictiveScaling();
      } catch (error) {
        enhancedErrorHandler.handleError(
          error as Error,
          ErrorCategory.SYSTEM,
          ErrorSeverity.MEDIUM,
          {
            component: 'EnhancedAutoScaler',
            operation: 'runPredictiveScaling'
          }
        );
      }
    }, 2000); // More frequent monitoring for predictions
    
    console.log('🔄 Enhanced predictive scaling started');
  }

  /**
   * Run predictive scaling analysis
   */
  private async runPredictiveScaling(): Promise<void> {
    // Collect current metrics
    const currentMetrics = await this.getCurrentMetrics();
    this.recordMetrics(currentMetrics);
    
    // Analyze patterns and predict future needs
    for (const rule of this.predictiveRules) {
      const prediction = this.analyzePredictivePattern(rule);
      
      if (prediction.shouldScale && prediction.confidence >= rule.confidence) {
        await this.executeScalingAction(rule.action, `Predictive: ${prediction.reason}`);
      }
    }
    
    // Self-learning: analyze past actions effectiveness
    this.updatePatternLearning();
  }

  /**
   * Analyze predictive patterns
   */
  private analyzePredictivePattern(rule: PredictiveScalingRule): {
    shouldScale: boolean;
    confidence: number;
    reason: string;
  } {
    const recentMetrics = this.getRecentMetrics(rule.predictiveWindow);
    
    if (recentMetrics.length < 3) {
      return { shouldScale: false, confidence: 0, reason: 'Insufficient data' };
    }

    switch (rule.pattern) {
      case 'trending_up':
        return this.analyzeTrendingUp(recentMetrics, rule);
      case 'trending_down':
        return this.analyzeTrendingDown(recentMetrics, rule);
      case 'spike':
        return this.analyzeSpike(recentMetrics, rule);
      case 'oscillating':
        return this.analyzeOscillation(recentMetrics, rule);
      default:
        return { shouldScale: false, confidence: 0, reason: 'Unknown pattern' };
    }
  }

  /**
   * Analyze trending up pattern
   */
  private analyzeTrendingUp(
    metrics: Array<{ timestamp: number; metrics: ScalingMetrics }>,
    rule: PredictiveScalingRule
  ): { shouldScale: boolean; confidence: number; reason: string } {
    // Calculate trend slope for the relevant metric
    const metricName = this.getMetricNameForAction(rule.action.type);
    const values = metrics.map(m => (m.metrics as any)[metricName]);
    
    const slope = this.calculateTrendSlope(values);
    const currentValue = values[values.length - 1];
    
    // Predict future value
    const predictedValue = currentValue + (slope * 5); // 5 data points ahead
    
    const shouldScale = predictedValue > rule.threshold && slope > 0;
    const confidence = Math.min(1.0, slope / 10 + 0.3); // Base confidence + slope factor
    
    return {
      shouldScale,
      confidence,
      reason: `Trending up: current=${currentValue.toFixed(1)}, predicted=${predictedValue.toFixed(1)}, threshold=${rule.threshold}`
    };
  }

  /**
   * Analyze trending down pattern
   */
  private analyzeTrendingDown(
    metrics: Array<{ timestamp: number; metrics: ScalingMetrics }>,
    rule: PredictiveScalingRule
  ): { shouldScale: boolean; confidence: number; reason: string } {
    const metricName = this.getMetricNameForAction(rule.action.type);
    const values = metrics.map(m => (m.metrics as any)[metricName]);
    
    const slope = this.calculateTrendSlope(values);
    const currentValue = values[values.length - 1];
    
    // For trending down, we might scale up resources when metrics improve
    const shouldScale = slope < -2 && currentValue < rule.threshold;
    const confidence = Math.min(1.0, Math.abs(slope) / 10 + 0.2);
    
    return {
      shouldScale,
      confidence,
      reason: `Trending down: slope=${slope.toFixed(2)}, can scale up resources`
    };
  }

  /**
   * Analyze spike pattern
   */
  private analyzeSpike(
    metrics: Array<{ timestamp: number; metrics: ScalingMetrics }>,
    rule: PredictiveScalingRule
  ): { shouldScale: boolean; confidence: number; reason: string } {
    const metricName = this.getMetricNameForAction(rule.action.type);
    const values = metrics.map(m => (m.metrics as any)[metricName]);
    
    // Look for sudden increases
    const recent5 = values.slice(-5);
    const avg5 = recent5.reduce((a, b) => a + b) / recent5.length;
    const latest = values[values.length - 1];
    
    const spikeRatio = latest / avg5;
    const shouldScale = spikeRatio > 1.3; // 30% spike
    const confidence = Math.min(1.0, (spikeRatio - 1) * 2);
    
    return {
      shouldScale,
      confidence,
      reason: `Spike detected: ${(spikeRatio * 100).toFixed(1)}% increase`
    };
  }

  /**
   * Analyze oscillation pattern
   */
  private analyzeOscillation(
    metrics: Array<{ timestamp: number; metrics: ScalingMetrics }>,
    rule: PredictiveScalingRule
  ): { shouldScale: boolean; confidence: number; reason: string } {
    const metricName = this.getMetricNameForAction(rule.action.type);
    const values = metrics.map(m => (m.metrics as any)[metricName]);
    
    // Calculate variance and oscillation frequency
    const avg = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Count direction changes (peaks and valleys)
    let directionChanges = 0;
    for (let i = 1; i < values.length - 1; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      const next = values[i + 1];
      
      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        directionChanges++;
      }
    }
    
    const oscillationRatio = (stdDev / avg) * 100;
    const shouldScale = oscillationRatio > rule.threshold && directionChanges >= 3;
    const confidence = Math.min(1.0, oscillationRatio / 50);
    
    return {
      shouldScale,
      confidence,
      reason: `Oscillation detected: ${oscillationRatio.toFixed(1)}% variance, ${directionChanges} changes`
    };
  }

  /**
   * Calculate trend slope using linear regression
   */
  private calculateTrendSlope(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b);
    const sumY = values.reduce((a, b) => a + b);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Get metric name for action type
   */
  private getMetricNameForAction(actionType: string): keyof ScalingMetrics {
    switch (actionType) {
      case 'quality':
      case 'resources':
        return 'cpuUtilization';
      case 'cache':
        return 'memoryUtilization';
      case 'workers':
        return 'responseTime';
      case 'network':
        return 'networkLatency';
      default:
        return 'cpuUtilization';
    }
  }

  /**
   * Execute scaling action with learning
   */
  private async executeScalingAction(action: ScalingAction, reason: string): Promise<void> {
    console.log(`🎯 Executing predictive scaling: ${action.description} (${reason})`);
    
    const beforeMetrics = await this.getCurrentMetrics();
    
    try {
      // Apply the scaling action through the performance optimizer
      await this.applyScalingAction(action);
      
      // Wait for stabilization
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Measure effectiveness
      const afterMetrics = await this.getCurrentMetrics();
      const effectiveness = this.calculateActionEffectiveness(beforeMetrics, afterMetrics, action);
      
      // Record the action
      this.scalingActions.push({
        timestamp: Date.now(),
        action,
        effectiveness,
        reason
      });
      
      // Update pattern learning
      this.updatePatternEffectiveness(reason, effectiveness);
      
      console.log(`📊 Scaling action effectiveness: ${(effectiveness * 100).toFixed(1)}%`);
      
    } catch (error) {
      enhancedErrorHandler.handleError(
        error as Error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        {
          component: 'EnhancedAutoScaler',
          operation: 'executeScalingAction',
          additionalData: { action, reason }
        }
      );
    }
  }

  /**
   * Apply scaling action through appropriate systems
   */
  private async applyScalingAction(action: ScalingAction): Promise<void> {
    switch (action.type) {
      case 'quality':
        await this.adjustQuality(action.adjustment);
        break;
      case 'cache':
        await this.adjustCache(action.adjustment);
        break;
      case 'workers':
        await this.adjustWorkers(action.adjustment);
        break;
      case 'network':
        await this.adjustNetworkSettings(action.adjustment);
        break;
      case 'resources':
        await this.adjustResourceLimits(action.adjustment);
        break;
    }
  }

  /**
   * Quality adjustment implementation
   */
  private async adjustQuality(adjustment: number): Promise<void> {
    const currentProfile = advancedPerformanceOptimizer.getCurrentProfile();
    const newQuality = currentProfile.qualityLevel === 'high' && adjustment < 0 ? 'medium' :
                      currentProfile.qualityLevel === 'medium' && adjustment < 0 ? 'low' :
                      currentProfile.qualityLevel === 'low' && adjustment > 0 ? 'medium' :
                      currentProfile.qualityLevel === 'medium' && adjustment > 0 ? 'high' :
                      currentProfile.qualityLevel;
    
    if (newQuality !== currentProfile.qualityLevel) {
      const newProfile = { ...currentProfile, qualityLevel: newQuality };
      // Would apply through performance optimizer in real implementation
      console.log(`🎨 Quality adjusted to: ${newQuality}`);
    }
  }

  /**
   * Cache adjustment implementation
   */
  private async adjustCache(adjustment: number): Promise<void> {
    // Implementation would adjust cache size through cache manager
    console.log(`💾 Cache adjusted by: ${(adjustment * 100).toFixed(1)}%`);
  }

  /**
   * Worker adjustment implementation
   */
  private async adjustWorkers(adjustment: number): Promise<void> {
    // Implementation would adjust worker pool
    console.log(`👷 Workers adjusted by: ${(adjustment * 100).toFixed(1)}%`);
  }

  /**
   * Network settings adjustment
   */
  private async adjustNetworkSettings(adjustment: number): Promise<void> {
    // Implementation would adjust network optimization settings
    console.log(`🌐 Network settings adjusted by: ${(adjustment * 100).toFixed(1)}%`);
  }

  /**
   * Resource limits adjustment
   */
  private async adjustResourceLimits(adjustment: number): Promise<void> {
    // Implementation would adjust resource limits
    console.log(`⚡ Resource limits adjusted by: ${(adjustment * 100).toFixed(1)}%`);
  }

  /**
   * Calculate action effectiveness
   */
  private calculateActionEffectiveness(
    before: ScalingMetrics,
    after: ScalingMetrics,
    action: ScalingAction
  ): number {
    const metricName = this.getMetricNameForAction(action.type);
    const beforeValue = (before as any)[metricName];
    const afterValue = (after as any)[metricName];
    
    // Calculate improvement (lower is better for most metrics)
    const improvement = (beforeValue - afterValue) / beforeValue;
    
    // Effectiveness is 0-1, where 1 is perfect improvement
    return Math.max(0, Math.min(1, improvement));
  }

  /**
   * Record metrics in history
   */
  private recordMetrics(metrics: ScalingMetrics): void {
    this.metricsHistory.push({
      timestamp: Date.now(),
      metrics: { ...metrics }
    });
    
    // Keep history limited to last hour
    const cutoff = Date.now() - 3600000; // 1 hour
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get recent metrics within time window
   */
  private getRecentMetrics(windowMs: number): Array<{ timestamp: number; metrics: ScalingMetrics }> {
    const cutoff = Date.now() - windowMs;
    return this.metricsHistory.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get current metrics
   */
  private async getCurrentMetrics(): Promise<ScalingMetrics> {
    const healthSummary = systemHealth.getHealthSummary();
    const recentMetrics = healthSummary.recentMetrics;
    
    // Build comprehensive metrics
    const metrics: ScalingMetrics = {
      cpuUtilization: recentMetrics?.cpu.usage || 0,
      memoryUtilization: recentMetrics?.memory.percentage || 0,
      gpuUtilization: recentMetrics?.gpu.usage || 0,
      requestRate: this.estimateRequestRate(),
      responseTime: recentMetrics?.rendering.frameTime || 16.67,
      errorRate: this.calculateErrorRate(),
      networkLatency: recentMetrics?.network.latency || 0,
      renderingQuality: this.getCurrentRenderingQuality()
    };
    
    return metrics;
  }

  /**
   * Estimate current request rate
   */
  private estimateRequestRate(): number {
    // This would integrate with actual request metrics
    return Math.random() * 50; // Mock for now
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const recentAlerts = systemHealth.getRecentAlerts(5);
    const criticalCount = recentAlerts.filter(a => a.type === 'critical').length;
    return recentAlerts.length > 0 ? (criticalCount / recentAlerts.length) * 100 : 0;
  }

  /**
   * Get current rendering quality as numeric value
   */
  private getCurrentRenderingQuality(): number {
    const profile = advancedPerformanceOptimizer.getCurrentProfile();
    return profile.qualityLevel === 'high' ? 1.0 :
           profile.qualityLevel === 'medium' ? 0.75 : 0.5;
  }

  /**
   * Update pattern learning based on effectiveness
   */
  private updatePatternEffectiveness(pattern: string, effectiveness: number): void {
    const existing = this.patterns.get(pattern);
    
    if (existing) {
      existing.occurrences++;
      existing.avgEffectiveness = (existing.avgEffectiveness + effectiveness) / 2;
      existing.lastSeen = Date.now();
    } else {
      this.patterns.set(pattern, {
        occurrences: 1,
        avgEffectiveness: effectiveness,
        lastSeen: Date.now()
      });
    }
  }

  /**
   * Update pattern learning from historical data
   */
  private updatePatternLearning(): void {
    // Clean up old patterns (older than 24 hours)
    const cutoff = Date.now() - 86400000; // 24 hours
    for (const [pattern, data] of this.patterns.entries()) {
      if (data.lastSeen < cutoff) {
        this.patterns.delete(pattern);
      }
    }
    
    // Adjust rule confidence based on learned effectiveness
    for (const rule of this.predictiveRules) {
      const pattern = this.patterns.get(rule.name);
      if (pattern && pattern.occurrences >= 3) {
        // Adjust confidence based on historical effectiveness
        rule.confidence = Math.max(0.3, Math.min(0.95, pattern.avgEffectiveness + 0.2));
      }
    }
  }

  /**
   * Get scaling analytics
   */
  getScalingAnalytics(): {
    totalPredictions: number;
    successfulPredictions: number;
    avgEffectiveness: number;
    topPatterns: Array<{ name: string; effectiveness: number; occurrences: number }>;
    recentActions: Array<{ timestamp: number; action: string; effectiveness: number }>;
  } {
    const successfulPredictions = this.scalingActions.filter(a => a.effectiveness > 0.5).length;
    const avgEffectiveness = this.scalingActions.length > 0
      ? this.scalingActions.reduce((sum, a) => sum + a.effectiveness, 0) / this.scalingActions.length
      : 0;
    
    const topPatterns = Array.from(this.patterns.entries())
      .map(([name, data]) => ({ name, effectiveness: data.avgEffectiveness, occurrences: data.occurrences }))
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 5);
    
    const recentActions = this.scalingActions
      .slice(-10)
      .map(a => ({
        timestamp: a.timestamp,
        action: a.action.description,
        effectiveness: a.effectiveness
      }));
    
    return {
      totalPredictions: this.scalingActions.length,
      successfulPredictions,
      avgEffectiveness,
      topPatterns,
      recentActions
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoringActive = false;
    console.log('🔄 Enhanced predictive scaling stopped');
  }

  /**
   * Dispose of enhanced auto scaler
   */
  dispose(): void {
    this.stopMonitoring();
    this.metricsHistory.length = 0;
    this.scalingActions.length = 0;
    this.patterns.clear();
    this.predictiveRules.length = 0;
    console.log('🧹 Enhanced Auto Scaler disposed');
  }
}

// Global enhanced auto scaler instance
export const enhancedAutoScaler = new EnhancedAutoScaler();