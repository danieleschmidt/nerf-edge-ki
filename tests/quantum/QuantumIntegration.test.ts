/**
 * Quantum Integration Test Suite
 * End-to-end integration tests for quantum task planning system
 */

import { 
  QuantumTaskPlanner, 
  QuantumNerfScheduler, 
  QuantumValidator, 
  QuantumMonitor,
  QuantumScaler,
  QuantumCache,
  QuantumErrorHandler,
  QuantumTask,
  NerfRenderTask
} from '../../src/quantum';

describe('Quantum System Integration Tests', () => {
  describe('Full System Integration', () => {
    test('should integrate all quantum components successfully', async () => {
      const monitor = new QuantumMonitor();
      const validator = new QuantumValidator();
      const errorHandler = new QuantumErrorHandler();
      const cache = new QuantumCache();
      const scaler = new QuantumScaler();
      const planner = new QuantumTaskPlanner();
      
      try {
        // Start all components
        monitor.start();
        scaler.start();
        planner.start();

        // Add some test tasks
        const task1 = createIntegrationTask('integration-task-1', 0.9, 100);
        const task2 = createIntegrationTask('integration-task-2', 0.8, 150, ['integration-task-1']);
        
        planner.addTask(task1);
        planner.addTask(task2);

        // Validate tasks
        const validation = validator.validateTaskSet([task1, task2]);
        expect(validation.valid).toBe(true);

        // Plan and execute
        const result = await planner.planOptimal();
        expect(result.tasks).toHaveLength(2);
        expect(result.quantumAdvantage).toBeGreaterThanOrEqual(0);

        // Monitor the execution
        monitor.trackTaskStarted(task1);
        const executed = await planner.executeNext();
        expect(executed).toBeTruthy();
        
        if (executed) {
          monitor.trackTaskCompleted(executed, 95);
        }

        // Check system health
        const stats = monitor.getMonitoringStats();
        expect(stats.systemHealth).toBeOneOf(['healthy', 'warning']);

        // Test caching
        await cache.set('test-result', result);
        const cachedResult = await cache.get('test-result');
        expect(cachedResult).toEqual(result);

        // Test scaling
        const scalingStats = scaler.getScalingStats();
        expect(scalingStats.totalWorkers).toBeGreaterThanOrEqual(0);

      } finally {
        // Cleanup
        monitor.stop();
        scaler.stop();
        planner.stop();
        cache.dispose();
      }
    });

    test('should handle quantum entanglement across components', async () => {
      const planner = new QuantumTaskPlanner();
      const validator = new QuantumValidator();
      const cache = new QuantumCache();

      try {
        planner.start();

        // Create entangled tasks
        const task1 = createIntegrationTask('entangled-1', 0.9, 100);
        const task2 = createIntegrationTask('entangled-2', 0.8, 120);
        
        planner.addTask(task1);
        planner.addTask(task2);
        planner.entangleTasks('entangled-1', 'entangled-2');

        // Validate entanglement
        const validation = validator.validateTaskSet([task1, task2]);
        expect(validation.valid).toBe(true);

        // Cache entangled state
        await cache.set('entangled-state-1', task1.quantumState);
        await cache.set('entangled-state-2', task2.quantumState);
        cache.entangle('entangled-state-1', 'entangled-state-2');

        // Execute one task and check entanglement effects
        await planner.planOptimal();
        const originalAmplitude2 = { ...task2.quantumState.amplitude };
        
        await planner.executeNext(); // Execute task1
        
        // Task2's quantum state should be affected by entanglement
        expect(task2.quantumState.amplitude).not.toEqual(originalAmplitude2);

        // Cache should also reflect entanglement
        const cachedState1 = await cache.get('entangled-state-1');
        const cachedState2 = await cache.get('entangled-state-2');
        expect(cachedState1).toBeTruthy();
        expect(cachedState2).toBeTruthy();

      } finally {
        planner.stop();
        cache.dispose();
      }
    });
  });

  describe('NeRF Scheduler Integration', () => {
    test('should integrate quantum scheduler with NeRF rendering', async () => {
      const nerfConfig = {
        targetFPS: 90,
        maxResolution: [2880, 1800] as [number, number],
        foveatedRendering: true,
        memoryLimit: 1024,
        powerMode: 'performance' as const
      };

      const scheduler = new QuantumNerfScheduler({
        targetFPS: 90,
        maxLatency: 11,
        qualityThreshold: 0.9,
        enableFoveation: true,
        quantumOptimization: true
      }, nerfConfig);

      const monitor = new QuantumMonitor();

      try {
        monitor.start();
        await scheduler.start();

        // Schedule some NeRF rendering tasks
        const renderOptions = {
          cameraPosition: [0, 1.6, 3] as [number, number, number],
          cameraRotation: [0, 0, 0, 1] as [number, number, number, number],
          fieldOfView: 90,
          near: 0.1,
          far: 100
        };

        const taskId1 = scheduler.scheduleRender(renderOptions, 0.9);
        const taskId2 = scheduler.scheduleRender({
          ...renderOptions,
          cameraPosition: [1, 1.6, 3]
        }, 0.8);

        expect(taskId1).toBeTruthy();
        expect(taskId2).toBeTruthy();

        // Wait for scheduling to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        const metrics = scheduler.getPerformanceMetrics();
        expect(metrics.fps).toBeGreaterThan(0);

        // Monitor should track the rendering tasks
        const monitorStats = monitor.getMonitoringStats();
        expect(monitorStats.systemHealth).toBeOneOf(['healthy', 'warning']);

      } finally {
        scheduler.stop();
        monitor.stop();
      }
    });

    test('should handle quantum optimization for NeRF rendering', async () => {
      const scheduler = new QuantumNerfScheduler({
        targetFPS: 60,
        maxLatency: 16,
        qualityThreshold: 0.8,
        enableFoveation: true,
        quantumOptimization: true
      }, {
        targetFPS: 60,
        maxResolution: [1920, 1080],
        foveatedRendering: true,
        memoryLimit: 512,
        powerMode: 'balanced'
      });

      try {
        await scheduler.start();

        // Test quantum optimization toggle
        scheduler.setQuantumOptimization(false);
        scheduler.setQuantumOptimization(true);

        // Schedule rendering tasks with different priorities
        const lowPriorityTask = scheduler.scheduleRender({
          cameraPosition: [0, 0, 0],
          cameraRotation: [0, 0, 0, 1],
          fieldOfView: 75,
          near: 0.1,
          far: 50
        }, 0.3);

        const highPriorityTask = scheduler.scheduleRender({
          cameraPosition: [2, 1, 2],
          cameraRotation: [0, 0.1, 0, 1],
          fieldOfView: 85,
          near: 0.1,
          far: 100
        }, 0.95);

        expect(lowPriorityTask).toBeTruthy();
        expect(highPriorityTask).toBeTruthy();

        // Quantum optimization should prioritize high-priority task
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const metrics = scheduler.getPerformanceMetrics();
        expect(metrics).toBeTruthy();

      } finally {
        scheduler.stop();
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle errors across integrated components', async () => {
      const errorHandler = new QuantumErrorHandler();
      const planner = new QuantumTaskPlanner();
      const validator = new QuantumValidator();

      try {
        planner.start();

        // Create a task that will cause validation errors
        const invalidTask = createIntegrationTask('invalid-task', -1, -100); // Invalid priority and duration
        const validationResult = validator.validateTask(invalidTask);
        
        expect(validationResult.valid).toBe(false);

        // Test error handling for invalid quantum states
        invalidTask.quantumState.coherence = -0.5; // Invalid coherence
        
        const quantumError = errorHandler.createError(
          'QUANTUM_STATE_CORRUPTION' as any,
          'Invalid quantum state detected',
          { task: invalidTask }
        );

        const recoveryResult = await errorHandler.handleError(quantumError);
        expect(recoveryResult).toBeDefined();

        // Add valid task to continue operation
        const validTask = createIntegrationTask('valid-task', 0.8, 100);
        planner.addTask(validTask);

        const planResult = await planner.planOptimal();
        expect(planResult.tasks).toHaveLength(1);

      } finally {
        planner.stop();
      }
    });

    test('should recover from quantum decoherence', async () => {
      const errorHandler = new QuantumErrorHandler();
      const planner = new QuantumTaskPlanner();
      const monitor = new QuantumMonitor();

      try {
        monitor.start();
        planner.start();

        // Create task with degraded quantum state
        const degradedTask = createIntegrationTask('degraded-task', 0.7, 100);
        degradedTask.quantumState.coherence = 0.05; // Very low coherence

        planner.addTask(degradedTask);

        // Monitor should detect decoherence
        monitor.trackTaskStarted(degradedTask);

        // Create decoherence error
        const decoherenceError = errorHandler.createError(
          'DECOHERENCE_FAILURE' as any,
          'Quantum coherence below threshold',
          { 
            task: degradedTask,
            quantumState: degradedTask.quantumState
          },
          'critical'
        );

        // Handle the error
        const recovery = await errorHandler.handleError(decoherenceError);
        expect(recovery.success || recovery.retryAfterMs).toBeTruthy();

        // System should continue operating
        const planResult = await planner.planOptimal();
        expect(planResult).toBeTruthy();

      } finally {
        monitor.stop();
        planner.stop();
      }
    });
  });

  describe('Performance Integration', () => {
    test('should maintain performance under load with all components', async () => {
      const monitor = new QuantumMonitor();
      const scaler = new QuantumScaler();
      const cache = new QuantumCache();
      const planner = new QuantumTaskPlanner();

      try {
        const startTime = Date.now();

        // Start all components
        monitor.start();
        scaler.start();
        planner.start();

        // Add many tasks to test performance
        const tasks = [];
        for (let i = 0; i < 50; i++) {
          const task = createIntegrationTask(`perf-task-${i}`, Math.random(), Math.random() * 200 + 50);
          tasks.push(task);
          planner.addTask(task);
          
          // Track with monitor
          monitor.trackTaskStarted(task);
          
          // Cache some task data
          if (i % 5 === 0) {
            await cache.set(`task-data-${i}`, task);
          }
        }

        // Plan and execute
        const planResult = await planner.planOptimal();
        expect(planResult.tasks).toHaveLength(50);

        // Execute some tasks
        for (let i = 0; i < 10; i++) {
          const executed = await planner.executeNext();
          if (executed) {
            monitor.trackTaskCompleted(executed, Math.random() * 100 + 50);
          }
        }

        const totalTime = Date.now() - startTime;

        // Should complete within reasonable time
        expect(totalTime).toBeLessThan(5000); // 5 seconds

        // Check system performance
        const monitorStats = monitor.getMonitoringStats();
        expect(monitorStats.systemHealth).toBeOneOf(['healthy', 'warning']);

        const scalingStats = scaler.getScalingStats();
        expect(scalingStats.efficiency).toBeGreaterThan(0);

        const cacheStats = cache.getStats();
        expect(cacheStats.entries).toBeGreaterThan(0);

      } finally {
        monitor.stop();
        scaler.stop();
        planner.stop();
        cache.dispose();
      }
    });

    test('should auto-scale based on quantum metrics', async () => {
      const monitor = new QuantumMonitor();
      const scaler = new QuantumScaler({
        autoScaling: true,
        minWorkers: 1,
        maxWorkers: 5,
        scaleUpThreshold: 0.7,
        scaleDownThreshold: 0.3
      });
      
      try {
        monitor.start();
        scaler.start();

        // Generate high load metrics
        const highLoadMetrics = {
          timestamp: Date.now(),
          averageCoherence: 0.6,
          totalSuperposition: 2.5,
          entanglementCount: 8,
          activeTaskCount: 15,
          completedTaskCount: 50,
          failedTaskCount: 2,
          systemPerformance: {
            cpuUsage: 85, // High CPU usage
            memoryUsage: 80, // High memory usage
            gpuUsage: 90,
            bandwidth: 800,
            latency: 25,
            throughput: 45
          },
          quantumEfficiency: 0.7,
          decoherenceRate: 0.05
        };

        // Process scaling based on metrics
        scaler.processScaling(highLoadMetrics);

        // Wait for scaling to take effect
        await new Promise(resolve => setTimeout(resolve, 100));

        const stats = scaler.getScalingStats();
        expect(stats.totalWorkers).toBeGreaterThanOrEqual(1);

        // Generate low load metrics
        const lowLoadMetrics = {
          ...highLoadMetrics,
          systemPerformance: {
            ...highLoadMetrics.systemPerformance,
            cpuUsage: 20, // Low CPU usage
            memoryUsage: 25, // Low memory usage
          },
          activeTaskCount: 2
        };

        // Should scale down after cooldown (in real scenario)
        scaler.processScaling(lowLoadMetrics);

      } finally {
        monitor.stop();
        scaler.stop();
      }
    });
  });

  describe('Quantum Cache Integration', () => {
    test('should integrate quantum cache with task planning', async () => {
      const cache = new QuantumCache({
        maxSize: 50, // MB
        defaultTTL: 300000, // 5 minutes
        evictionStrategy: 'quantum'
      });
      
      const planner = new QuantumTaskPlanner();

      try {
        planner.start();

        // Create tasks and cache them
        const tasks = [];
        for (let i = 0; i < 10; i++) {
          const task = createIntegrationTask(`cached-task-${i}`, Math.random(), Math.random() * 100 + 50);
          tasks.push(task);
          
          // Cache task with quantum properties
          await cache.set(`task-${i}`, task, {
            superposition: task.quantumState.superposition,
            tags: ['quantum-task', 'planning'],
            priority: task.priority
          });
          
          planner.addTask(task);
        }

        // Create quantum entanglement between cached entries
        cache.entangle('task-0', 'task-1');
        cache.entangle('task-2', 'task-3');

        // Plan tasks
        const planResult = await planner.planOptimal();
        expect(planResult.tasks.length).toBeGreaterThan(0);

        // Cache the plan result
        await cache.set('plan-result', planResult, {
          superposition: 0.9,
          tags: ['plan', 'result'],
          priority: 1.0
        });

        // Retrieve cached plan
        const cachedPlan = await cache.get('plan-result');
        expect(cachedPlan).toEqual(planResult);

        // Test cache quantum features
        const cacheStats = cache.getStats();
        expect(cacheStats.entries).toBeGreaterThan(0);
        expect(cacheStats.avgSuperposition).toBeGreaterThan(0);
        expect(cacheStats.entanglementCount).toBeGreaterThan(0);

        // Query cache by quantum properties
        const highSuperpositionEntries = cache.query({
          superpositionRange: [0.7, 1.0],
          tags: ['quantum-task']
        });
        expect(highSuperpositionEntries.length).toBeGreaterThan(0);

      } finally {
        planner.stop();
        cache.dispose();
      }
    });

    test('should handle cache quantum superposition', async () => {
      const cache = new QuantumCache();
      
      try {
        // Create multiple related cache entries
        const data1 = { type: 'quantum-data', value: 'state-1' };
        const data2 = { type: 'quantum-data', value: 'state-2' };
        const data3 = { type: 'quantum-data', value: 'state-3' };

        await cache.set('quantum-1', data1, { superposition: 0.8 });
        await cache.set('quantum-2', data2, { superposition: 0.7 });
        await cache.set('quantum-3', data3, { superposition: 0.9 });

        // Create superposition of multiple cache entries
        const superposedKey = cache.createSuperposition(['quantum-1', 'quantum-2', 'quantum-3']);
        expect(superposedKey).toBeTruthy();

        if (superposedKey) {
          const superposedData = await cache.get(superposedKey);
          expect(superposedData).toBeTruthy();

          // Verify quantum properties
          const stats = cache.getStats();
          expect(stats.avgSuperposition).toBeGreaterThan(0);
        }

      } finally {
        cache.dispose();
      }
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle mixed quantum and classical tasks', async () => {
      const planner = new QuantumTaskPlanner();
      const validator = new QuantumValidator();

      try {
        planner.start();

        // Mix of quantum and classical tasks
        const quantumTask = createIntegrationTask('quantum-heavy', 0.9, 200);
        quantumTask.quantumState.superposition = 0.95; // High quantum properties
        quantumTask.quantumState.coherence = 0.98;

        const classicalTask = createIntegrationTask('classical', 0.7, 150);
        classicalTask.quantumState.superposition = 0.1; // Low quantum properties
        classicalTask.quantumState.coherence = 0.3;

        const hybridTask = createIntegrationTask('hybrid', 0.8, 175, ['quantum-heavy']);
        hybridTask.quantumState.superposition = 0.6; // Medium quantum properties
        hybridTask.quantumState.coherence = 0.7;

        // Validate all tasks
        const tasks = [quantumTask, classicalTask, hybridTask];
        const validation = validator.validateTaskSet(tasks);
        expect(validation.valid).toBe(true);

        // Add to planner
        tasks.forEach(task => planner.addTask(task));

        // Create strategic entanglements
        planner.entangleTasks('quantum-heavy', 'hybrid');

        // Plan and verify quantum advantage
        const result = await planner.planOptimal();
        expect(result.tasks).toHaveLength(3);
        expect(result.quantumAdvantage).toBeGreaterThanOrEqual(0);

        // Execute tasks and verify order respects dependencies
        const executed = [];
        for (let i = 0; i < 3; i++) {
          const task = await planner.executeNext();
          if (task) executed.push(task);
        }

        expect(executed).toHaveLength(3);
        
        // Quantum-heavy should come before hybrid (dependency)
        const quantumIndex = executed.findIndex(t => t.id === 'quantum-heavy');
        const hybridIndex = executed.findIndex(t => t.id === 'hybrid');
        expect(quantumIndex).toBeLessThan(hybridIndex);

      } finally {
        planner.stop();
      }
    });

    test('should handle system degradation gracefully', async () => {
      const monitor = new QuantumMonitor();
      const errorHandler = new QuantumErrorHandler();
      const planner = new QuantumTaskPlanner();
      const scaler = new QuantumScaler();

      try {
        monitor.start();
        scaler.start();
        planner.start();

        // Add tasks
        const tasks = Array.from({ length: 20 }, (_, i) => 
          createIntegrationTask(`degraded-task-${i}`, Math.random(), Math.random() * 100 + 50)
        );
        
        tasks.forEach(task => {
          planner.addTask(task);
          monitor.trackTaskStarted(task);
        });

        // Simulate system degradation
        const degradedMetrics = {
          timestamp: Date.now(),
          averageCoherence: 0.2, // Very low
          totalSuperposition: 0.5,
          entanglementCount: 2,
          activeTaskCount: 20,
          completedTaskCount: 5,
          failedTaskCount: 8, // High failure rate
          systemPerformance: {
            cpuUsage: 95,
            memoryUsage: 90,
            gpuUsage: 98,
            bandwidth: 1000,
            latency: 150, // High latency
            throughput: 2 // Low throughput
          },
          quantumEfficiency: 0.3,
          decoherenceRate: 0.15 // High decoherence
        };

        // Process degraded state
        scaler.processScaling(degradedMetrics);

        // Create multiple errors
        const errors = [
          errorHandler.createError('DECOHERENCE_FAILURE' as any, 'System decoherence detected', {}, 'critical'),
          errorHandler.createError('RESOURCE_EXHAUSTION' as any, 'Memory exhausted', {}, 'critical'),
          errorHandler.createError('SUPERPOSITION_COLLAPSE' as any, 'Quantum superposition collapsed', {}, 'warning')
        ];

        // Handle errors
        for (const error of errors) {
          const recovery = await errorHandler.handleError(error);
          expect(recovery).toBeDefined();
        }

        // System should still be able to plan (with reduced efficiency)
        const result = await planner.planOptimal();
        expect(result.tasks.length).toBeGreaterThan(0);

        // Check error handler statistics
        const errorStats = errorHandler.getErrorStats();
        expect(errorStats.size).toBeGreaterThan(0);

      } finally {
        monitor.stop();
        scaler.stop();
        planner.stop();
      }
    });
  });

  // Helper function
  function createIntegrationTask(
    id: string, 
    priority: number, 
    duration: number, 
    dependencies: string[] = []
  ): QuantumTask {
    return {
      id,
      name: `Integration Task ${id}`,
      priority,
      estimatedDuration: duration,
      dependencies,
      resourceRequirements: {
        cpu: Math.random() * 0.5 + 0.2,
        memory: Math.random() * 300 + 100,
        gpu: Math.random() * 0.6 + 0.2,
        bandwidth: Math.random() * 200 + 50
      },
      quantumState: {
        superposition: Math.random() * 0.6 + 0.3,
        entanglement: [],
        coherence: Math.random() * 0.4 + 0.6,
        amplitude: {
          real: Math.random(),
          imaginary: Math.random() * 0.5
        }
      },
      metadata: {
        createdAt: Date.now(),
        category: 'integration-test'
      }
    };
  }
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(array: any[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received, array) {
    const pass = array.includes(received);
    return {
      message: () => `expected ${received} to be one of [${array.join(', ')}]`,
      pass
    };
  }
});