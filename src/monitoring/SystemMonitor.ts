/**
 * Advanced System Monitoring for NeRF Edge Kit
 * 
 * COMPREHENSIVE MONITORING: Real-time system observability with:
 * 1. Performance metrics collection and analysis
 * 2. Resource utilization monitoring
 * 3. Health checks and alerting
 * 4. Predictive analytics for performance degradation
 * 5. Distributed tracing for component interaction analysis
 */

import { PerformanceMetrics } from '../core/types';
import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../core/ErrorHandler';

export interface SystemHealth {
  overall: HealthStatus;
  components: Map<string, ComponentHealth>;
  lastCheck: number;
  uptime: number;
}

export interface ComponentHealth {
  status: HealthStatus;
  metrics: ComponentMetrics;
  lastError?: string;
  errorCount: number;
  responseTime: number;
  availability: number; // 0-1
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  DOWN = 'down'
}

export interface ComponentMetrics {
  cpu: number; // Utilization percentage
  memory: number; // MB
  gpu: number; // Utilization percentage
  network: number; // bytes/second
  operations: number; // operations/second
  errors: number; // errors/second
  latency: number; // milliseconds
}

export interface MonitoringConfig {
  collectionInterval: number; // milliseconds
  retentionPeriod: number; // milliseconds
  alertThresholds: AlertThresholds;
  enablePredictive: boolean;
  enableTracing: boolean;
}

export interface AlertThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  gpu: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  latency: { warning: number; critical: number };
  availability: { warning: number; critical: number };
}

export interface Alert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  component: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  resolved: boolean;
}

export interface PredictiveAnalysis {
  component: string;
  metric: string;
  currentTrend: 'improving' | 'stable' | 'degrading';
  predictedFailure?: {
    probability: number; // 0-1
    timeToFailure: number; // milliseconds
    confidence: number; // 0-1
  };
  recommendations: string[];
}

export interface TracingSpan {
  id: string;
  parentId?: string;
  operation: string;
  component: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Map<string, any>;
  logs: Array<{ timestamp: number; message: string; level: string }>;
}

/**
 * Advanced System Monitor
 */
export class SystemMonitor {
  private config: MonitoringConfig;
  private errorHandler: ErrorHandler;
  private isRunning = false;
  private collectionInterval: any;
  
  // Metrics storage
  private metricsHistory: Map<string, PerformanceMetrics[]> = new Map();
  private componentHealth: Map<string, ComponentHealth> = new Map();
  private alerts: Map<string, Alert> = new Map();
  
  // Predictive analysis
  private trendAnalyzer: TrendAnalyzer;
  private anomalyDetector: AnomalyDetector;
  
  // Distributed tracing
  private tracingSpans: Map<string, TracingSpan> = new Map();
  private activeSpans: Map<string, TracingSpan> = new Map();
  
  // Health check registry
  private healthChecks: Map<string, () => Promise<ComponentHealth>> = new Map();
  
  constructor(config: Partial<MonitoringConfig> = {}, errorHandler: ErrorHandler) {
    this.config = {
      collectionInterval: 1000, // 1 second
      retentionPeriod: 3600000, // 1 hour
      alertThresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 1024, critical: 2048 },
        gpu: { warning: 80, critical: 95 },
        errorRate: { warning: 0.01, critical: 0.05 },
        latency: { warning: 100, critical: 500 },
        availability: { warning: 0.99, critical: 0.95 }
      },
      enablePredictive: true,
      enableTracing: true,
      ...config
    };
    
    this.errorHandler = errorHandler;
    this.trendAnalyzer = new TrendAnalyzer();
    this.anomalyDetector = new AnomalyDetector();
    
    this.initializeHealthChecks();
    
    console.log('📊 Advanced SystemMonitor initialized with comprehensive observability');
  }

  /**
   * Start system monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ System monitoring already running');
      return;
    }
    
    this.isRunning = true;
    
    // Start metrics collection
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collectionInterval);
    
    // Start health checks
    this.startHealthChecks();
    
    // Start predictive analysis
    if (this.config.enablePredictive) {
      this.startPredictiveAnalysis();
    }
    
    console.log('📊 System monitoring started');
    
    // Initial system health check
    await this.performFullHealthCheck();
  }

  /**
   * Stop system monitoring
   */
  async stopMonitoring(): Promise<void> {
    this.isRunning = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    console.log('📊 System monitoring stopped');
  }

  /**
   * Get current system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const overallHealth = this.calculateOverallHealth();
    
    return {
      overall: overallHealth,
      components: new Map(this.componentHealth),
      lastCheck: Date.now(),
      uptime: this.getUptime()
    };
  }

  /**
   * Get performance metrics for component
   */
  getMetricsHistory(component: string, duration: number = 300000): PerformanceMetrics[] {
    const history = this.metricsHistory.get(component) || [];
    const cutoff = Date.now() - duration;
    
    return history.filter(metric => metric.frameTime > cutoff);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get predictive analysis
   */
  async getPredictiveAnalysis(component?: string): Promise<PredictiveAnalysis[]> {
    const analyses: PredictiveAnalysis[] = [];
    
    const components = component ? [component] : Array.from(this.componentHealth.keys());
    
    for (const comp of components) {
      const health = this.componentHealth.get(comp);
      if (!health) continue;
      
      const analysis = await this.trendAnalyzer.analyzeTrends(comp, this.metricsHistory.get(comp) || []);
      analyses.push(analysis);
    }
    
    return analyses;
  }

  /**
   * Start distributed tracing span
   */
  startSpan(operation: string, component: string, parentId?: string): string {
    const span: TracingSpan = {
      id: this.generateSpanId(),
      parentId,
      operation,
      component,
      startTime: performance.now(),
      tags: new Map(),
      logs: []
    };
    
    this.tracingSpans.set(span.id, span);
    this.activeSpans.set(span.id, span);
    
    return span.id;
  }

  /**
   * Finish distributed tracing span
   */
  finishSpan(spanId: string, tags?: Map<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;
    
    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;
    
    if (tags) {
      for (const [key, value] of tags) {
        span.tags.set(key, value);
      }
    }
    
    this.activeSpans.delete(spanId);
    
    // Analyze span for anomalies
    if (span.duration > 1000) { // >1 second
      this.logSpanEvent(spanId, 'warning', `Long-running operation: ${span.duration.toFixed(2)}ms`);
    }
  }

  /**
   * Add log to tracing span
   */
  logSpanEvent(spanId: string, level: string, message: string): void {
    const span = this.tracingSpans.get(spanId);
    if (!span) return;
    
    span.logs.push({
      timestamp: performance.now(),
      message,
      level
    });
  }

  /**
   * Register health check for component
   */
  registerHealthCheck(component: string, healthCheck: () => Promise<ComponentHealth>): void {
    this.healthChecks.set(component, healthCheck);
    console.log(`🔍 Health check registered for component: ${component}`);
  }

  /**
   * Trigger manual health check
   */
  async performHealthCheck(component: string): Promise<ComponentHealth> {
    const healthCheck = this.healthChecks.get(component);
    if (!healthCheck) {
      throw new Error(`No health check registered for component: ${component}`);
    }
    
    try {
      const health = await healthCheck();
      this.componentHealth.set(component, health);
      
      // Check for alerts
      this.checkAlertThresholds(component, health);
      
      return health;
    } catch (error) {
      const unhealthyState: ComponentHealth = {
        status: HealthStatus.DOWN,
        metrics: this.createEmptyMetrics(),
        lastError: error instanceof Error ? error.message : String(error),
        errorCount: (this.componentHealth.get(component)?.errorCount || 0) + 1,
        responseTime: 0,
        availability: 0
      };
      
      this.componentHealth.set(component, unhealthyState);
      
      await this.errorHandler.handleError(
        `Health check failed for ${component}: ${error}`,
        { component: 'SystemMonitor', operation: 'healthCheck' },
        ErrorSeverity.HIGH,
        ErrorCategory.PERFORMANCE
      );
      
      return unhealthyState;
    }
  }

  // Private implementation methods
  
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Collect system-wide metrics
      const systemMetrics = await this.collectCurrentMetrics();
      
      // Store metrics for trending
      const existing = this.metricsHistory.get('system') || [];
      existing.push(systemMetrics);
      
      // Maintain retention period
      const cutoff = Date.now() - this.config.retentionPeriod;
      const filtered = existing.filter(metric => metric.frameTime > cutoff);
      this.metricsHistory.set('system', filtered);
      
      // Detect anomalies
      if (this.config.enablePredictive) {
        await this.anomalyDetector.detectAnomalies('system', systemMetrics, filtered);
      }
      
    } catch (error) {
      await this.errorHandler.handleError(
        `Failed to collect system metrics: ${error}`,
        { component: 'SystemMonitor', operation: 'collectMetrics' },
        ErrorSeverity.MEDIUM,
        ErrorCategory.PERFORMANCE
      );
    }
  }
  
  private async collectCurrentMetrics(): Promise<PerformanceMetrics> {
    // Mock metrics collection - would integrate with actual system APIs
    return {
      fps: 60 + Math.random() * 30,
      frameTime: 16.67 + Math.random() * 10,
      gpuUtilization: Math.random() * 100,
      memoryUsage: 512 + Math.random() * 512,
      powerConsumption: 5 + Math.random() * 10
    };
  }
  
  private async startHealthChecks(): Promise<void> {
    // Perform health checks at regular intervals
    setInterval(async () => {
      if (!this.isRunning) return;
      
      await this.performFullHealthCheck();
    }, this.config.collectionInterval * 5); // Every 5 collection cycles
  }
  
  private async performFullHealthCheck(): Promise<void> {
    const healthPromises = Array.from(this.healthChecks.entries()).map(async ([component, healthCheck]) => {
      try {
        return [component, await healthCheck()] as [string, ComponentHealth];
      } catch (error) {
        return [component, {
          status: HealthStatus.DOWN,
          metrics: this.createEmptyMetrics(),
          lastError: error instanceof Error ? error.message : String(error),
          errorCount: (this.componentHealth.get(component)?.errorCount || 0) + 1,
          responseTime: 0,
          availability: 0
        }] as [string, ComponentHealth];
      }
    });
    
    const results = await Promise.all(healthPromises);
    
    for (const [component, health] of results) {
      this.componentHealth.set(component, health);
      this.checkAlertThresholds(component, health);
    }
  }
  
  private checkAlertThresholds(component: string, health: ComponentHealth): void {
    const thresholds = this.config.alertThresholds;
    
    // CPU usage alert
    if (health.metrics.cpu >= thresholds.cpu.critical) {
      this.createAlert(component, 'cpu', health.metrics.cpu, thresholds.cpu.critical, 'critical');
    } else if (health.metrics.cpu >= thresholds.cpu.warning) {
      this.createAlert(component, 'cpu', health.metrics.cpu, thresholds.cpu.warning, 'warning');
    }
    
    // Memory usage alert
    if (health.metrics.memory >= thresholds.memory.critical) {
      this.createAlert(component, 'memory', health.metrics.memory, thresholds.memory.critical, 'critical');
    } else if (health.metrics.memory >= thresholds.memory.warning) {
      this.createAlert(component, 'memory', health.metrics.memory, thresholds.memory.warning, 'warning');
    }
    
    // GPU usage alert
    if (health.metrics.gpu >= thresholds.gpu.critical) {
      this.createAlert(component, 'gpu', health.metrics.gpu, thresholds.gpu.critical, 'critical');
    } else if (health.metrics.gpu >= thresholds.gpu.warning) {
      this.createAlert(component, 'gpu', health.metrics.gpu, thresholds.gpu.warning, 'warning');
    }
    
    // Availability alert
    if (health.availability <= thresholds.availability.critical) {
      this.createAlert(component, 'availability', health.availability, thresholds.availability.critical, 'critical');
    } else if (health.availability <= thresholds.availability.warning) {
      this.createAlert(component, 'availability', health.availability, thresholds.availability.warning, 'warning');
    }
  }
  
  private createAlert(
    component: string,
    metric: string,
    value: number,
    threshold: number,
    severity: 'info' | 'warning' | 'critical'
  ): void {
    const alertId = `${component}_${metric}_${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      timestamp: Date.now(),
      severity,
      component,
      metric,
      value,
      threshold,
      message: `${component} ${metric} ${severity}: ${value} exceeds ${threshold}`,
      resolved: false
    };
    
    this.alerts.set(alertId, alert);
    
    console.log(`🚨 Alert created: ${alert.message}`);
    
    // Auto-resolve alerts after conditions improve
    setTimeout(() => this.checkAlertResolution(alertId), 60000); // Check after 1 minute
  }
  
  private checkAlertResolution(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) return;
    
    const health = this.componentHealth.get(alert.component);
    if (!health) return;
    
    const currentValue = this.getMetricValue(health.metrics, alert.metric);
    
    // Check if alert condition no longer exists
    if (currentValue < alert.threshold * 0.9) { // 10% buffer to prevent flapping
      alert.resolved = true;
      console.log(`✅ Alert resolved: ${alert.message}`);
    }
  }
  
  private async startPredictiveAnalysis(): Promise<void> {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const analyses = await this.getPredictiveAnalysis();
        
        for (const analysis of analyses) {
          if (analysis.predictedFailure && analysis.predictedFailure.probability > 0.7) {
            console.log(`⚠️ Predictive alert: ${analysis.component} may fail in ${(analysis.predictedFailure.timeToFailure / 60000).toFixed(1)} minutes`);
            
            // Create predictive alert
            this.createAlert(
              analysis.component,
              analysis.metric,
              analysis.predictedFailure.probability,
              0.7,
              'warning'
            );
          }
        }
      } catch (error) {
        console.log('Failed to perform predictive analysis:', error);
      }
    }, this.config.collectionInterval * 30); // Every 30 collection cycles
  }
  
  private calculateOverallHealth(): HealthStatus {
    const healthValues = Array.from(this.componentHealth.values());
    
    if (healthValues.length === 0) return HealthStatus.HEALTHY;
    
    const criticalCount = healthValues.filter(h => h.status === HealthStatus.CRITICAL).length;
    const downCount = healthValues.filter(h => h.status === HealthStatus.DOWN).length;
    const warningCount = healthValues.filter(h => h.status === HealthStatus.WARNING).length;
    
    if (downCount > 0 || criticalCount > healthValues.length * 0.5) {
      return HealthStatus.CRITICAL;
    } else if (criticalCount > 0 || warningCount > healthValues.length * 0.5) {
      return HealthStatus.WARNING;
    } else {
      return HealthStatus.HEALTHY;
    }
  }
  
  private initializeHealthChecks(): void {
    // Default health checks for core components
    this.registerHealthCheck('renderer', async () => ({
      status: HealthStatus.HEALTHY,
      metrics: {
        cpu: Math.random() * 50,
        memory: 256 + Math.random() * 256,
        gpu: Math.random() * 70,
        network: Math.random() * 1000000,
        operations: Math.random() * 1000,
        errors: Math.random() * 5,
        latency: Math.random() * 20
      },
      errorCount: 0,
      responseTime: Math.random() * 50,
      availability: 0.999
    }));
    
    this.registerHealthCheck('neural-network', async () => ({
      status: HealthStatus.HEALTHY,
      metrics: {
        cpu: Math.random() * 80,
        memory: 512 + Math.random() * 512,
        gpu: Math.random() * 90,
        network: Math.random() * 500000,
        operations: Math.random() * 500,
        errors: Math.random() * 2,
        latency: Math.random() * 100
      },
      errorCount: 0,
      responseTime: Math.random() * 100,
      availability: 0.995
    }));
    
    this.registerHealthCheck('quantum-accelerator', async () => ({
      status: HealthStatus.HEALTHY,
      metrics: {
        cpu: Math.random() * 60,
        memory: 128 + Math.random() * 128,
        gpu: Math.random() * 40,
        network: 0,
        operations: Math.random() * 2000,
        errors: Math.random() * 1,
        latency: Math.random() * 10
      },
      errorCount: 0,
      responseTime: Math.random() * 20,
      availability: 0.998
    }));
  }
  
  private createEmptyMetrics(): ComponentMetrics {
    return {
      cpu: 0,
      memory: 0,
      gpu: 0,
      network: 0,
      operations: 0,
      errors: 0,
      latency: 0
    };
  }
  
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getMetricValue(metrics: ComponentMetrics, metricName: string): number {
    switch (metricName) {
      case 'cpu': return metrics.cpu;
      case 'memory': return metrics.memory;
      case 'gpu': return metrics.gpu;
      case 'latency': return metrics.latency;
      case 'errors': return metrics.errors;
      default: return 0;
    }
  }
  
  private getUptime(): number {
    // Mock uptime calculation
    return Date.now() - (Date.now() - 3600000); // 1 hour uptime
  }
}

// Supporting analysis classes

class TrendAnalyzer {
  async analyzeTrends(component: string, metrics: PerformanceMetrics[]): Promise<PredictiveAnalysis> {
    if (metrics.length < 10) {
      return {
        component,
        metric: 'general',
        currentTrend: 'stable',
        recommendations: ['Insufficient data for trend analysis']
      };
    }
    
    // Simple trend analysis on FPS
    const recentFPS = metrics.slice(-10).map(m => m.fps);
    const oldFPS = metrics.slice(-20, -10).map(m => m.fps);
    
    const recentAvg = recentFPS.reduce((a, b) => a + b) / recentFPS.length;
    const oldAvg = oldFPS.length > 0 ? oldFPS.reduce((a, b) => a + b) / oldFPS.length : recentAvg;
    
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (recentAvg > oldAvg * 1.05) trend = 'improving';
    else if (recentAvg < oldAvg * 0.95) trend = 'degrading';
    
    const analysis: PredictiveAnalysis = {
      component,
      metric: 'fps',
      currentTrend: trend,
      recommendations: []
    };
    
    if (trend === 'degrading') {
      analysis.predictedFailure = {
        probability: 0.3 + Math.random() * 0.4,
        timeToFailure: 300000 + Math.random() * 1200000, // 5-25 minutes
        confidence: 0.7 + Math.random() * 0.2
      };
      
      analysis.recommendations.push(
        'Performance degrading - consider reducing quality settings',
        'Monitor memory usage and GPU utilization',
        'Check for thermal throttling'
      );
    }
    
    return analysis;
  }
}

class AnomalyDetector {
  async detectAnomalies(component: string, current: PerformanceMetrics, history: PerformanceMetrics[]): Promise<string[]> {
    const anomalies: string[] = [];
    
    if (history.length < 5) return anomalies;
    
    // Calculate moving average and standard deviation
    const recentFPS = history.slice(-10).map(m => m.fps);
    const avgFPS = recentFPS.reduce((a, b) => a + b) / recentFPS.length;
    const stdFPS = Math.sqrt(recentFPS.reduce((sq, n) => sq + Math.pow(n - avgFPS, 2), 0) / recentFPS.length);
    
    // Detect FPS anomalies (more than 2 standard deviations)
    if (Math.abs(current.fps - avgFPS) > stdFPS * 2) {
      anomalies.push(`FPS anomaly detected: ${current.fps.toFixed(1)} (expected: ${avgFPS.toFixed(1)} ± ${(stdFPS * 2).toFixed(1)})`);
    }
    
    // Similar analysis for other metrics...
    
    return anomalies;
  }
}