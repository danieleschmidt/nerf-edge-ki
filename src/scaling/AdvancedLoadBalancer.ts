/**
 * Advanced Load Balancer for NeRF Edge Kit
 * Implements intelligent load distribution with predictive scaling
 */

export interface WorkerNode {
  id: string;
  endpoint: string;
  region: string;
  capabilities: {
    maxMemory: number; // MB
    maxGPUMemory: number; // MB
    computeUnits: number; // Relative performance score
    supportedFormats: string[];
  };
  currentLoad: {
    activeTasks: number;
    memoryUsage: number; // MB
    gpuUsage: number; // 0-100%
    cpuUsage: number; // 0-100%
    responseTime: number; // ms
  };
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck: number;
  priority: number; // 1-10 (higher = preferred)
}

export interface LoadBalancingTask {
  id: string;
  type: 'render' | 'training' | 'optimization' | 'validation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  resourceRequirements: {
    memory: number;
    gpuMemory: number;
    computeUnits: number;
    estimatedDuration: number; // seconds
  };
  affinity?: {
    preferredRegions?: string[];
    excludeNodes?: string[];
    requireCapabilities?: string[];
  };
  deadline?: number; // timestamp
}

export interface LoadBalancingResult {
  selectedNode: WorkerNode;
  confidence: number; // 0-1
  reasoning: string[];
  alternatives: WorkerNode[];
  estimatedCompletionTime: number;
}

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  RESOURCE_AWARE = 'resource_aware',
  PREDICTIVE = 'predictive',
  GEOGRAPHIC = 'geographic'
}

export class AdvancedLoadBalancer {
  private nodes: Map<string, WorkerNode> = new Map();
  private strategy: LoadBalancingStrategy = LoadBalancingStrategy.PREDICTIVE;
  private taskHistory: Map<string, any[]> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();
  private roundRobinIndex = 0;
  
  // Predictive scaling parameters
  private predictionWindow = 300; // seconds
  private scalingThreshold = 0.8; // 80% utilization
  private scaleUpCooldown = 60; // seconds
  private scaleDownCooldown = 300; // seconds
  private lastScalingAction = 0;

  constructor(strategy: LoadBalancingStrategy = LoadBalancingStrategy.PREDICTIVE) {
    this.strategy = strategy;
    this.initializeHealthMonitoring();
  }

  /**
   * Register a new worker node
   */
  registerNode(node: WorkerNode): void {
    this.nodes.set(node.id, { ...node, lastHealthCheck: Date.now() });
    this.performanceMetrics.set(node.id, []);
    
    console.log(`📊 Registered worker node: ${node.id} (${node.region}, ${node.capabilities.computeUnits} compute units)`);
  }

  /**
   * Remove a worker node
   */
  unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.performanceMetrics.delete(nodeId);
    this.taskHistory.delete(nodeId);
    
    console.log(`📊 Unregistered worker node: ${nodeId}`);
  }

  /**
   * Select the best node for a task using intelligent load balancing
   */
  async selectNode(task: LoadBalancingTask): Promise<LoadBalancingResult> {
    const availableNodes = this.getHealthyNodes();
    
    if (availableNodes.length === 0) {
      throw new Error('No healthy worker nodes available');
    }

    // Filter nodes based on task requirements
    const eligibleNodes = this.filterEligibleNodes(availableNodes, task);
    
    if (eligibleNodes.length === 0) {
      throw new Error('No nodes meet task requirements');
    }

    // Apply load balancing strategy
    const selectedNode = await this.applyStrategy(eligibleNodes, task);
    const alternatives = eligibleNodes
      .filter(node => node.id !== selectedNode.id)
      .slice(0, 3); // Top 3 alternatives

    const confidence = this.calculateConfidence(selectedNode, task);
    const reasoning = this.generateReasoning(selectedNode, task);
    const estimatedCompletionTime = this.estimateCompletionTime(selectedNode, task);

    return {
      selectedNode,
      confidence,
      reasoning,
      alternatives,
      estimatedCompletionTime
    };
  }

  /**
   * Update node metrics for predictive scaling
   */
  updateNodeMetrics(nodeId: string, metrics: Partial<WorkerNode['currentLoad']>): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Update current load
    Object.assign(node.currentLoad, metrics);
    node.lastHealthCheck = Date.now();

    // Update performance history
    const history = this.performanceMetrics.get(nodeId) || [];
    history.push(node.currentLoad.responseTime);
    
    // Keep only recent history
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.performanceMetrics.set(nodeId, history);

    // Update health status based on metrics
    this.updateHealthStatus(node);

    // Check if scaling is needed
    this.checkScalingNeeds();
  }

  /**
   * Get current cluster statistics
   */
  getClusterStats(): {
    totalNodes: number;
    healthyNodes: number;
    totalCapacity: number;
    currentUtilization: number;
    averageResponseTime: number;
    recommendedActions: string[];
  } {
    const allNodes = Array.from(this.nodes.values());
    const healthyNodes = this.getHealthyNodes();
    
    const totalCapacity = allNodes.reduce((sum, node) => 
      sum + node.capabilities.computeUnits, 0);
    
    const currentUtilization = healthyNodes.reduce((sum, node) => 
      sum + (node.currentLoad.activeTasks / node.capabilities.computeUnits), 0) / healthyNodes.length;
    
    const averageResponseTime = healthyNodes.reduce((sum, node) => 
      sum + node.currentLoad.responseTime, 0) / healthyNodes.length;

    const recommendedActions = this.generateRecommendations();

    return {
      totalNodes: allNodes.length,
      healthyNodes: healthyNodes.length,
      totalCapacity,
      currentUtilization,
      averageResponseTime,
      recommendedActions
    };
  }

  /**
   * Predict future load and suggest scaling actions
   */
  predictAndScale(): {
    prediction: {
      timeframe: number;
      expectedLoad: number;
      confidence: number;
    };
    scalingRecommendation: {
      action: 'scale_up' | 'scale_down' | 'maintain';
      targetNodes: number;
      reasoning: string;
    };
  } {
    const currentLoad = this.getCurrentClusterLoad();
    const historicalTrend = this.analyzeLoadTrend();
    const seasonalFactors = this.getSeasonalFactors();
    
    // Simple prediction model (can be enhanced with ML)
    const expectedLoad = currentLoad * (1 + historicalTrend) * seasonalFactors;
    const confidence = Math.max(0.1, Math.min(0.9, 1 - Math.abs(historicalTrend)));

    // Scaling recommendation
    const healthyNodes = this.getHealthyNodes().length;
    let action: 'scale_up' | 'scale_down' | 'maintain' = 'maintain';
    let targetNodes = healthyNodes;
    let reasoning = 'Current capacity is sufficient';

    if (expectedLoad > this.scalingThreshold && this.canScaleUp()) {
      action = 'scale_up';
      targetNodes = Math.ceil(healthyNodes * 1.5);
      reasoning = `Expected load (${(expectedLoad * 100).toFixed(1)}%) exceeds threshold`;
    } else if (expectedLoad < 0.3 && healthyNodes > 1 && this.canScaleDown()) {
      action = 'scale_down';
      targetNodes = Math.max(1, Math.floor(healthyNodes * 0.7));
      reasoning = `Expected load (${(expectedLoad * 100).toFixed(1)}%) is low, can reduce capacity`;
    }

    return {
      prediction: {
        timeframe: this.predictionWindow,
        expectedLoad,
        confidence
      },
      scalingRecommendation: {
        action,
        targetNodes,
        reasoning
      }
    };
  }

  /**
   * Get healthy nodes only
   */
  private getHealthyNodes(): WorkerNode[] {
    return Array.from(this.nodes.values())
      .filter(node => node.healthStatus === 'healthy');
  }

  /**
   * Filter nodes based on task requirements
   */
  private filterEligibleNodes(nodes: WorkerNode[], task: LoadBalancingTask): WorkerNode[] {
    return nodes.filter(node => {
      // Check resource requirements
      if (node.currentLoad.memoryUsage + task.resourceRequirements.memory > node.capabilities.maxMemory) {
        return false;
      }
      
      if (node.capabilities.computeUnits < task.resourceRequirements.computeUnits) {
        return false;
      }

      // Check affinity constraints
      if (task.affinity) {
        if (task.affinity.excludeNodes?.includes(node.id)) {
          return false;
        }
        
        if (task.affinity.preferredRegions && 
            !task.affinity.preferredRegions.includes(node.region)) {
          return false;
        }
        
        if (task.affinity.requireCapabilities &&
            !task.affinity.requireCapabilities.every(cap => 
              node.capabilities.supportedFormats.includes(cap))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply the selected load balancing strategy
   */
  private async applyStrategy(nodes: WorkerNode[], task: LoadBalancingTask): Promise<WorkerNode> {
    switch (this.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.roundRobin(nodes);
      
      case LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
        return this.weightedRoundRobin(nodes);
      
      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        return this.leastConnections(nodes);
      
      case LoadBalancingStrategy.RESOURCE_AWARE:
        return this.resourceAware(nodes, task);
      
      case LoadBalancingStrategy.PREDICTIVE:
        return this.predictive(nodes, task);
      
      case LoadBalancingStrategy.GEOGRAPHIC:
        return this.geographic(nodes, task);
      
      default:
        return nodes[0];
    }
  }

  /**
   * Round robin strategy
   */
  private roundRobin(nodes: WorkerNode[]): WorkerNode {
    this.roundRobinIndex = (this.roundRobinIndex + 1) % nodes.length;
    return nodes[this.roundRobinIndex];
  }

  /**
   * Weighted round robin based on compute units
   */
  private weightedRoundRobin(nodes: WorkerNode[]): WorkerNode {
    const totalWeight = nodes.reduce((sum, node) => sum + node.capabilities.computeUnits, 0);
    const random = Math.random() * totalWeight;
    
    let accumulated = 0;
    for (const node of nodes) {
      accumulated += node.capabilities.computeUnits;
      if (random <= accumulated) {
        return node;
      }
    }
    
    return nodes[nodes.length - 1];
  }

  /**
   * Least connections strategy
   */
  private leastConnections(nodes: WorkerNode[]): WorkerNode {
    return nodes.reduce((best, current) => 
      current.currentLoad.activeTasks < best.currentLoad.activeTasks ? current : best
    );
  }

  /**
   * Resource-aware strategy
   */
  private resourceAware(nodes: WorkerNode[], task: LoadBalancingTask): WorkerNode {
    return nodes
      .map(node => ({
        node,
        score: this.calculateResourceScore(node, task)
      }))
      .sort((a, b) => b.score - a.score)[0].node;
  }

  /**
   * Predictive strategy using historical performance
   */
  private predictive(nodes: WorkerNode[], task: LoadBalancingTask): WorkerNode {
    return nodes
      .map(node => ({
        node,
        score: this.calculatePredictiveScore(node, task)
      }))
      .sort((a, b) => b.score - a.score)[0].node;
  }

  /**
   * Geographic strategy (prefers closer nodes)
   */
  private geographic(nodes: WorkerNode[], task: LoadBalancingTask): WorkerNode {
    // For now, just return the first available node
    // In a real implementation, this would consider client location
    return nodes[0];
  }

  /**
   * Calculate resource utilization score
   */
  private calculateResourceScore(node: WorkerNode, task: LoadBalancingTask): number {
    const memoryScore = 1 - (node.currentLoad.memoryUsage / node.capabilities.maxMemory);
    const cpuScore = 1 - (node.currentLoad.cpuUsage / 100);
    const gpuScore = 1 - (node.currentLoad.gpuUsage / 100);
    const loadScore = 1 - (node.currentLoad.activeTasks / 10); // Assume max 10 tasks
    
    return (memoryScore + cpuScore + gpuScore + loadScore) / 4;
  }

  /**
   * Calculate predictive score based on historical performance
   */
  private calculatePredictiveScore(node: WorkerNode, task: LoadBalancingTask): number {
    const resourceScore = this.calculateResourceScore(node, task);
    const performanceHistory = this.performanceMetrics.get(node.id) || [];
    
    if (performanceHistory.length === 0) {
      return resourceScore;
    }
    
    // Calculate average response time
    const avgResponseTime = performanceHistory.reduce((sum, time) => sum + time, 0) / performanceHistory.length;
    const responseScore = Math.max(0, 1 - (avgResponseTime / 1000)); // Normalize to 1s max
    
    // Priority bonus
    const priorityScore = node.priority / 10;
    
    return (resourceScore * 0.4 + responseScore * 0.4 + priorityScore * 0.2);
  }

  /**
   * Calculate confidence in node selection
   */
  private calculateConfidence(node: WorkerNode, task: LoadBalancingTask): number {
    const resourceAvailability = this.calculateResourceScore(node, task);
    const performanceHistory = this.performanceMetrics.get(node.id) || [];
    const performanceConsistency = performanceHistory.length > 0 ? 
      1 - (this.calculateStandardDeviation(performanceHistory) / 1000) : 0.5;
    
    return Math.max(0.1, Math.min(0.9, (resourceAvailability + performanceConsistency) / 2));
  }

  /**
   * Generate reasoning for node selection
   */
  private generateReasoning(node: WorkerNode, task: LoadBalancingTask): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Selected node ${node.id} in ${node.region}`);
    
    const resourceScore = this.calculateResourceScore(node, task);
    if (resourceScore > 0.8) {
      reasoning.push('High resource availability');
    } else if (resourceScore > 0.5) {
      reasoning.push('Moderate resource availability');
    } else {
      reasoning.push('Limited resources but sufficient for task');
    }
    
    if (node.priority >= 8) {
      reasoning.push('High priority node');
    }
    
    const performanceHistory = this.performanceMetrics.get(node.id) || [];
    if (performanceHistory.length > 0) {
      const avgResponseTime = performanceHistory.reduce((sum, time) => sum + time, 0) / performanceHistory.length;
      reasoning.push(`Average response time: ${avgResponseTime.toFixed(0)}ms`);
    }
    
    return reasoning;
  }

  /**
   * Estimate task completion time
   */
  private estimateCompletionTime(node: WorkerNode, task: LoadBalancingTask): number {
    const baseTime = task.resourceRequirements.estimatedDuration;
    const loadFactor = 1 + (node.currentLoad.activeTasks * 0.1);
    const performanceFactor = node.capabilities.computeUnits / task.resourceRequirements.computeUnits;
    
    return baseTime * loadFactor / performanceFactor;
  }

  /**
   * Update node health status based on metrics
   */
  private updateHealthStatus(node: WorkerNode): void {
    const now = Date.now();
    const timeSinceLastCheck = now - node.lastHealthCheck;
    
    // Consider unhealthy if no update for 30 seconds
    if (timeSinceLastCheck > 30000) {
      node.healthStatus = 'unhealthy';
      return;
    }
    
    // Check resource utilization
    const highUtilization = node.currentLoad.cpuUsage > 90 || 
                          node.currentLoad.gpuUsage > 90 ||
                          node.currentLoad.memoryUsage > node.capabilities.maxMemory * 0.9;
    
    const veryHighResponseTime = node.currentLoad.responseTime > 5000;
    
    if (highUtilization || veryHighResponseTime) {
      node.healthStatus = 'degraded';
    } else {
      node.healthStatus = 'healthy';
    }
  }

  /**
   * Initialize health monitoring
   */
  private initializeHealthMonitoring(): void {
    // Run health checks every 10 seconds
    setInterval(() => {
      for (const node of this.nodes.values()) {
        this.updateHealthStatus(node);
      }
    }, 10000);
  }

  /**
   * Check if scaling is needed
   */
  private checkScalingNeeds(): void {
    const now = Date.now();
    if (now - this.lastScalingAction < this.scaleUpCooldown * 1000) {
      return; // Still in cooldown
    }

    const prediction = this.predictAndScale();
    
    if (prediction.scalingRecommendation.action !== 'maintain') {
      console.log(`🔧 Scaling recommendation: ${prediction.scalingRecommendation.action} to ${prediction.scalingRecommendation.targetNodes} nodes`);
      console.log(`📊 Reason: ${prediction.scalingRecommendation.reasoning}`);
      
      // In a real implementation, this would trigger actual scaling
      this.lastScalingAction = now;
    }
  }

  /**
   * Get current cluster load
   */
  private getCurrentClusterLoad(): number {
    const healthyNodes = this.getHealthyNodes();
    if (healthyNodes.length === 0) return 0;
    
    return healthyNodes.reduce((sum, node) => 
      sum + (node.currentLoad.activeTasks / node.capabilities.computeUnits), 0) / healthyNodes.length;
  }

  /**
   * Analyze load trend
   */
  private analyzeLoadTrend(): number {
    // Simplified trend analysis - in reality would use more sophisticated methods
    const currentLoad = this.getCurrentClusterLoad();
    // Return a small positive trend for demonstration
    return 0.05 + (Math.random() - 0.5) * 0.1;
  }

  /**
   * Get seasonal factors
   */
  private getSeasonalFactors(): number {
    // Simplified seasonal analysis
    const hour = new Date().getHours();
    
    // Peak hours (9-17) have higher load
    if (hour >= 9 && hour <= 17) {
      return 1.2;
    } else if (hour >= 18 && hour <= 22) {
      return 1.1;
    } else {
      return 0.8;
    }
  }

  /**
   * Check if scaling up is allowed
   */
  private canScaleUp(): boolean {
    const now = Date.now();
    return now - this.lastScalingAction > this.scaleUpCooldown * 1000;
  }

  /**
   * Check if scaling down is allowed
   */
  private canScaleDown(): boolean {
    const now = Date.now();
    return now - this.lastScalingAction > this.scaleDownCooldown * 1000;
  }

  /**
   * Generate cluster recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Get stats without calling generateRecommendations to avoid recursion
    const allNodes = Array.from(this.nodes.values());
    const healthyNodes = this.getHealthyNodes();
    const totalNodes = allNodes.length;
    const healthyNodeCount = healthyNodes.length;
    
    const currentUtilization = healthyNodes.length > 0 ? 
      healthyNodes.reduce((sum, node) => 
        sum + (node.currentLoad.activeTasks / node.capabilities.computeUnits), 0) / healthyNodes.length : 0;
    
    const averageResponseTime = healthyNodes.length > 0 ?
      healthyNodes.reduce((sum, node) => 
        sum + node.currentLoad.responseTime, 0) / healthyNodes.length : 0;
    
    if (healthyNodeCount < totalNodes) {
      recommendations.push('Some nodes are unhealthy - investigate and repair');
    }
    
    if (currentUtilization > 0.8) {
      recommendations.push('High cluster utilization - consider scaling up');
    } else if (currentUtilization < 0.3) {
      recommendations.push('Low cluster utilization - consider scaling down');
    }
    
    if (averageResponseTime > 1000) {
      recommendations.push('High response times - check node performance');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Cluster is performing optimally');
    }
    
    return recommendations;
  }

  /**
   * Calculate standard deviation for performance metrics
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

export default AdvancedLoadBalancer;