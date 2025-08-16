/**
 * Comprehensive NeRF System Monitoring
 * Generation 2 Enhancement: Advanced monitoring, logging, and alerting
 */

export interface MetricsSnapshot {
  timestamp: number;
  performance: {
    fps: number;
    frameTime: number;
    renderTime: number;
    gpuUtilization: number;
    cpuUtilization: number;
  };
  memory: {
    used: number;
    available: number;
    textures: number;
    buffers: number;
    models: number;
  };
  quality: {
    renderQuality: number;
    foveationLevel: number;
    lodLevel: number;
    cullingRate: number;
  };
  errors: {
    count: number;
    severity: 'low' | 'medium' | 'high';
    lastError?: string;
  };
  system: {
    temperature?: number;
    powerConsumption: number;
    batteryLevel?: number;
    networkLatency?: number;
  };
}

export interface Alert {
  id: string;
  type: 'performance' | 'memory' | 'error' | 'system';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  data: any;
  acknowledged: boolean;
  resolved: boolean;
}

export interface MonitoringConfig {
  /** Enable detailed monitoring */
  enabled: boolean;
  /** Metrics collection interval (ms) */
  collectionInterval: number;
  /** Number of snapshots to retain */
  historySize: number;
  /** Enable real-time alerting */
  alerting: boolean;
  /** Alert thresholds */
  thresholds: {
    minFPS: number;
    maxFrameTime: number;
    maxMemoryUsage: number;
    maxErrorRate: number;
    maxTemperature?: number;
  };
  /** Export metrics to external systems */
  export: {
    enabled: boolean;
    endpoints: string[];
    format: 'prometheus' | 'json' | 'csv';
  };
}

/**
 * Comprehensive system monitoring for NeRF applications
 */
export class ComprehensiveMonitor {
  private config: MonitoringConfig;
  private metricsHistory: MetricsSnapshot[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private monitoringTimer: number | null = null;
  private alertCounter = 0;
  
  // Data sources
  private performanceObserver: PerformanceObserver | null = null;
  private memoryObserver: any = null;
  
  // Metrics aggregation
  private metricsBuffer: Partial<MetricsSnapshot>[] = [];
  private lastExportTime = 0;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enabled: true,
      collectionInterval: 1000, // 1 second
      historySize: 300, // 5 minutes at 1s intervals
      alerting: true,
      thresholds: {
        minFPS: 30,
        maxFrameTime: 33, // 30 FPS
        maxMemoryUsage: 2048, // 2GB
        maxErrorRate: 0.1, // 10% error rate
        maxTemperature: 70 // 70°C
      },
      export: {
        enabled: false,
        endpoints: [],
        format: 'json'
      },
      ...config
    };

    if (this.config.enabled) {
      this.initializeMonitoring();
    }
  }

  /**
   * Initialize monitoring systems
   */
  private initializeMonitoring(): void {
    console.log('📊 Initializing comprehensive monitoring system');
    
    // Setup performance observation
    this.setupPerformanceObservation();
    
    // Setup memory monitoring
    this.setupMemoryMonitoring();
    
    // Start metrics collection
    this.startMetricsCollection();
    
    console.log('✅ Comprehensive monitoring initialized');
  }

  /**
   * Start real-time monitoring
   */
  start(): void {
    if (!this.config.enabled || this.monitoringTimer) return;
    
    this.monitoringTimer = window.setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);
    
    console.log('🚀 Started real-time monitoring');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    console.log('⏹️ Stopped monitoring');
  }

  /**
   * Update system metrics from external sources
   */
  updateMetrics(_source: string, metrics: Partial<MetricsSnapshot>): void {
    const snapshot: MetricsSnapshot = {
      timestamp: Date.now(),
      performance: {
        fps: 0,
        frameTime: 0,
        renderTime: 0,
        gpuUtilization: 0,
        cpuUtilization: 0,
        ...metrics.performance
      },
      memory: {
        used: 0,
        available: 0,
        textures: 0,
        buffers: 0,
        models: 0,
        ...metrics.memory
      },
      quality: {
        renderQuality: 1.0,
        foveationLevel: 0,
        lodLevel: 0,
        cullingRate: 0,
        ...metrics.quality
      },
      errors: {
        count: 0,
        severity: 'low',
        ...metrics.errors
      },
      system: {
        powerConsumption: 0,
        ...metrics.system
      }
    };

    this.processSnapshot(snapshot);
  }

  /**
   * Report an error for monitoring
   */
  reportError(error: Error, context: string, severity: 'low' | 'medium' | 'high' = 'medium'): void {
    console.error(`📊 Monitoring error report: ${context}`, error);
    
    // Update error metrics
    this.updateMetrics('error-reporter', {
      errors: {
        count: 1,
        severity,
        lastError: error.message
      }
    });
    
    // Generate alert if necessary
    if (severity === 'high' || (severity === 'medium' && this.shouldAlertOnError())) {
      this.generateAlert('error', severity === 'high' ? 'critical' : 'warning', 
        `Error in ${context}: ${error.message}`, { error: error.message, context });
    }
  }

  /**
   * Get current system status
   */
  getSystemStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: MetricsSnapshot | null;
    alerts: Alert[];
    summary: any;
  } {
    const latestMetrics = this.getLatestMetrics();
    const activeAlerts = Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved);
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (activeAlerts.some(alert => alert.severity === 'critical')) {
      status = 'critical';
    } else if (activeAlerts.length > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      metrics: latestMetrics,
      alerts: activeAlerts,
      summary: this.generateStatusSummary(latestMetrics, activeAlerts)
    };
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics(timeRange: { start: number; end: number }): MetricsSnapshot[] {
    return this.metricsHistory.filter(snapshot => 
      snapshot.timestamp >= timeRange.start && snapshot.timestamp <= timeRange.end
    );
  }

  /**
   * Get performance analytics
   */
  getAnalytics(): {
    averages: {
      fps: number;
      frameTime: number;
      memoryUsage: number;
      errorRate: number;
    };
    trends: {
      performance: 'improving' | 'stable' | 'degrading';
      memory: 'increasing' | 'stable' | 'decreasing';
      quality: 'improving' | 'stable' | 'degrading';
    };
    recommendations: string[];
  } {
    if (this.metricsHistory.length === 0) {
      return {
        averages: { fps: 0, frameTime: 0, memoryUsage: 0, errorRate: 0 },
        trends: { performance: 'stable', memory: 'stable', quality: 'stable' },
        recommendations: ['Start monitoring to get analytics']
      };
    }
    
    const recentMetrics = this.metricsHistory.slice(-60); // Last minute
    
    const averages = this.calculateAverages(recentMetrics);
    const trends = this.calculateTrends();
    const recommendations = this.generateRecommendations(averages, trends);
    
    return { averages, trends, recommendations };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.timestamp = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.timestamp = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Export metrics for external systems
   */
  async exportMetrics(format?: 'prometheus' | 'json' | 'csv'): Promise<string> {
    const exportFormat = format || this.config.export.format;
    const latestMetrics = this.getLatestMetrics();
    
    if (!latestMetrics) {
      return '';
    }
    
    switch (exportFormat) {
      case 'prometheus':
        return this.formatPrometheusMetrics(latestMetrics);
      case 'csv':
        return this.formatCSVMetrics([latestMetrics]);
      case 'json':
      default:
        return JSON.stringify(latestMetrics, null, 2);
    }
  }

  // Private implementation methods
  
  private setupPerformanceObservation(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processPerformanceEntries(entries);
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }
  }

  private setupMemoryMonitoring(): void {
    // Setup memory monitoring if available
    if ('memory' in performance) {
      this.memoryObserver = setInterval(() => {
        this.collectMemoryMetrics();
      }, this.config.collectionInterval);
    }
  }

  private startMetricsCollection(): void {
    this.start();
  }

  private collectMetrics(): void {
    const snapshot: MetricsSnapshot = {
      timestamp: Date.now(),
      performance: this.collectPerformanceMetrics(),
      memory: this.collectMemoryMetrics(),
      quality: this.collectQualityMetrics(),
      errors: this.collectErrorMetrics(),
      system: this.collectSystemMetrics()
    };
    
    this.processSnapshot(snapshot);
  }

  private processSnapshot(snapshot: MetricsSnapshot): void {
    // Add to history
    this.metricsHistory.push(snapshot);
    
    // Limit history size
    if (this.metricsHistory.length > this.config.historySize) {
      this.metricsHistory.shift();
    }
    
    // Check for alert conditions
    if (this.config.alerting) {
      this.checkAlertConditions(snapshot);
    }
    
    // Export metrics if configured
    if (this.config.export.enabled) {
      this.maybeExportMetrics(snapshot);
    }
  }

  private collectPerformanceMetrics(): MetricsSnapshot['performance'] {
    return {
      fps: this.getCurrentFPS(),
      frameTime: this.getCurrentFrameTime(),
      renderTime: this.getCurrentRenderTime(),
      gpuUtilization: this.getGPUUtilization(),
      cpuUtilization: this.getCPUUtilization()
    };
  }

  private collectMemoryMetrics(): MetricsSnapshot['memory'] {
    const memInfo = this.getMemoryInfo();
    return {
      used: memInfo.used,
      available: memInfo.available,
      textures: memInfo.textures || 0,
      buffers: memInfo.buffers || 0,
      models: memInfo.models || 0
    };
  }

  private collectQualityMetrics(): MetricsSnapshot['quality'] {
    return {
      renderQuality: 1.0, // Would be provided by renderer
      foveationLevel: 0.5,
      lodLevel: 0.0,
      cullingRate: 0.3
    };
  }

  private collectErrorMetrics(): MetricsSnapshot['errors'] {
    // This would track errors from the last collection period
    return {
      count: 0,
      severity: 'low'
    };
  }

  private collectSystemMetrics(): MetricsSnapshot['system'] {
    return {
      powerConsumption: this.estimatePowerConsumption(),
      temperature: this.getSystemTemperature() || undefined,
      batteryLevel: this.getBatteryLevel() || undefined,
      networkLatency: this.getNetworkLatency() || undefined
    };
  }

  private checkAlertConditions(snapshot: MetricsSnapshot): void {
    const { thresholds } = this.config;
    
    // FPS alerts
    if (snapshot.performance.fps < thresholds.minFPS) {
      this.generateAlert('performance', 'warning', 
        `Low FPS: ${snapshot.performance.fps.toFixed(1)} < ${thresholds.minFPS}`,
        { fps: snapshot.performance.fps, threshold: thresholds.minFPS });
    }
    
    // Frame time alerts
    if (snapshot.performance.frameTime > thresholds.maxFrameTime) {
      this.generateAlert('performance', 'warning',
        `High frame time: ${snapshot.performance.frameTime.toFixed(1)}ms > ${thresholds.maxFrameTime}ms`,
        { frameTime: snapshot.performance.frameTime, threshold: thresholds.maxFrameTime });
    }
    
    // Memory alerts
    if (snapshot.memory.used > thresholds.maxMemoryUsage) {
      this.generateAlert('memory', 'critical',
        `High memory usage: ${snapshot.memory.used}MB > ${thresholds.maxMemoryUsage}MB`,
        { memoryUsage: snapshot.memory.used, threshold: thresholds.maxMemoryUsage });
    }
    
    // Temperature alerts
    if (thresholds.maxTemperature && snapshot.system.temperature && 
        snapshot.system.temperature > thresholds.maxTemperature) {
      this.generateAlert('system', 'critical',
        `High temperature: ${snapshot.system.temperature}°C > ${thresholds.maxTemperature}°C`,
        { temperature: snapshot.system.temperature, threshold: thresholds.maxTemperature });
    }
  }

  private generateAlert(type: Alert['type'], severity: Alert['severity'], message: string, data: any): void {
    const alertId = `${type}-${Date.now()}-${++this.alertCounter}`;
    
    const alert: Alert = {
      id: alertId,
      type,
      severity,
      message,
      timestamp: Date.now(),
      data,
      acknowledged: false,
      resolved: false
    };
    
    this.activeAlerts.set(alertId, alert);
    
    console.warn(`🚨 Alert [${severity.toUpperCase()}] ${type}: ${message}`);
    
    // Auto-acknowledge info alerts
    if (severity === 'info') {
      setTimeout(() => this.acknowledgeAlert(alertId), 5000);
    }
  }

  // Helper methods for metric collection
  
  private getCurrentFPS(): number {
    // Would integrate with actual renderer
    return 60 + (Math.random() - 0.5) * 10;
  }

  private getCurrentFrameTime(): number {
    return 1000 / this.getCurrentFPS();
  }

  private getCurrentRenderTime(): number {
    return this.getCurrentFrameTime() * 0.8; // Assume 80% of frame time is rendering
  }

  private getGPUUtilization(): number {
    return Math.random() * 0.8; // Mock GPU utilization
  }

  private getCPUUtilization(): number {
    return Math.random() * 0.6; // Mock CPU utilization
  }

  private getMemoryInfo(): { used: number; available: number; textures?: number; buffers?: number; models?: number } {
    if ('memory' in performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        used: mem.usedJSHeapSize / 1024 / 1024, // Convert to MB
        available: mem.totalJSHeapSize / 1024 / 1024,
        textures: Math.random() * 200,
        buffers: Math.random() * 100,
        models: Math.random() * 50
      };
    }
    
    return {
      used: Math.random() * 1000,
      available: 2048
    };
  }

  private estimatePowerConsumption(): number {
    return 5 + Math.random() * 3; // Mock power consumption in watts
  }

  private getSystemTemperature(): number | undefined {
    return 45 + Math.random() * 20; // Mock temperature
  }

  private getBatteryLevel(): number | undefined {
    return Math.random() * 100; // Mock battery percentage
  }

  private getNetworkLatency(): number | undefined {
    return 20 + Math.random() * 30; // Mock network latency in ms
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    // Process performance entries from PerformanceObserver
    entries.forEach(entry => {
      if (entry.entryType === 'measure' && entry.name.includes('nerf')) {
        // Track NeRF-specific performance measures
        this.metricsBuffer.push({
          performance: {
            renderTime: entry.duration,
            frameTime: entry.duration,
            fps: 1000 / entry.duration,
            gpuUtilization: 0,
            cpuUtilization: 0
          }
        });
      }
    });
  }

  private shouldAlertOnError(): boolean {
    // Implement error rate threshold checking
    const recentErrors = this.metricsHistory
      .slice(-10)
      .reduce((sum, snapshot) => sum + snapshot.errors.count, 0);
    
    return recentErrors / 10 > this.config.thresholds.maxErrorRate;
  }

  private getLatestMetrics(): MetricsSnapshot | null {
    return this.metricsHistory.length > 0 ? 
      this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  private calculateAverages(metrics: MetricsSnapshot[]): any {
    if (metrics.length === 0) return { fps: 0, frameTime: 0, memoryUsage: 0, errorRate: 0 };
    
    return {
      fps: metrics.reduce((sum, m) => sum + m.performance.fps, 0) / metrics.length,
      frameTime: metrics.reduce((sum, m) => sum + m.performance.frameTime, 0) / metrics.length,
      memoryUsage: metrics.reduce((sum, m) => sum + m.memory.used, 0) / metrics.length,
      errorRate: metrics.reduce((sum, m) => sum + m.errors.count, 0) / metrics.length
    };
  }

  private calculateTrends(): any {
    if (this.metricsHistory.length < 20) {
      return { performance: 'stable', memory: 'stable', quality: 'stable' };
    }
    
    const recent = this.metricsHistory.slice(-10);
    const older = this.metricsHistory.slice(-20, -10);
    
    const recentFPS = recent.reduce((sum, m) => sum + m.performance.fps, 0) / recent.length;
    const olderFPS = older.reduce((sum, m) => sum + m.performance.fps, 0) / older.length;
    
    const recentMemory = recent.reduce((sum, m) => sum + m.memory.used, 0) / recent.length;
    const olderMemory = older.reduce((sum, m) => sum + m.memory.used, 0) / older.length;
    
    return {
      performance: recentFPS > olderFPS * 1.05 ? 'improving' : 
                  recentFPS < olderFPS * 0.95 ? 'degrading' : 'stable',
      memory: recentMemory > olderMemory * 1.05 ? 'increasing' : 
             recentMemory < olderMemory * 0.95 ? 'decreasing' : 'stable',
      quality: 'stable' // Would be calculated based on quality metrics
    };
  }

  private generateRecommendations(averages: any, trends: any): string[] {
    const recommendations: string[] = [];
    
    if (averages.fps < 30) {
      recommendations.push('Consider enabling adaptive quality or foveated rendering');
    }
    
    if (trends.memory === 'increasing') {
      recommendations.push('Monitor for memory leaks - consider periodic cleanup');
    }
    
    if (trends.performance === 'degrading') {
      recommendations.push('Performance is degrading - review recent changes');
    }
    
    if (averages.memoryUsage > 1000) {
      recommendations.push('High memory usage - consider optimizing models or enabling LOD');
    }
    
    return recommendations;
  }

  private generateStatusSummary(metrics: MetricsSnapshot | null, alerts: Alert[]): any {
    return {
      uptime: metrics ? Date.now() - (this.metricsHistory[0]?.timestamp || Date.now()) : 0,
      alertCount: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      dataPoints: this.metricsHistory.length,
      lastUpdate: metrics?.timestamp || 0
    };
  }

  private maybeExportMetrics(snapshot: MetricsSnapshot): void {
    const now = Date.now();
    if (now - this.lastExportTime > 60000) { // Export every minute
      this.lastExportTime = now;
      this.exportToEndpoints(snapshot);
    }
  }

  private async exportToEndpoints(_snapshot: MetricsSnapshot): Promise<void> {
    for (const endpoint of this.config.export.endpoints) {
      try {
        const data = await this.exportMetrics();
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data
        });
      } catch (error) {
        console.error(`Failed to export metrics to ${endpoint}:`, error);
      }
    }
  }

  private formatPrometheusMetrics(snapshot: MetricsSnapshot): string {
    const timestamp = snapshot.timestamp;
    return `
# HELP nerf_fps Frames per second
# TYPE nerf_fps gauge
nerf_fps ${snapshot.performance.fps} ${timestamp}

# HELP nerf_frame_time Frame time in milliseconds
# TYPE nerf_frame_time gauge
nerf_frame_time ${snapshot.performance.frameTime} ${timestamp}

# HELP nerf_memory_used Memory usage in MB
# TYPE nerf_memory_used gauge
nerf_memory_used ${snapshot.memory.used} ${timestamp}

# HELP nerf_power_consumption Power consumption in watts
# TYPE nerf_power_consumption gauge
nerf_power_consumption ${snapshot.system.powerConsumption} ${timestamp}
`.trim();
  }

  private formatCSVMetrics(snapshots: MetricsSnapshot[]): string {
    const headers = ['timestamp', 'fps', 'frameTime', 'memoryUsed', 'powerConsumption'];
    const rows = snapshots.map(s => [
      s.timestamp,
      s.performance.fps,
      s.performance.frameTime,
      s.memory.used,
      s.system.powerConsumption
    ].join(','));
    
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.stop();
    
    if (this.memoryObserver) {
      clearInterval(this.memoryObserver);
    }
    
    this.metricsHistory.length = 0;
    this.activeAlerts.clear();
    
    console.log('🧹 Comprehensive monitor disposed');
  }
}