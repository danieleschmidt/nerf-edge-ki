import { AdvancedLoadBalancer, LoadBalancingStrategy, WorkerNode, LoadBalancingTask } from '../../src/scaling/AdvancedLoadBalancer';

describe('AdvancedLoadBalancer', () => {
  let loadBalancer: AdvancedLoadBalancer;
  let mockNodes: WorkerNode[];

  beforeEach(() => {
    loadBalancer = new AdvancedLoadBalancer(LoadBalancingStrategy.PREDICTIVE);
    
    mockNodes = [
      {
        id: 'node-1',
        endpoint: 'http://node1:8080',
        region: 'us-east-1',
        capabilities: {
          maxMemory: 4096,
          maxGPUMemory: 8192,
          computeUnits: 10,
          supportedFormats: ['nerf', 'mesh', 'pointcloud']
        },
        currentLoad: {
          activeTasks: 2,
          memoryUsage: 1024,
          gpuUsage: 30,
          cpuUsage: 45,
          responseTime: 150
        },
        healthStatus: 'healthy',
        lastHealthCheck: Date.now(),
        priority: 8
      },
      {
        id: 'node-2',
        endpoint: 'http://node2:8080',
        region: 'us-west-2',
        capabilities: {
          maxMemory: 8192,
          maxGPUMemory: 16384,
          computeUnits: 15,
          supportedFormats: ['nerf', 'mesh']
        },
        currentLoad: {
          activeTasks: 1,
          memoryUsage: 512,
          gpuUsage: 15,
          cpuUsage: 25,
          responseTime: 120
        },
        healthStatus: 'healthy',
        lastHealthCheck: Date.now(),
        priority: 9
      },
      {
        id: 'node-3',
        endpoint: 'http://node3:8080',
        region: 'eu-west-1',
        capabilities: {
          maxMemory: 2048,
          maxGPUMemory: 4096,
          computeUnits: 5,
          supportedFormats: ['nerf']
        },
        currentLoad: {
          activeTasks: 3,
          memoryUsage: 1800,
          gpuUsage: 80,
          cpuUsage: 85,
          responseTime: 300
        },
        healthStatus: 'degraded',
        lastHealthCheck: Date.now(),
        priority: 5
      }
    ];

    // Register all nodes
    mockNodes.forEach(node => loadBalancer.registerNode(node));
  });

  describe('node registration', () => {
    it('should register new nodes', () => {
      const newNode: WorkerNode = {
        id: 'node-4',
        endpoint: 'http://node4:8080',
        region: 'ap-south-1',
        capabilities: {
          maxMemory: 4096,
          maxGPUMemory: 8192,
          computeUnits: 12,
          supportedFormats: ['nerf', 'mesh']
        },
        currentLoad: {
          activeTasks: 0,
          memoryUsage: 100,
          gpuUsage: 5,
          cpuUsage: 10,
          responseTime: 50
        },
        healthStatus: 'healthy',
        lastHealthCheck: Date.now(),
        priority: 7
      };

      loadBalancer.registerNode(newNode);
      
      const stats = loadBalancer.getClusterStats();
      expect(stats.totalNodes).toBe(4);
    });

    it('should unregister nodes', () => {
      loadBalancer.unregisterNode('node-1');
      
      const stats = loadBalancer.getClusterStats();
      expect(stats.totalNodes).toBe(2);
    });
  });

  describe('task assignment', () => {
    it('should select appropriate node for task', async () => {
      const task: LoadBalancingTask = {
        id: 'task-1',
        type: 'render',
        priority: 'high',
        resourceRequirements: {
          memory: 1024,
          gpuMemory: 2048,
          computeUnits: 8,
          estimatedDuration: 30
        }
      };

      const result = await loadBalancer.selectNode(task);

      expect(result.selectedNode).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.estimatedCompletionTime).toBeGreaterThan(0);
    });

    it('should respect task affinity constraints', async () => {
      const task: LoadBalancingTask = {
        id: 'task-2',
        type: 'render',
        priority: 'medium',
        resourceRequirements: {
          memory: 512,
          gpuMemory: 1024,
          computeUnits: 3,
          estimatedDuration: 15
        },
        affinity: {
          preferredRegions: ['us-east-1'],
          excludeNodes: ['node-2']
        }
      };

      const result = await loadBalancer.selectNode(task);

      expect(result.selectedNode.region).toBe('us-east-1');
      expect(result.selectedNode.id).not.toBe('node-2');
    });

    it('should filter out nodes with insufficient resources', async () => {
      const highResourceTask: LoadBalancingTask = {
        id: 'task-3',
        type: 'training',
        priority: 'critical',
        resourceRequirements: {
          memory: 10000, // Exceeds all node capabilities
          gpuMemory: 20000,
          computeUnits: 20,
          estimatedDuration: 120
        }
      };

      await expect(loadBalancer.selectNode(highResourceTask))
        .rejects.toThrow('No nodes meet task requirements');
    });

    it('should handle nodes with required capabilities', async () => {
      const task: LoadBalancingTask = {
        id: 'task-4',
        type: 'optimization',
        priority: 'medium',
        resourceRequirements: {
          memory: 512,
          gpuMemory: 1024,
          computeUnits: 5,
          estimatedDuration: 45
        },
        affinity: {
          requireCapabilities: ['pointcloud']
        }
      };

      const result = await loadBalancer.selectNode(task);

      expect(result.selectedNode.capabilities.supportedFormats).toContain('pointcloud');
    });
  });

  describe('load balancing strategies', () => {
    it('should use round robin strategy', async () => {
      const roundRobinBalancer = new AdvancedLoadBalancer(LoadBalancingStrategy.ROUND_ROBIN);
      mockNodes.forEach(node => roundRobinBalancer.registerNode(node));

      const task: LoadBalancingTask = {
        id: 'task-rr',
        type: 'render',
        priority: 'low',
        resourceRequirements: {
          memory: 256,
          gpuMemory: 512,
          computeUnits: 2,
          estimatedDuration: 10
        }
      };

      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await roundRobinBalancer.selectNode(task);
        results.push(result.selectedNode.id);
      }

      // Should cycle through different nodes
      expect(new Set(results).size).toBeGreaterThan(1);
    });

    it('should use least connections strategy', async () => {
      const leastConnBalancer = new AdvancedLoadBalancer(LoadBalancingStrategy.LEAST_CONNECTIONS);
      mockNodes.forEach(node => leastConnBalancer.registerNode(node));

      const task: LoadBalancingTask = {
        id: 'task-lc',
        type: 'render',
        priority: 'medium',
        resourceRequirements: {
          memory: 256,
          gpuMemory: 512,
          computeUnits: 2,
          estimatedDuration: 10
        }
      };

      const result = await leastConnBalancer.selectNode(task);

      // Should select node-2 which has least active tasks (1)
      expect(result.selectedNode.id).toBe('node-2');
    });
  });

  describe('metrics and monitoring', () => {
    it('should update node metrics', () => {
      const initialResponseTime = mockNodes[0].currentLoad.responseTime;
      
      loadBalancer.updateNodeMetrics('node-1', {
        responseTime: 200,
        cpuUsage: 60
      });

      const stats = loadBalancer.getClusterStats();
      expect(stats.averageResponseTime).not.toBe(initialResponseTime);
    });

    it('should provide cluster statistics', () => {
      const stats = loadBalancer.getClusterStats();

      expect(stats.totalNodes).toBe(3);
      expect(stats.healthyNodes).toBe(2); // node-3 is degraded
      expect(stats.totalCapacity).toBe(30); // 10 + 15 + 5
      expect(stats.currentUtilization).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.recommendedActions.length).toBeGreaterThanOrEqual(0);
    });

    it('should mark unhealthy nodes based on response time', () => {
      // Update node with very high response time
      loadBalancer.updateNodeMetrics('node-1', {
        responseTime: 6000, // > 5000ms threshold
        cpuUsage: 95
      });

      const stats = loadBalancer.getClusterStats();
      expect(stats.healthyNodes).toBeLessThan(stats.totalNodes);
    });
  });

  describe('predictive scaling', () => {
    it('should predict load and recommend scaling', () => {
      const prediction = loadBalancer.predictAndScale();

      expect(prediction.prediction.timeframe).toBe(300);
      expect(prediction.prediction.expectedLoad).toBeGreaterThan(0);
      expect(prediction.prediction.confidence).toBeGreaterThanOrEqual(0.1);
      expect(prediction.prediction.confidence).toBeLessThanOrEqual(0.9);
      expect(prediction.scalingRecommendation.action).toMatch(/scale_up|scale_down|maintain/);
      expect(prediction.scalingRecommendation.targetNodes).toBeGreaterThan(0);
      expect(prediction.scalingRecommendation.reasoning).toBeDefined();
    });

    it('should recommend scaling up under high load', () => {
      // Simulate high load by updating all nodes with high utilization
      mockNodes.forEach(node => {
        loadBalancer.updateNodeMetrics(node.id, {
          activeTasks: 8,
          cpuUsage: 90,
          gpuUsage: 85,
          responseTime: 500
        });
      });

      const prediction = loadBalancer.predictAndScale();
      
      // Should recommend scaling up or at least maintain
      expect(['scale_up', 'maintain']).toContain(prediction.scalingRecommendation.action);
    });
  });

  describe('error handling', () => {
    it('should handle no available nodes', async () => {
      // Unregister all nodes
      mockNodes.forEach(node => loadBalancer.unregisterNode(node.id));

      const task: LoadBalancingTask = {
        id: 'task-error',
        type: 'render',
        priority: 'medium',
        resourceRequirements: {
          memory: 512,
          gpuMemory: 1024,
          computeUnits: 5,
          estimatedDuration: 30
        }
      };

      await expect(loadBalancer.selectNode(task))
        .rejects.toThrow('No healthy worker nodes available');
    });

    it('should handle impossible resource requirements gracefully', async () => {
      const impossibleTask: LoadBalancingTask = {
        id: 'impossible-task',
        type: 'render',
        priority: 'high',
        resourceRequirements: {
          memory: 100000, // Way too much
          gpuMemory: 100000,
          computeUnits: 100,
          estimatedDuration: 60
        }
      };

      await expect(loadBalancer.selectNode(impossibleTask))
        .rejects.toThrow('No nodes meet task requirements');
    });
  });
});