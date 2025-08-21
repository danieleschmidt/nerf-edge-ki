/**
 * Quantum-Inspired Auto-Scaling System
 * Uses quantum computing principles for optimal resource allocation
 */

export interface ResourceNode {
  id: string;
  type: 'cpu' | 'gpu' | 'memory' | 'network';
  capacity: number;
  currentLoad: number;
  efficiency: number; // 0-1 scale
  cost: number; // Resource cost per unit
  latency: number; // Access latency in ms
  reliability: number; // 0-1 reliability score
}

export interface WorkloadProfile {
  renderingIntensity: number; // 0-1
  memoryRequirement: number; // MB
  computeComplexity: number; // 0-1
  networkBandwidth: number; // Mbps
  latencySensitivity: number; // 0-1 (higher = more sensitive)
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface QuantumState {
  coherence: number; // 0-1
  entanglement: Map<string, string>; // Node relationships
  superposition: Array<{ nodeId: string; probability: number }>;
}

export class QuantumInspiredAutoScaler {
  private resourceNodes: Map<string, ResourceNode> = new Map();
  private quantumState: QuantumState;
  private optimizationHistory: Array<{
    timestamp: number;
    configuration: Map<string, number>;
    performance: number;
    cost: number;
  }> = [];
  
  private scalingInterval: number | null = null;
  private isScaling = false;

  constructor() {
    this.quantumState = {
      coherence: 1.0,
      entanglement: new Map(),
      superposition: []
    };
    
    this.initializeResourceNodes();
    this.startQuantumScaling();
  }

  /**
   * Initialize default resource nodes
   */
  private initializeResourceNodes(): void {
    // CPU Cluster
    this.addResourceNode({
      id: 'cpu-cluster-1',
      type: 'cpu',
      capacity: 100,
      currentLoad: 20,
      efficiency: 0.85,
      cost: 0.1,
      latency: 1,
      reliability: 0.99
    });

    // GPU Cluster
    this.addResourceNode({
      id: 'gpu-cluster-1',
      type: 'gpu',
      capacity: 100,
      currentLoad: 30,
      efficiency: 0.92,
      cost: 0.3,
      latency: 2,
      reliability: 0.98
    });

    // Memory Pool
    this.addResourceNode({
      id: 'memory-pool-1',
      type: 'memory',
      capacity: 16384, // 16GB
      currentLoad: 4096, // 4GB used
      efficiency: 0.95,
      cost: 0.05,
      latency: 0.1,
      reliability: 0.999
    });

    // Network Infrastructure
    this.addResourceNode({
      id: 'network-1',
      type: 'network',
      capacity: 1000, // 1Gbps
      currentLoad: 100, // 100Mbps used
      efficiency: 0.88,
      cost: 0.02,
      latency: 5,
      reliability: 0.97
    });
  }

  /**
   * Add a new resource node to the quantum system
   */
  addResourceNode(node: ResourceNode): void {
    this.resourceNodes.set(node.id, node);
    
    // Update quantum state
    this.updateQuantumEntanglement(node.id);
    this.updateSuperposition();
    
    console.log(`🌐 Added resource node: ${node.id} (${node.type})`);
  }

  /**
   * Start quantum-inspired auto-scaling
   */
  private startQuantumScaling(): void {
    this.scalingInterval = setInterval(() => {
      this.quantumScalingIteration();
    }, 5000) as unknown as number; // Every 5 seconds
    
    console.log('⚛️  Quantum-inspired auto-scaling started');
  }

  /**
   * Stop auto-scaling
   */
  stopScaling(): void {
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = null;
    }
  }

  /**
   * Perform one iteration of quantum-inspired scaling
   */
  private async quantumScalingIteration(): Promise<void> {
    if (this.isScaling) return;
    
    this.isScaling = true;
    
    try {
      // Measure quantum coherence
      this.updateQuantumCoherence();
      
      // Assess current workload
      const workload = this.assessCurrentWorkload();
      
      // Generate optimal configuration using quantum superposition
      const optimalConfig = await this.findOptimalConfiguration(workload);
      
      // Apply scaling decisions with quantum-inspired uncertainty
      await this.applyScalingDecisions(optimalConfig);
      
      // Update quantum entanglement based on performance
      this.updateQuantumEntanglement();
      
      // Record optimization result
      this.recordOptimization(optimalConfig);
      
    } catch (error) {
      console.error('Quantum scaling iteration failed:', error);
      this.handleQuantumDecoherence();
    } finally {
      this.isScaling = false;
    }
  }

  /**
   * Update quantum coherence based on system stability
   */
  private updateQuantumCoherence(): void {
    const nodes = Array.from(this.resourceNodes.values());
    
    // Calculate coherence based on load balance and efficiency
    const loadVariance = this.calculateLoadVariance(nodes);
    const avgEfficiency = nodes.reduce((sum, node) => sum + node.efficiency, 0) / nodes.length;
    
    // Coherence decreases with load imbalance and low efficiency
    this.quantumState.coherence = Math.max(0.1, avgEfficiency * (1 - loadVariance));
    
    if (this.quantumState.coherence < 0.5) {
      console.warn('⚠️  Quantum coherence degraded:', this.quantumState.coherence);
    }
  }

  /**
   * Calculate load variance across resource nodes
   */
  private calculateLoadVariance(nodes: ResourceNode[]): number {
    const loads = nodes.map(node => node.currentLoad / node.capacity);
    const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Assess current workload requirements
   */
  private assessCurrentWorkload(): WorkloadProfile {
    // In a real implementation, this would analyze actual workload metrics
    // For demonstration, we'll simulate varying workload patterns
    
    const time = Date.now() / 1000;
    const cyclicLoad = (Math.sin(time / 60) + 1) / 2; // 0-1 over 2 minutes
    
    return {
      renderingIntensity: 0.6 + 0.3 * cyclicLoad,
      memoryRequirement: 2048 + 1024 * cyclicLoad,
      computeComplexity: 0.7 + 0.2 * cyclicLoad,
      networkBandwidth: 50 + 30 * cyclicLoad,
      latencySensitivity: 0.8,
      priority: cyclicLoad > 0.7 ? 'high' : 'medium'
    };
  }

  /**
   * Find optimal resource configuration using quantum superposition
   */
  private async findOptimalConfiguration(workload: WorkloadProfile): Promise<Map<string, number>> {
    const configurations: Array<{config: Map<string, number>, score: number}> = [];
    
    // Generate multiple configuration candidates in superposition
    const candidates = this.generateConfigurationCandidates(workload, 8);
    
    // Evaluate each configuration
    for (const config of candidates) {
      const score = await this.evaluateConfiguration(config, workload);
      configurations.push({ config, score });
    }
    
    // Use quantum-inspired selection (probabilistic with bias toward better scores)
    const selectedConfig = this.quantumSelect(configurations);
    
    console.log(`⚛️  Selected configuration with score: ${selectedConfig.score.toFixed(3)}`);
    return selectedConfig.config;
  }

  /**
   * Generate configuration candidates using quantum-inspired randomness
   */
  private generateConfigurationCandidates(workload: WorkloadProfile, count: number): Map<string, number>[] {
    const candidates: Map<string, number>[] = [];
    
    for (let i = 0; i < count; i++) {
      const config = new Map<string, number>();
      
      for (const [nodeId, node] of this.resourceNodes) {
        // Use quantum superposition to determine allocation
        const allocationRange = this.getOptimalAllocationRange(node, workload);
        const allocation = this.quantumSample(allocationRange.min, allocationRange.max);
        
        config.set(nodeId, allocation);
      }
      
      candidates.push(config);
    }
    
    return candidates;
  }

  /**
   * Get optimal allocation range for a resource node
   */
  private getOptimalAllocationRange(node: ResourceNode, workload: WorkloadProfile): {min: number, max: number} {
    const baseAllocation = node.currentLoad;
    
    let demandMultiplier = 1.0;
    
    switch (node.type) {
      case 'cpu':
        demandMultiplier = workload.computeComplexity;
        break;
      case 'gpu':
        demandMultiplier = workload.renderingIntensity;
        break;
      case 'memory':
        demandMultiplier = workload.memoryRequirement / 2048; // Normalize to base 2GB
        break;
      case 'network':
        demandMultiplier = workload.networkBandwidth / 50; // Normalize to base 50Mbps
        break;
    }
    
    const targetAllocation = Math.min(node.capacity * 0.8, baseAllocation * demandMultiplier);
    const variance = targetAllocation * 0.2; // ±20% variance
    
    return {
      min: Math.max(0, targetAllocation - variance),
      max: Math.min(node.capacity, targetAllocation + variance)
    };
  }

  /**
   * Sample from a range using quantum-inspired probability distribution
   */
  private quantumSample(min: number, max: number): number {
    // Use quantum coherence to influence randomness
    const coherenceInfluence = this.quantumState.coherence;
    const uniformRandom = Math.random();
    
    // Higher coherence leads to more centered distribution
    const gaussianRandom = this.boxMullerTransform();
    const centerBias = 0.5 + 0.5 * coherenceInfluence;
    
    const biasedRandom = uniformRandom * (1 - centerBias) + gaussianRandom * centerBias;
    return min + (max - min) * Math.max(0, Math.min(1, biasedRandom));
  }

  /**
   * Box-Muller transformation for Gaussian random numbers
   */
  private boxMullerTransform(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, (z0 + 3) / 6));
  }

  /**
   * Evaluate a configuration's fitness
   */
  private async evaluateConfiguration(config: Map<string, number>, workload: WorkloadProfile): Promise<number> {
    let performanceScore = 0;
    let costScore = 0;
    let reliabilityScore = 0;
    
    for (const [nodeId, allocation] of config) {
      const node = this.resourceNodes.get(nodeId);
      if (!node) continue;
      
      // Performance evaluation
      const utilizationRatio = allocation / node.capacity;
      const efficiency = node.efficiency * (1 - Math.pow(utilizationRatio, 2)); // Efficiency drops with high utilization
      performanceScore += efficiency * this.getNodeWeight(node.type, workload);
      
      // Cost evaluation
      costScore += allocation * node.cost;
      
      // Reliability evaluation
      const reliabilityFactor = node.reliability * (1 - utilizationRatio * 0.5); // Reliability drops with utilization
      reliabilityScore += reliabilityFactor;
    }
    
    // Normalize scores
    const nodeCount = this.resourceNodes.size;
    performanceScore /= nodeCount;
    reliabilityScore /= nodeCount;
    
    // Combine scores with workload-based weights
    const priorityMultiplier = this.getPriorityMultiplier(workload.priority);
    const latencyPenalty = this.calculateLatencyPenalty(config, workload);
    
    return (performanceScore * 0.4 + reliabilityScore * 0.3 - costScore * 0.3) * priorityMultiplier - latencyPenalty;
  }

  /**
   * Get resource type weight based on workload
   */
  private getNodeWeight(nodeType: ResourceNode['type'], workload: WorkloadProfile): number {
    switch (nodeType) {
      case 'cpu': return workload.computeComplexity;
      case 'gpu': return workload.renderingIntensity;
      case 'memory': return Math.min(1, workload.memoryRequirement / 4096);
      case 'network': return Math.min(1, workload.networkBandwidth / 100);
      default: return 1.0;
    }
  }

  /**
   * Get priority multiplier
   */
  private getPriorityMultiplier(priority: WorkloadProfile['priority']): number {
    switch (priority) {
      case 'critical': return 2.0;
      case 'high': return 1.5;
      case 'medium': return 1.0;
      case 'low': return 0.7;
      default: return 1.0;
    }
  }

  /**
   * Calculate latency penalty for configuration
   */
  private calculateLatencyPenalty(config: Map<string, number>, workload: WorkloadProfile): number {
    let totalLatency = 0;
    let totalWeight = 0;
    
    for (const [nodeId, allocation] of config) {
      const node = this.resourceNodes.get(nodeId);
      if (!node) continue;
      
      const weight = allocation / node.capacity;
      totalLatency += node.latency * weight;
      totalWeight += weight;
    }
    
    const avgLatency = totalWeight > 0 ? totalLatency / totalWeight : 0;
    return avgLatency * workload.latencySensitivity * 0.1; // Scale penalty appropriately
  }

  /**
   * Quantum-inspired selection from configuration candidates
   */
  private quantumSelect(configurations: Array<{config: Map<string, number>, score: number}>): {config: Map<string, number>, score: number} {
    // Sort by score (highest first)
    configurations.sort((a, b) => b.score - a.score);
    
    // Create probability distribution with quantum-inspired weighting
    const probabilities: number[] = [];
    let totalProb = 0;
    
    for (let i = 0; i < configurations.length; i++) {
      // Higher scored configurations get exponentially higher probability
      const coherenceBoost = Math.pow(this.quantumState.coherence, 2);
      const prob = Math.exp(configurations[i].score * 2) * (1 + coherenceBoost);
      probabilities.push(prob);
      totalProb += prob;
    }
    
    // Normalize probabilities
    for (let i = 0; i < probabilities.length; i++) {
      probabilities[i] /= totalProb;
    }
    
    // Select based on quantum probability
    const random = Math.random();
    let cumulativeProb = 0;
    
    for (let i = 0; i < configurations.length; i++) {
      cumulativeProb += probabilities[i];
      if (random <= cumulativeProb) {
        return configurations[i];
      }
    }
    
    // Fallback to best configuration
    return configurations[0];
  }

  /**
   * Apply scaling decisions to resource nodes
   */
  private async applyScalingDecisions(config: Map<string, number>): Promise<void> {
    const changes: Array<{nodeId: string, oldAllocation: number, newAllocation: number}> = [];
    
    for (const [nodeId, newAllocation] of config) {
      const node = this.resourceNodes.get(nodeId);
      if (!node) continue;
      
      const oldAllocation = node.currentLoad;
      const change = Math.abs(newAllocation - oldAllocation);
      
      // Only apply significant changes (>5% of capacity)
      if (change > node.capacity * 0.05) {
        changes.push({ nodeId, oldAllocation, newAllocation });
        
        // Simulate resource allocation change
        node.currentLoad = newAllocation;
        
        // Update efficiency based on new utilization
        const utilizationRatio = newAllocation / node.capacity;
        node.efficiency = Math.max(0.3, 1.0 - Math.pow(utilizationRatio, 1.5) * 0.3);
      }
    }
    
    if (changes.length > 0) {
      console.log(`⚛️  Applied ${changes.length} scaling changes:`);
      changes.forEach(change => {
        const direction = change.newAllocation > change.oldAllocation ? '📈' : '📉';
        console.log(`   ${direction} ${change.nodeId}: ${change.oldAllocation.toFixed(0)} → ${change.newAllocation.toFixed(0)}`);
      });
    }
  }

  /**
   * Update quantum entanglement based on node relationships
   */
  private updateQuantumEntanglement(newNodeId?: string): void {
    // Create entanglement between nodes that work together frequently
    const nodes = Array.from(this.resourceNodes.keys());
    
    if (newNodeId) {
      // Entangle new node with existing nodes based on type compatibility
      const newNode = this.resourceNodes.get(newNodeId);
      if (newNode) {
        for (const existingNodeId of nodes) {
          if (existingNodeId === newNodeId) continue;
          
          const existingNode = this.resourceNodes.get(existingNodeId);
          if (existingNode && this.areNodesCompatible(newNode, existingNode)) {
            this.quantumState.entanglement.set(newNodeId, existingNodeId);
            this.quantumState.entanglement.set(existingNodeId, newNodeId);
          }
        }
      }
    }
    
    // Update entanglement strength based on usage correlation
    for (const [nodeA, nodeB] of this.quantumState.entanglement) {
      const correlation = this.calculateNodeCorrelation(nodeA, nodeB);
      if (correlation < 0.3) {
        // Remove weak entanglement
        this.quantumState.entanglement.delete(nodeA);
      }
    }
  }

  /**
   * Check if two nodes are compatible for entanglement
   */
  private areNodesCompatible(nodeA: ResourceNode, nodeB: ResourceNode): boolean {
    // CPU-GPU pairs work well together for rendering
    if ((nodeA.type === 'cpu' && nodeB.type === 'gpu') || (nodeA.type === 'gpu' && nodeB.type === 'cpu')) {
      return true;
    }
    
    // Memory works with both CPU and GPU
    if (nodeA.type === 'memory' || nodeB.type === 'memory') {
      return true;
    }
    
    // Network is compatible with all
    if (nodeA.type === 'network' || nodeB.type === 'network') {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate correlation between two nodes
   */
  private calculateNodeCorrelation(nodeIdA: string, nodeIdB: string): number {
    const nodeA = this.resourceNodes.get(nodeIdA);
    const nodeB = this.resourceNodes.get(nodeIdB);
    
    if (!nodeA || !nodeB) return 0;
    
    // Simple correlation based on load patterns
    const loadDiff = Math.abs((nodeA.currentLoad / nodeA.capacity) - (nodeB.currentLoad / nodeB.capacity));
    return Math.max(0, 1 - loadDiff);
  }

  /**
   * Update superposition state
   */
  private updateSuperposition(): void {
    this.quantumState.superposition = [];
    
    for (const [nodeId, node] of this.resourceNodes) {
      const utilizationRatio = node.currentLoad / node.capacity;
      const probability = node.efficiency * (1 - utilizationRatio); // Higher probability for efficient, underutilized nodes
      
      this.quantumState.superposition.push({ nodeId, probability });
    }
    
    // Normalize probabilities
    const totalProb = this.quantumState.superposition.reduce((sum, state) => sum + state.probability, 0);
    this.quantumState.superposition.forEach(state => {
      state.probability /= totalProb;
    });
  }

  /**
   * Handle quantum decoherence (system instability)
   */
  private handleQuantumDecoherence(): void {
    console.warn('⚠️  Quantum decoherence detected, applying stabilization');
    
    // Reset quantum state to stable configuration
    this.quantumState.coherence = 0.8;
    this.quantumState.entanglement.clear();
    this.updateSuperposition();
    
    // Apply conservative scaling to restore stability
    for (const [nodeId, node] of this.resourceNodes) {
      const targetLoad = node.capacity * 0.5; // 50% utilization for stability
      const adjustment = (targetLoad - node.currentLoad) * 0.2; // Gentle adjustment
      node.currentLoad = Math.max(0, Math.min(node.capacity, node.currentLoad + adjustment));
    }
  }

  /**
   * Record optimization results
   */
  private recordOptimization(configuration: Map<string, number>): void {
    const totalCost = Array.from(configuration.entries()).reduce((sum, [nodeId, allocation]) => {
      const node = this.resourceNodes.get(nodeId);
      return sum + (node ? allocation * node.cost : 0);
    }, 0);
    
    const performance = this.quantumState.coherence;
    
    this.optimizationHistory.push({
      timestamp: Date.now(),
      configuration: new Map(configuration),
      performance,
      cost: totalCost
    });
    
    // Keep only recent history
    if (this.optimizationHistory.length > 1000) {
      this.optimizationHistory.shift();
    }
  }

  /**
   * Get current quantum state
   */
  getQuantumState(): QuantumState {
    return {
      coherence: this.quantumState.coherence,
      entanglement: new Map(this.quantumState.entanglement),
      superposition: [...this.quantumState.superposition]
    };
  }

  /**
   * Get resource utilization summary
   */
  getResourceSummary(): {
    totalCapacity: Record<string, number>;
    currentUsage: Record<string, number>;
    efficiency: Record<string, number>;
    utilization: Record<string, number>;
  } {
    const summary = {
      totalCapacity: {} as Record<string, number>,
      currentUsage: {} as Record<string, number>,
      efficiency: {} as Record<string, number>,
      utilization: {} as Record<string, number>
    };
    
    for (const [nodeId, node] of this.resourceNodes) {
      summary.totalCapacity[nodeId] = node.capacity;
      summary.currentUsage[nodeId] = node.currentLoad;
      summary.efficiency[nodeId] = node.efficiency;
      summary.utilization[nodeId] = node.currentLoad / node.capacity;
    }
    
    return summary;
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalOptimizations: number;
    averageCoherence: number;
    averageCost: number;
    recentHistory: typeof this.optimizationHistory;
  } {
    const recent = this.optimizationHistory.slice(-20);
    const avgCoherence = recent.reduce((sum, opt) => sum + opt.performance, 0) / recent.length || 0;
    const avgCost = recent.reduce((sum, opt) => sum + opt.cost, 0) / recent.length || 0;
    
    return {
      totalOptimizations: this.optimizationHistory.length,
      averageCoherence: Math.round(avgCoherence * 1000) / 1000,
      averageCost: Math.round(avgCost * 100) / 100,
      recentHistory: recent
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopScaling();
    this.resourceNodes.clear();
    this.optimizationHistory.length = 0;
    console.log('🧹 Quantum-Inspired Auto-Scaler disposed');
  }
}

// Global quantum auto-scaler instance
export const quantumAutoScaler = new QuantumInspiredAutoScaler();