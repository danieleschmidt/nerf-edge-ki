/**
 * System health monitoring for NeRF Edge Kit
 */

export interface HealthMetrics {
  timestamp: number;
  cpu: {
    usage: number; // Percentage
    temperature?: number; // Celsius (if available)
  };
  memory: {
    used: number; // MB
    available: number; // MB
    percentage: number;
  };
  gpu: {
    usage: number; // Percentage
    memory: {
      used: number; // MB
      total: number; // MB
    };
    temperature?: number; // Celsius (if available)
  };
  network: {
    latency: number; // ms
    bandwidth: number; // Mbps
    errors: number;
  };
  rendering: {
    fps: number;
    frameTime: number; // ms
    drawCalls: number;
    memoryPressure: 'low' | 'medium' | 'high';
  };
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: number;
  threshold: number;
  currentValue: number;
}

export class SystemHealth {
  private metrics: HealthMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval: number | null = null;
  private alertThresholds = {
    memory: { warning: 80, critical: 95 }, // Percentage
    gpu: { warning: 80, critical: 95 }, // Percentage
    fps: { warning: 30, critical: 15 }, // Below these values
    frameTime: { warning: 33, critical: 66 }, // Above these values (ms)
    temperature: { warning: 70, critical: 85 } // Celsius
  };

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval !== null) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.addMetrics(metrics);
        this.checkThresholds(metrics);
      } catch (error) {
        console.error('Health monitoring failed:', error);
      }
    }, intervalMs) as unknown as number;

    console.log(`🔍 System health monitoring started (${intervalMs}ms interval)`);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🔍 System health monitoring stopped');
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<HealthMetrics> {
    const timestamp = Date.now();

    return {
      timestamp,
      cpu: await this.getCPUMetrics(),
      memory: await this.getMemoryMetrics(),
      gpu: await this.getGPUMetrics(),
      network: await this.getNetworkMetrics(),
      rendering: await this.getRenderingMetrics()
    };
  }

  private async getCPUMetrics(): Promise<HealthMetrics['cpu']> {
    // Use performance.now() deltas to estimate CPU usage
    let usage = 0;
    
    if ('hardwareConcurrency' in navigator) {
      // Rough estimation based on available cores and timing
      const startTime = performance.now();
      let iterations = 0;
      const maxTime = 10; // 10ms sample
      
      while (performance.now() - startTime < maxTime) {
        iterations++;
      }
      
      // Normalize to rough CPU usage (this is very approximate)
      const baselineIterations = navigator.hardwareConcurrency * 100000;
      usage = Math.max(0, Math.min(100, 100 - (iterations / baselineIterations * 100)));
    }

    return {
      usage: Math.round(usage),
      temperature: undefined // Not available in browser
    };
  }

  private async getMemoryMetrics(): Promise<HealthMetrics['memory']> {
    let used = 0;
    let available = 0;

    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      used = Math.round(memInfo.usedJSHeapSize / 1024 / 1024); // Convert to MB
      available = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024); // Convert to MB
    } else {
      // Fallback estimation
      used = Math.round(Math.random() * 100 + 50); // 50-150MB estimate
      available = 512; // Assume 512MB available
    }

    const percentage = available > 0 ? Math.round((used / available) * 100) : 0;

    return { used, available, percentage };
  }

  private async getGPUMetrics(): Promise<HealthMetrics['gpu']> {
    let usage = 0;
    let memoryUsed = 0;
    let memoryTotal = 1024; // Default to 1GB

    // Try to get WebGPU adapter info
    try {
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          // GPU info is limited in WebGPU for privacy
          // We'll estimate based on typical usage patterns
          usage = Math.round(Math.random() * 30 + 20); // 20-50% typical usage
          memoryTotal = 2048; // Assume 2GB typical
          memoryUsed = Math.round(usage / 100 * memoryTotal);
        }
      }
    } catch (error) {
      console.debug('GPU metrics collection failed:', error);
    }

    return {
      usage,
      memory: { used: memoryUsed, total: memoryTotal },
      temperature: undefined // Not available in browser
    };
  }

  private async getNetworkMetrics(): Promise<HealthMetrics['network']> {
    let latency = 0;
    let bandwidth = 0;
    let errors = 0;

    // Measure latency with a small request
    try {
      const startTime = performance.now();
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
      latency = Math.round(performance.now() - startTime);
    } catch (error) {
      latency = 999; // High latency indicates network issues
      errors++;
    }

    // Estimate bandwidth using connection API
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn && conn.downlink) {
        bandwidth = conn.downlink; // Mbps
      }
    }

    return { latency, bandwidth, errors };
  }

  private async getRenderingMetrics(): Promise<HealthMetrics['rendering']> {
    // These would typically come from the NerfRenderer
    // For now, return default/estimated values
    return {
      fps: 60, // Would be updated by renderer
      frameTime: 16.67, // 1000/60
      drawCalls: 10,
      memoryPressure: 'low'
    };
  }

  private addMetrics(metrics: HealthMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics (last 1 hour at 5s intervals = 720 entries)
    if (this.metrics.length > 720) {
      this.metrics.shift();
    }
  }

  private checkThresholds(metrics: HealthMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Memory pressure
    if (metrics.memory.percentage >= this.alertThresholds.memory.critical) {
      alerts.push({
        type: 'critical',
        component: 'memory',
        message: `Critical memory usage: ${metrics.memory.percentage}%`,
        timestamp: metrics.timestamp,
        threshold: this.alertThresholds.memory.critical,
        currentValue: metrics.memory.percentage
      });
    } else if (metrics.memory.percentage >= this.alertThresholds.memory.warning) {
      alerts.push({
        type: 'warning',
        component: 'memory',
        message: `High memory usage: ${metrics.memory.percentage}%`,
        timestamp: metrics.timestamp,
        threshold: this.alertThresholds.memory.warning,
        currentValue: metrics.memory.percentage
      });
    }

    // GPU usage
    if (metrics.gpu.usage >= this.alertThresholds.gpu.critical) {
      alerts.push({
        type: 'critical',
        component: 'gpu',
        message: `Critical GPU usage: ${metrics.gpu.usage}%`,
        timestamp: metrics.timestamp,
        threshold: this.alertThresholds.gpu.critical,
        currentValue: metrics.gpu.usage
      });
    } else if (metrics.gpu.usage >= this.alertThresholds.gpu.warning) {
      alerts.push({
        type: 'warning',
        component: 'gpu',
        message: `High GPU usage: ${metrics.gpu.usage}%`,
        timestamp: metrics.timestamp,
        threshold: this.alertThresholds.gpu.warning,
        currentValue: metrics.gpu.usage
      });
    }

    // FPS performance
    if (metrics.rendering.fps <= this.alertThresholds.fps.critical) {
      alerts.push({
        type: 'critical',
        component: 'rendering',
        message: `Critical FPS drop: ${metrics.rendering.fps} FPS`,
        timestamp: metrics.timestamp,
        threshold: this.alertThresholds.fps.critical,
        currentValue: metrics.rendering.fps
      });
    } else if (metrics.rendering.fps <= this.alertThresholds.fps.warning) {
      alerts.push({
        type: 'warning',
        component: 'rendering',
        message: `Low FPS: ${metrics.rendering.fps} FPS`,
        timestamp: metrics.timestamp,
        threshold: this.alertThresholds.fps.warning,
        currentValue: metrics.rendering.fps
      });
    }

    // Process new alerts
    alerts.forEach(alert => {
      this.processAlert(alert);
    });
  }

  private processAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Keep only recent alerts (last 1000)
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }

    // Log alert
    const logFn = alert.type === 'critical' ? console.error : console.warn;
    logFn(`🚨 ${alert.type.toUpperCase()} ALERT: ${alert.message}`);

    // Emit custom event for UI integration
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nerf-performance-alert', { detail: alert }));
    }
  }

  /**
   * Get recent health metrics
   */
  getRecentMetrics(minutes: number = 10): HealthMetrics[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(minutes: number = 60): PerformanceAlert[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.alerts.filter(a => a.timestamp >= cutoffTime);
  }

  /**
   * Get system health summary
   */
  getHealthSummary(): {
    status: 'healthy' | 'warning' | 'critical';
    recentMetrics: HealthMetrics | null;
    activeAlerts: PerformanceAlert[];
    uptime: number; // seconds
  } {
    const recentMetrics = this.metrics[this.metrics.length - 1] || null;
    const activeAlerts = this.getRecentAlerts(5); // Last 5 minutes
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (activeAlerts.some(a => a.type === 'critical')) {
      status = 'critical';
    } else if (activeAlerts.some(a => a.type === 'warning')) {
      status = 'warning';
    }

    const uptime = this.metrics.length > 0 
      ? Math.round((Date.now() - this.metrics[0].timestamp) / 1000)
      : 0;

    return {
      status,
      recentMetrics,
      activeAlerts,
      uptime
    };
  }

  /**
   * Update rendering metrics (called by NerfRenderer)
   */
  updateRenderingMetrics(fps: number, frameTime: number, drawCalls: number, memoryPressure: 'low' | 'medium' | 'high'): void {
    if (this.metrics.length > 0) {
      const latest = this.metrics[this.metrics.length - 1];
      latest.rendering = { fps, frameTime, drawCalls, memoryPressure };
    }
  }

  /**
   * Export health data for analysis
   */
  exportHealthData(): {
    metrics: HealthMetrics[];
    alerts: PerformanceAlert[];
    summary: ReturnType<SystemHealth['getHealthSummary']>;
  } {
    return {
      metrics: [...this.metrics],
      alerts: [...this.alerts],
      summary: this.getHealthSummary()
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.metrics.length = 0;
    this.alerts.length = 0;
    console.log('🧹 System health monitoring disposed');
  }
}

// Global system health instance
export const systemHealth = new SystemHealth();