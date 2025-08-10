/**
 * Intelligent auto-scaling system for NeRF rendering workloads
 */

export interface ScalingMetrics {
  cpu: number;
  gpu: number;
  memory: number;
  networkIO: number;
  fps: number;
  latency: number;
  queueDepth: number;
  errorRate: number;
}

export interface ScalingTarget {
  minFPS: number;
  maxLatency: number;
  targetGpuUtilization: number;
  maxMemoryUsage: number;
}

export interface ScalingAction {
  type: 'scale_quality' | 'scale_workers' | 'scale_cache' | 'scale_resolution';
  direction: 'up' | 'down';
  magnitude: number;
  reason: string;
  timestamp: number;
}

export interface WorkerPool {
  active: number;
  idle: number;
  max: number;
  min: number;
}

export class AutoScaler {
  private targets: ScalingTarget;
  private metrics: ScalingMetrics;
  private workers: WorkerPool;
  private scalingHistory: ScalingAction[] = [];
  private cooldownPeriod = 10000; // 10 seconds between scaling actions
  private lastScalingTime = 0;
  
  // Dynamic scaling parameters
  private currentQuality: 'low' | 'medium' | 'high' = 'medium';
  private currentResolution: [number, number] = [1920, 1080];
  private adaptiveCacheSize = 512; // MB
  
  // Performance prediction
  private performanceModel: Map<string, number> = new Map();
  private metricHistory: ScalingMetrics[] = [];
  
  constructor(targets: ScalingTarget) {
    this.targets = targets;
    this.metrics = this.initializeMetrics();
    this.workers = {
      active: 2,
      idle: 0,
      max: 8,
      min: 1
    };
    
    this.setupMonitoring();
  }

  /**
   * Update current performance metrics
   */
  updateMetrics(newMetrics: Partial<ScalingMetrics>): void {
    this.metrics = { ...this.metrics, ...newMetrics };
    this.metricHistory.push({ ...this.metrics });
    
    // Trim history
    if (this.metricHistory.length > 100) {
      this.metricHistory.shift();
    }
    
    // Trigger scaling evaluation
    this.evaluateScaling();
  }

  /**
   * Evaluate if scaling is needed
   */
  private evaluateScaling(): void {
    const now = Date.now();
    
    // Check cooldown period
    if (now - this.lastScalingTime < this.cooldownPeriod) {
      return;
    }

    const actions = this.determineScalingActions();
    
    if (actions.length > 0) {
      // Execute the most critical action first
      const primaryAction = actions.sort((a, b) => b.magnitude - a.magnitude)[0];
      this.executeScalingAction(primaryAction);
      this.lastScalingTime = now;
    }
  }

  /**
   * Determine what scaling actions are needed
   */
  private determineScalingActions(): ScalingAction[] {
    const actions: ScalingAction[] = [];

    // Check FPS performance
    if (this.metrics.fps < this.targets.minFPS) {
      const fpsDelta = (this.targets.minFPS - this.metrics.fps) / this.targets.minFPS;
      
      if (fpsDelta > 0.3) {
        // Severe performance issue - reduce quality
        actions.push({
          type: 'scale_quality',
          direction: 'down',
          magnitude: fpsDelta,
          reason: `FPS too low: ${this.metrics.fps.toFixed(1)} < ${this.targets.minFPS}`,
          timestamp: Date.now()
        });
      } else if (fpsDelta > 0.1) {
        // Moderate performance issue - reduce resolution
        actions.push({
          type: 'scale_resolution',
          direction: 'down',
          magnitude: fpsDelta,
          reason: `FPS below target: ${this.metrics.fps.toFixed(1)} < ${this.targets.minFPS}`,
          timestamp: Date.now()
        });
      }
    }

    // Check latency
    if (this.metrics.latency > this.targets.maxLatency) {
      const latencyDelta = (this.metrics.latency - this.targets.maxLatency) / this.targets.maxLatency;
      
      actions.push({
        type: 'scale_workers',
        direction: 'up',
        magnitude: latencyDelta,
        reason: `Latency too high: ${this.metrics.latency.toFixed(1)}ms > ${this.targets.maxLatency}ms`,
        timestamp: Date.now()
      });
    }

    // Check GPU utilization
    if (this.metrics.gpu > this.targets.targetGpuUtilization + 20) {
      // GPU overloaded
      const gpuDelta = (this.metrics.gpu - this.targets.targetGpuUtilization) / 100;
      
      actions.push({
        type: 'scale_quality',
        direction: 'down',
        magnitude: gpuDelta,
        reason: `GPU overloaded: ${this.metrics.gpu.toFixed(1)}% > ${this.targets.targetGpuUtilization}%`,
        timestamp: Date.now()
      });
    } else if (this.metrics.gpu < this.targets.targetGpuUtilization - 20 && this.canScaleUp()) {
      // GPU underutilized, can scale up
      const gpuDelta = (this.targets.targetGpuUtilization - this.metrics.gpu) / 100;
      
      actions.push({
        type: 'scale_quality',
        direction: 'up',
        magnitude: gpuDelta,
        reason: `GPU underutilized: ${this.metrics.gpu.toFixed(1)}% < ${this.targets.targetGpuUtilization}%`,
        timestamp: Date.now()
      });
    }

    // Check memory usage
    if (this.metrics.memory > this.targets.maxMemoryUsage) {
      const memoryDelta = (this.metrics.memory - this.targets.maxMemoryUsage) / this.targets.maxMemoryUsage;
      
      actions.push({
        type: 'scale_cache',
        direction: 'down',
        magnitude: memoryDelta,
        reason: `Memory usage too high: ${this.metrics.memory.toFixed(1)}MB > ${this.targets.maxMemoryUsage}MB`,
        timestamp: Date.now()
      });
    }

    // Check queue depth for worker scaling
    if (this.metrics.queueDepth > 10 && this.workers.active < this.workers.max) {
      actions.push({
        type: 'scale_workers',
        direction: 'up',
        magnitude: Math.min(1, this.metrics.queueDepth / 20),
        reason: `Queue depth high: ${this.metrics.queueDepth} items`,
        timestamp: Date.now()
      });
    } else if (this.metrics.queueDepth < 2 && this.workers.active > this.workers.min) {
      actions.push({
        type: 'scale_workers',
        direction: 'down',
        magnitude: 0.5,
        reason: `Queue depth low: ${this.metrics.queueDepth} items`,
        timestamp: Date.now()
      });
    }

    return actions;
  }

  /**
   * Execute a scaling action
   */
  private executeScalingAction(action: ScalingAction): void {
    console.log(`Executing scaling action: ${action.type} ${action.direction} (${action.reason})`);
    
    switch (action.type) {
      case 'scale_quality':
        this.scaleQuality(action.direction, action.magnitude);
        break;
      case 'scale_workers':
        this.scaleWorkers(action.direction, action.magnitude);
        break;
      case 'scale_cache':
        this.scaleCache(action.direction, action.magnitude);
        break;
      case 'scale_resolution':
        this.scaleResolution(action.direction, action.magnitude);
        break;
    }

    // Record action
    this.scalingHistory.push(action);
    this.trimScalingHistory();

    // Emit scaling event
    this.emitScalingEvent(action);
  }

  /**
   * Scale rendering quality
   */
  private scaleQuality(direction: 'up' | 'down', magnitude: number): void {
    const qualities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    const currentIndex = qualities.indexOf(this.currentQuality);
    
    if (direction === 'down' && currentIndex > 0) {
      this.currentQuality = qualities[currentIndex - 1];
    } else if (direction === 'up' && currentIndex < qualities.length - 1) {
      this.currentQuality = qualities[currentIndex + 1];
    }

    // Apply quality change
    window.dispatchEvent(new CustomEvent('nerf-quality-change', {
      detail: { quality: this.currentQuality, reason: 'auto-scaling' }
    }));

    console.log(`Quality scaled ${direction} to: ${this.currentQuality}`);
  }

  /**
   * Scale worker pool
   */
  private scaleWorkers(direction: 'up' | 'down', magnitude: number): void {
    const scalingFactor = Math.ceil(magnitude * 2); // Convert magnitude to worker count
    
    if (direction === 'up') {
      const newActive = Math.min(this.workers.max, this.workers.active + scalingFactor);
      const toAdd = newActive - this.workers.active;
      
      for (let i = 0; i < toAdd; i++) {
        this.spawnWorker();
      }
      
      this.workers.active = newActive;
    } else if (direction === 'down') {
      const newActive = Math.max(this.workers.min, this.workers.active - scalingFactor);
      const toRemove = this.workers.active - newActive;
      
      for (let i = 0; i < toRemove; i++) {
        this.terminateWorker();
      }
      
      this.workers.active = newActive;
    }

    console.log(`Workers scaled ${direction}: now ${this.workers.active} active`);
  }

  /**
   * Scale cache size
   */
  private scaleCache(direction: 'up' | 'down', magnitude: number): void {
    const scalingFactor = magnitude * 128; // Scale in 128MB increments
    
    if (direction === 'down') {
      this.adaptiveCacheSize = Math.max(64, this.adaptiveCacheSize - scalingFactor);
    } else if (direction === 'up') {
      this.adaptiveCacheSize = Math.min(2048, this.adaptiveCacheSize + scalingFactor);
    }

    // Apply cache size change
    window.dispatchEvent(new CustomEvent('nerf-cache-resize', {
      detail: { size: this.adaptiveCacheSize }
    }));

    console.log(`Cache scaled ${direction} to: ${this.adaptiveCacheSize}MB`);
  }

  /**
   * Scale resolution
   */
  private scaleResolution(direction: 'up' | 'down', magnitude: number): void {
    const [width, height] = this.currentResolution;
    const scalingFactor = 1 + (magnitude * 0.2); // 20% scaling steps
    
    if (direction === 'down') {
      const newWidth = Math.max(720, Math.floor(width / scalingFactor));
      const newHeight = Math.max(480, Math.floor(height / scalingFactor));
      this.currentResolution = [newWidth, newHeight];
    } else if (direction === 'up') {
      const newWidth = Math.min(3840, Math.floor(width * scalingFactor));
      const newHeight = Math.min(2160, Math.floor(height * scalingFactor));
      this.currentResolution = [newWidth, newHeight];
    }

    // Apply resolution change
    window.dispatchEvent(new CustomEvent('nerf-resolution-change', {
      detail: { resolution: this.currentResolution, reason: 'auto-scaling' }
    }));

    console.log(`Resolution scaled ${direction} to: ${this.currentResolution.join('x')}`);
  }

  /**
   * Check if we can scale up based on recent history
   */
  private canScaleUp(): boolean {
    // Don't scale up if we recently scaled down
    const recentActions = this.scalingHistory.slice(-5);
    const recentScaleDown = recentActions.some(action => 
      action.direction === 'down' && 
      Date.now() - action.timestamp < 30000 // Within 30 seconds
    );
    
    return !recentScaleDown;
  }

  /**
   * Spawn new worker
   */
  private spawnWorker(): void {
    // Would create new Web Worker for processing
    console.log('Spawning new worker');
    
    // Mock worker creation
    window.dispatchEvent(new CustomEvent('nerf-worker-spawn'));
  }

  /**
   * Terminate worker
   */
  private terminateWorker(): void {
    // Would terminate least utilized worker
    console.log('Terminating worker');
    
    // Mock worker termination
    window.dispatchEvent(new CustomEvent('nerf-worker-terminate'));
  }

  /**
   * Emit scaling event for external listeners
   */
  private emitScalingEvent(action: ScalingAction): void {
    window.dispatchEvent(new CustomEvent('nerf-scaling-action', {
      detail: action
    }));
  }

  /**
   * Predict future performance based on trends
   */
  predictPerformance(lookAheadSeconds: number): ScalingMetrics {
    if (this.metricHistory.length < 10) {
      return { ...this.metrics }; // Not enough data for prediction
    }

    const recent = this.metricHistory.slice(-10);
    const predicted: ScalingMetrics = { ...this.metrics };

    // Simple linear trend prediction for each metric
    const trends = this.calculateTrends(recent);
    
    const timeSteps = lookAheadSeconds / 10; // Assume 10-second intervals
    
    predicted.fps = Math.max(0, this.metrics.fps + (trends.fps * timeSteps));
    predicted.gpu = Math.max(0, Math.min(100, this.metrics.gpu + (trends.gpu * timeSteps)));
    predicted.memory = Math.max(0, this.metrics.memory + (trends.memory * timeSteps));
    predicted.latency = Math.max(0, this.metrics.latency + (trends.latency * timeSteps));

    return predicted;
  }

  /**
   * Calculate trends from metric history
   */
  private calculateTrends(data: ScalingMetrics[]): Partial<ScalingMetrics> {
    const trends: Partial<ScalingMetrics> = {};
    
    if (data.length < 2) return trends;

    const first = data[0];
    const last = data[data.length - 1];
    const timespan = data.length - 1;

    trends.fps = (last.fps - first.fps) / timespan;
    trends.gpu = (last.gpu - first.gpu) / timespan;
    trends.memory = (last.memory - first.memory) / timespan;
    trends.latency = (last.latency - first.latency) / timespan;

    return trends;
  }

  /**
   * Setup monitoring intervals
   */
  private setupMonitoring(): void {
    // Monitor performance every 5 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    // Would collect real metrics from system APIs
    const mockMetrics: Partial<ScalingMetrics> = {
      cpu: Math.random() * 100,
      memory: 500 + Math.random() * 1000,
      networkIO: Math.random() * 50,
      queueDepth: Math.floor(Math.random() * 15),
      errorRate: Math.random() * 0.05
    };

    this.updateMetrics(mockMetrics);
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): ScalingMetrics {
    return {
      cpu: 0,
      gpu: 0,
      memory: 0,
      networkIO: 0,
      fps: 60,
      latency: 5,
      queueDepth: 0,
      errorRate: 0
    };
  }

  /**
   * Trim scaling history to prevent memory growth
   */
  private trimScalingHistory(): void {
    if (this.scalingHistory.length > 100) {
      this.scalingHistory = this.scalingHistory.slice(-50);
    }
  }

  /**
   * Get current scaling state
   */
  getState(): {
    currentQuality: string;
    currentResolution: [number, number];
    activeWorkers: number;
    cacheSize: number;
    recentActions: ScalingAction[];
    predictions: ScalingMetrics;
  } {
    return {
      currentQuality: this.currentQuality,
      currentResolution: this.currentResolution,
      activeWorkers: this.workers.active,
      cacheSize: this.adaptiveCacheSize,
      recentActions: this.scalingHistory.slice(-10),
      predictions: this.predictPerformance(60) // 1 minute prediction
    };
  }

  /**
   * Update scaling targets
   */
  updateTargets(newTargets: Partial<ScalingTarget>): void {
    this.targets = { ...this.targets, ...newTargets };
    console.log('Scaling targets updated:', this.targets);
  }

  /**
   * Get scaling statistics
   */
  getStats(): {
    totalActions: number;
    actionsByType: Record<string, number>;
    averageResponseTime: number;
    scalingEffectiveness: number;
  } {
    const actionsByType: Record<string, number> = {};
    let totalResponseTime = 0;

    for (const action of this.scalingHistory) {
      actionsByType[action.type] = (actionsByType[action.type] || 0) + 1;
      // Mock response time calculation
      totalResponseTime += 5000; // 5 second average
    }

    return {
      totalActions: this.scalingHistory.length,
      actionsByType,
      averageResponseTime: this.scalingHistory.length > 0 ? totalResponseTime / this.scalingHistory.length : 0,
      scalingEffectiveness: 0.85 // Mock effectiveness score
    };
  }

  /**
   * Force a specific scaling action
   */
  forceScale(type: ScalingAction['type'], direction: 'up' | 'down', reason: string): void {
    const action: ScalingAction = {
      type,
      direction,
      magnitude: 1.0,
      reason: `Manual: ${reason}`,
      timestamp: Date.now()
    };

    this.executeScalingAction(action);
  }

  /**
   * Disable auto-scaling temporarily
   */
  pause(): void {
    // Implementation would pause the scaling evaluation
    console.log('Auto-scaling paused');
  }

  /**
   * Resume auto-scaling
   */
  resume(): void {
    // Implementation would resume scaling evaluation
    console.log('Auto-scaling resumed');
  }

  /**
   * Dispose of auto-scaler
   */
  dispose(): void {
    // Clear intervals and cleanup resources
    this.scalingHistory = [];
    this.metricHistory = [];
    this.performanceModel.clear();
  }
}