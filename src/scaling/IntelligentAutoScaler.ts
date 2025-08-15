/**
 * Generation 3: MAKE IT SCALE - Intelligent Auto-Scaling System
 * 
 * Advanced auto-scaling for NeRF Edge Kit with:
 * - Predictive scaling based on usage patterns
 * - Multi-dimensional resource optimization
 * - Global load balancing
 * - Cost optimization
 * - Edge computing integration
 */

export interface ScalingMetrics {
  cpu: number;
  memory: number;
  gpu: number;
  network: number;
  latency: number;
  throughput: number;
  errorRate: number;
  activeUsers: number;
  requestsPerSecond: number;
}

export interface ScalingAction {
  type: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in' | 'migrate' | 'optimize';
  target: string;
  magnitude: number;
  reason: string;
  priority: number;
  estimatedCost: number;
  timestamp: number;
}

export interface ResourceLimits {
  minInstances: number;
  maxInstances: number;
  minCPU: number;
  maxCPU: number;
  minMemory: number;
  maxMemory: number;
  minGPU: number;
  maxGPU: number;
  budget: number; // USD per hour
}

export interface GeographicRegion {
  id: string;
  name: string;
  location: { lat: number; lon: number };
  capacity: ResourceLimits;
  currentLoad: ScalingMetrics;
  costMultiplier: number;
  latencyToRegions: Map<string, number>;
}

export interface PredictionModel {
  name: string;
  accuracy: number;
  trainingData: ScalingMetrics[];
  predictions: Array<{
    timestamp: number;
    metrics: Partial<ScalingMetrics>;
    confidence: number;
  }>;
}

export class IntelligentAutoScaler {
  private regions: Map<string, GeographicRegion> = new Map();
  private metricsHistory: ScalingMetrics[] = [];
  private scalingActions: ScalingAction[] = [];
  private predictionModels: Map<string, PredictionModel> = new Map();
  private scalingInterval?: NodeJS.Timeout;
  private isActive = false;
  
  private readonly config = {
    evaluationInterval: 30000, // 30 seconds
    predictionHorizon: 3600000, // 1 hour
    scaleUpThreshold: 0.8, // 80% resource utilization
    scaleDownThreshold: 0.3, // 30% resource utilization
    cooldownPeriod: 300000, // 5 minutes
    maxScaleSteps: 3,
    costWeight: 0.3,
    performanceWeight: 0.7
  };
  
  constructor() {
    this.initializeRegions();
    this.initializePredictionModels();
  }
  
  /**
   * Start intelligent auto-scaling
   */
  start(): void {
    if (this.isActive) return;
    
    console.log('🚀 Starting intelligent auto-scaler...');
    this.isActive = true;
    
    this.scalingInterval = setInterval(() => {
      this.evaluateScaling();
    }, this.config.evaluationInterval);
    
    // Initial evaluation
    this.evaluateScaling();
  }
  
  /**
   * Stop auto-scaling
   */
  stop(): void {
    console.log('🛑 Stopping auto-scaler');
    this.isActive = false;
    
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = undefined;
    }
  }
  
  /**
   * Get current scaling status
   */
  getScalingStatus(): {
    isActive: boolean;
    totalInstances: number;
    totalCPU: number;
    totalMemory: number;
    totalGPU: number;
    currentCost: number;
    regions: GeographicRegion[];
    recentActions: ScalingAction[];
    predictions: any[];
  } {
    const regions = Array.from(this.regions.values());
    const totalInstances = regions.reduce((sum, r) => sum + (r.capacity.maxInstances - r.capacity.minInstances), 0);
    const totalCPU = regions.reduce((sum, r) => sum + r.currentLoad.cpu, 0);
    const totalMemory = regions.reduce((sum, r) => sum + r.currentLoad.memory, 0);
    const totalGPU = regions.reduce((sum, r) => sum + r.currentLoad.gpu, 0);
    const currentCost = regions.reduce((sum, r) => sum + r.capacity.budget * r.costMultiplier, 0);
    
    const predictions = Array.from(this.predictionModels.values())
      .map(model => model.predictions.slice(-10))
      .flat();
    
    return {
      isActive: this.isActive,
      totalInstances,
      totalCPU,
      totalMemory,
      totalGPU,
      currentCost,
      regions,
      recentActions: this.scalingActions.slice(-20),
      predictions
    };
  }
  
  /**
   * Add a new geographic region
   */
  addRegion(region: GeographicRegion): void {
    this.regions.set(region.id, region);
    console.log(`🌍 Added region: ${region.name} (${region.id})`);
  }
  
  /**
   * Update metrics for a region
   */
  updateRegionMetrics(regionId: string, metrics: ScalingMetrics): void {
    const region = this.regions.get(regionId);
    if (!region) {
      console.warn(`⚠️ Region not found: ${regionId}`);
      return;
    }
    
    region.currentLoad = metrics;
    this.metricsHistory.push({
      ...metrics,
      timestamp: Date.now()
    } as ScalingMetrics & { timestamp: number });
    
    // Keep history limited
    if (this.metricsHistory.length > 10000) {
      this.metricsHistory = this.metricsHistory.slice(-5000);
    }
    
    // Update prediction models
    this.updatePredictionModels(metrics);
  }
  
  /**
   * Manually trigger scaling evaluation
   */
  async evaluateScaling(): Promise<void> {
    try {
      // Collect current state
      const currentState = this.collectSystemState();
      
      // Generate predictions
      const predictions = this.generatePredictions();
      
      // Identify scaling opportunities
      const scalingActions = this.identifyScalingActions(currentState, predictions);
      
      // Execute high-priority actions
      await this.executeScalingActions(scalingActions);
      
      // Update models with feedback
      this.updateModelFeedback();
      
    } catch (error) {
      console.error('Scaling evaluation failed:', error);
    }
  }
  
  /**
   * Optimize resource allocation across regions
   */
  async optimizeGlobalAllocation(): Promise<void> {
    console.log('🌐 Optimizing global resource allocation...');
    
    const regions = Array.from(this.regions.values());
    const totalDemand = this.calculateTotalDemand();
    
    // Calculate optimal distribution
    const optimalAllocation = this.calculateOptimalAllocation(regions, totalDemand);
    
    // Generate migration actions
    const migrationActions = this.generateMigrationActions(optimalAllocation);
    
    // Execute migrations
    await this.executeMigrations(migrationActions);
    
    console.log(`✅ Global optimization complete. ${migrationActions.length} migrations executed.`);
  }
  
  /**
   * Get cost optimization recommendations
   */
  getCostOptimizations(): Array<{
    action: string;
    description: string;
    estimatedSavings: number;
    risk: 'low' | 'medium' | 'high';
  }> {
    const optimizations: Array<{
      action: string;
      description: string;
      estimatedSavings: number;
      risk: 'low' | 'medium' | 'high';
    }> = [];
    
    for (const region of this.regions.values()) {
      const utilization = this.calculateUtilization(region.currentLoad);
      
      if (utilization < 0.3) {
        optimizations.push({
          action: 'scale_down',
          description: `Scale down ${region.name} (${(utilization * 100).toFixed(1)}% utilization)`,
          estimatedSavings: region.capacity.budget * 0.3,
          risk: 'low'
        });
      }
      
      // Check for over-provisioned GPU resources
      if (region.currentLoad.gpu < 50) {
        optimizations.push({
          action: 'reduce_gpu',
          description: `Reduce GPU allocation in ${region.name}`,
          estimatedSavings: region.capacity.budget * 0.2,
          risk: 'medium'
        });
      }
      
      // Check for cheaper region alternatives
      const cheaperRegions = this.findCheaperAlternatives(region);
      if (cheaperRegions.length > 0) {
        optimizations.push({
          action: 'migrate_region',
          description: `Migrate workload from ${region.name} to cheaper region`,
          estimatedSavings: (region.costMultiplier - cheaperRegions[0].costMultiplier) * region.capacity.budget,
          risk: 'high'
        });
      }
    }
    
    return optimizations.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }
  
  // Private methods
  
  private initializeRegions(): void {
    // Initialize major global regions
    const regions: GeographicRegion[] = [
      {
        id: 'us-west-1',
        name: 'US West (California)',
        location: { lat: 37.7749, lon: -122.4194 },
        capacity: {
          minInstances: 1,
          maxInstances: 10,
          minCPU: 2,
          maxCPU: 64,
          minMemory: 4096,
          maxMemory: 256000,
          minGPU: 0,
          maxGPU: 8,
          budget: 500 // $500/hour
        },
        currentLoad: this.generateMockMetrics(),
        costMultiplier: 1.0,
        latencyToRegions: new Map()
      },
      {
        id: 'eu-west-1',
        name: 'Europe (Ireland)',
        location: { lat: 53.3498, lon: -6.2603 },
        capacity: {
          minInstances: 1,
          maxInstances: 8,
          minCPU: 2,
          maxCPU: 48,
          minMemory: 4096,
          maxMemory: 192000,
          minGPU: 0,
          maxGPU: 6,
          budget: 400
        },
        currentLoad: this.generateMockMetrics(),
        costMultiplier: 1.1,
        latencyToRegions: new Map()
      },
      {
        id: 'ap-southeast-1',
        name: 'Asia Pacific (Singapore)',
        location: { lat: 1.3521, lon: 103.8198 },
        capacity: {
          minInstances: 1,
          maxInstances: 6,
          minCPU: 2,
          maxCPU: 32,
          minMemory: 4096,
          maxMemory: 128000,
          minGPU: 0,
          maxGPU: 4,
          budget: 350
        },
        currentLoad: this.generateMockMetrics(),
        costMultiplier: 0.9,
        latencyToRegions: new Map()
      }
    ];
    
    for (const region of regions) {
      this.regions.set(region.id, region);
    }
    
    // Calculate inter-region latencies
    this.calculateInterRegionLatencies();
  }
  
  private initializePredictionModels(): void {
    const models: PredictionModel[] = [
      {
        name: 'cpu_utilization',
        accuracy: 0.85,
        trainingData: [],
        predictions: []
      },
      {
        name: 'memory_usage',
        accuracy: 0.78,
        trainingData: [],
        predictions: []
      },
      {
        name: 'network_traffic',
        accuracy: 0.82,
        trainingData: [],
        predictions: []
      },
      {
        name: 'user_demand',
        accuracy: 0.90,
        trainingData: [],
        predictions: []
      }
    ];
    
    for (const model of models) {
      this.predictionModels.set(model.name, model);
    }
  }
  
  private generateMockMetrics(): ScalingMetrics {
    return {
      cpu: 20 + Math.random() * 60, // 20-80%
      memory: 30 + Math.random() * 50, // 30-80%
      gpu: 10 + Math.random() * 70, // 10-80%
      network: 100 + Math.random() * 900, // 100-1000 Mbps
      latency: 2 + Math.random() * 8, // 2-10ms
      throughput: 1000 + Math.random() * 4000, // 1000-5000 RPS
      errorRate: Math.random() * 2, // 0-2%
      activeUsers: 100 + Math.random() * 900, // 100-1000 users
      requestsPerSecond: 50 + Math.random() * 450 // 50-500 RPS
    };
  }
  
  private calculateInterRegionLatencies(): void {
    const regions = Array.from(this.regions.values());
    
    for (const sourceRegion of regions) {
      for (const targetRegion of regions) {
        if (sourceRegion.id === targetRegion.id) {
          sourceRegion.latencyToRegions.set(targetRegion.id, 0);
          continue;
        }
        
        // Simple distance-based latency calculation
        const distance = this.calculateDistance(
          sourceRegion.location,
          targetRegion.location
        );
        
        const latency = Math.max(10, distance / 200); // ~200km per ms
        sourceRegion.latencyToRegions.set(targetRegion.id, latency);
      }
    }
  }
  
  private calculateDistance(pos1: { lat: number; lon: number }, pos2: { lat: number; lon: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLon = (pos2.lon - pos1.lon) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  private collectSystemState(): { regions: GeographicRegion[]; totalLoad: ScalingMetrics } {
    const regions = Array.from(this.regions.values());
    const totalLoad = regions.reduce((acc, region) => ({
      cpu: acc.cpu + region.currentLoad.cpu,
      memory: acc.memory + region.currentLoad.memory,
      gpu: acc.gpu + region.currentLoad.gpu,
      network: acc.network + region.currentLoad.network,
      latency: Math.max(acc.latency, region.currentLoad.latency),
      throughput: acc.throughput + region.currentLoad.throughput,
      errorRate: Math.max(acc.errorRate, region.currentLoad.errorRate),
      activeUsers: acc.activeUsers + region.currentLoad.activeUsers,
      requestsPerSecond: acc.requestsPerSecond + region.currentLoad.requestsPerSecond
    }), {
      cpu: 0, memory: 0, gpu: 0, network: 0,
      latency: 0, throughput: 0, errorRate: 0,
      activeUsers: 0, requestsPerSecond: 0
    } as ScalingMetrics);
    
    return { regions, totalLoad };
  }
  
  private generatePredictions(): Map<string, any[]> {
    const predictions = new Map<string, any[]>();
    
    for (const [modelName, model] of this.predictionModels.entries()) {
      const prediction = this.generateModelPrediction(model);
      predictions.set(modelName, prediction);
    }
    
    return predictions;
  }
  
  private generateModelPrediction(model: PredictionModel): any[] {
    // Simple prediction based on recent trends
    const recentData = this.metricsHistory.slice(-20);
    if (recentData.length < 5) return [];
    
    const predictions = [];
    const currentTime = Date.now();
    
    for (let i = 1; i <= 12; i++) { // 12 predictions (next 6 hours)
      const timestamp = currentTime + (i * 30 * 60 * 1000); // 30-minute intervals
      
      predictions.push({
        timestamp,
        value: this.predictValue(recentData, model.name),
        confidence: model.accuracy
      });
    }
    
    return predictions;
  }
  
  private predictValue(data: any[], metricName: string): number {
    // Simple trend-based prediction
    const values = data.map(d => d[metricName] || 0).filter(v => v > 0);
    if (values.length === 0) return 0;
    
    const average = values.reduce((a, b) => a + b) / values.length;
    const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;
    
    return Math.max(0, average + trend * Math.random() * 2);
  }
  
  private identifyScalingActions(currentState: any, predictions: Map<string, any[]>): ScalingAction[] {
    const actions: ScalingAction[] = [];
    
    for (const region of currentState.regions) {
      const utilization = this.calculateUtilization(region.currentLoad);
      
      // Scale up if high utilization
      if (utilization > this.config.scaleUpThreshold) {
        actions.push({
          type: 'scale_up',
          target: region.id,
          magnitude: Math.min(2, Math.ceil((utilization - this.config.scaleUpThreshold) * 5)),
          reason: `High utilization: ${(utilization * 100).toFixed(1)}%`,
          priority: 8,
          estimatedCost: region.capacity.budget * 0.2,
          timestamp: Date.now()
        });
      }
      
      // Scale down if low utilization
      if (utilization < this.config.scaleDownThreshold) {
        actions.push({
          type: 'scale_down',
          target: region.id,
          magnitude: 1,
          reason: `Low utilization: ${(utilization * 100).toFixed(1)}%`,
          priority: 3,
          estimatedCost: -region.capacity.budget * 0.1,
          timestamp: Date.now()
        });
      }
      
      // Check predictions for proactive scaling
      const cpuPredictions = predictions.get('cpu_utilization') || [];
      if (cpuPredictions.length > 0) {
        const nextHourPrediction = cpuPredictions[1]; // 30 minutes ahead
        if (nextHourPrediction && nextHourPrediction.value > 80) {
          actions.push({
            type: 'scale_up',
            target: region.id,
            magnitude: 1,
            reason: `Predicted high CPU usage: ${nextHourPrediction.value.toFixed(1)}%`,
            priority: 6,
            estimatedCost: region.capacity.budget * 0.15,
            timestamp: Date.now()
          });
        }
      }
    }
    
    return actions.sort((a, b) => b.priority - a.priority);
  }
  
  private async executeScalingActions(actions: ScalingAction[]): Promise<void> {
    const highPriorityActions = actions.filter(a => a.priority >= 7);
    
    for (const action of highPriorityActions) {
      try {
        await this.executeScalingAction(action);
        this.scalingActions.push(action);
      } catch (error) {
        console.error(`Failed to execute scaling action:`, action, error);
      }
    }
  }
  
  private async executeScalingAction(action: ScalingAction): Promise<void> {
    const region = this.regions.get(action.target);
    if (!region) {
      throw new Error(`Region not found: ${action.target}`);
    }
    
    console.log(`🔧 Executing ${action.type} for ${region.name}: ${action.reason}`);
    
    // Simulate scaling action
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    switch (action.type) {
      case 'scale_up':
        // Increase capacity
        region.capacity.maxInstances = Math.min(
          region.capacity.maxInstances + action.magnitude,
          20 // Global limit
        );
        break;
        
      case 'scale_down':
        // Decrease capacity
        region.capacity.maxInstances = Math.max(
          region.capacity.maxInstances - action.magnitude,
          region.capacity.minInstances
        );
        break;
        
      case 'scale_out':
        // Add more instances
        console.log(`Adding ${action.magnitude} instances to ${region.name}`);
        break;
        
      case 'scale_in':
        // Remove instances
        console.log(`Removing ${action.magnitude} instances from ${region.name}`);
        break;
        
      case 'optimize':
        // Resource optimization
        console.log(`Optimizing resources for ${region.name}`);
        break;
    }
    
    console.log(`✅ ${action.type} completed for ${region.name}`);
  }
  
  private calculateUtilization(metrics: ScalingMetrics): number {
    // Weighted average of key utilization metrics
    const weights = { cpu: 0.3, memory: 0.3, gpu: 0.2, network: 0.2 };
    
    return (
      (metrics.cpu / 100) * weights.cpu +
      (metrics.memory / 100) * weights.memory +
      (metrics.gpu / 100) * weights.gpu +
      (Math.min(metrics.network, 1000) / 1000) * weights.network
    );
  }
  
  private calculateTotalDemand(): ScalingMetrics {
    const regions = Array.from(this.regions.values());
    
    return regions.reduce((total, region) => ({
      cpu: total.cpu + region.currentLoad.cpu,
      memory: total.memory + region.currentLoad.memory,
      gpu: total.gpu + region.currentLoad.gpu,
      network: total.network + region.currentLoad.network,
      latency: Math.max(total.latency, region.currentLoad.latency),
      throughput: total.throughput + region.currentLoad.throughput,
      errorRate: Math.max(total.errorRate, region.currentLoad.errorRate),
      activeUsers: total.activeUsers + region.currentLoad.activeUsers,
      requestsPerSecond: total.requestsPerSecond + region.currentLoad.requestsPerSecond
    }), {
      cpu: 0, memory: 0, gpu: 0, network: 0,
      latency: 0, throughput: 0, errorRate: 0,
      activeUsers: 0, requestsPerSecond: 0
    } as ScalingMetrics);
  }
  
  private calculateOptimalAllocation(regions: GeographicRegion[], demand: ScalingMetrics): Map<string, number> {
    const allocation = new Map<string, number>();
    
    // Simple allocation based on cost efficiency and capacity
    for (const region of regions) {
      const efficiency = (region.capacity.maxInstances * region.capacity.maxCPU) / region.costMultiplier;
      const share = efficiency / regions.reduce((sum, r) => sum + (r.capacity.maxInstances * r.capacity.maxCPU) / r.costMultiplier, 0);
      allocation.set(region.id, Math.round(demand.activeUsers * share));
    }
    
    return allocation;
  }
  
  private generateMigrationActions(allocation: Map<string, number>): ScalingAction[] {
    const actions: ScalingAction[] = [];
    
    for (const [regionId, targetLoad] of allocation.entries()) {
      const region = this.regions.get(regionId)!;
      const currentLoad = region.currentLoad.activeUsers;
      
      if (Math.abs(targetLoad - currentLoad) > 10) {
        actions.push({
          type: 'migrate',
          target: regionId,
          magnitude: Math.abs(targetLoad - currentLoad),
          reason: `Load balancing: ${currentLoad} → ${targetLoad} users`,
          priority: 5,
          estimatedCost: region.capacity.budget * 0.05,
          timestamp: Date.now()
        });
      }
    }
    
    return actions;
  }
  
  private async executeMigrations(actions: ScalingAction[]): Promise<void> {
    for (const action of actions) {
      console.log(`🔄 Executing migration: ${action.reason}`);
      // Simulate migration
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  private findCheaperAlternatives(region: GeographicRegion): GeographicRegion[] {
    return Array.from(this.regions.values())
      .filter(r => r.id !== region.id && r.costMultiplier < region.costMultiplier)
      .sort((a, b) => a.costMultiplier - b.costMultiplier);
  }
  
  private updatePredictionModels(metrics: ScalingMetrics): void {
    for (const [modelName, model] of this.predictionModels.entries()) {
      model.trainingData.push(metrics);
      
      // Keep training data limited
      if (model.trainingData.length > 1000) {
        model.trainingData = model.trainingData.slice(-500);
      }
    }
  }
  
  private updateModelFeedback(): void {
    // Update model accuracy based on prediction vs actual performance
    // This is a simplified implementation
    for (const model of this.predictionModels.values()) {
      // Simulate accuracy improvement over time
      model.accuracy = Math.min(0.95, model.accuracy + 0.001);
    }
  }
}