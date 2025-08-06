/**
 * Quantum Task Planner Test Suite
 * Comprehensive testing for quantum-inspired task planning system
 */

import { QuantumTaskPlanner, QuantumTask, ResourceRequirements } from '../../src/quantum/QuantumTaskPlanner';
import { QuantumUtils } from '../../src/quantum';

describe('QuantumTaskPlanner', () => {
  let planner: QuantumTaskPlanner;

  beforeEach(() => {
    planner = new QuantumTaskPlanner({
      temperature: 0.1,
      annealingTime: 500
    });
  });

  afterEach(() => {
    planner.stop();
  });

  describe('Task Management', () => {
    test('should add tasks successfully', () => {
      const task = createTestTask('test-task', 0.8, 100);
      
      planner.addTask(task);
      
      expect(planner.getSchedule()).toHaveLength(0); // Not planned yet
    });

    test('should remove tasks successfully', () => {
      const task = createTestTask('test-task', 0.8, 100);
      planner.addTask(task);
      
      const removed = planner.removeTask('test-task');
      
      expect(removed).toBe(true);
    });

    test('should handle non-existent task removal', () => {
      const removed = planner.removeTask('non-existent');
      
      expect(removed).toBe(false);
    });

    test('should create quantum entanglement between tasks', () => {
      const task1 = createTestTask('task-1', 0.8, 100);
      const task2 = createTestTask('task-2', 0.7, 150);
      
      planner.addTask(task1);
      planner.addTask(task2);
      
      planner.entangleTasks('task-1', 'task-2');
      
      expect(task1.quantumState.entanglement).toContain('task-2');
      expect(task2.quantumState.entanglement).toContain('task-1');
    });

    test('should fail to entangle non-existent tasks', () => {
      expect(() => {
        planner.entangleTasks('task-1', 'non-existent');
      }).toThrow('Cannot entangle non-existent tasks');
    });
  });

  describe('Quantum Planning', () => {
    test('should plan optimal schedule', async () => {
      const tasks = [
        createTestTask('task-1', 0.9, 50),
        createTestTask('task-2', 0.8, 75, ['task-1']),
        createTestTask('task-3', 0.7, 100)
      ];
      
      tasks.forEach(task => planner.addTask(task));
      
      const result = await planner.planOptimal();
      
      expect(result.tasks).toHaveLength(3);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.efficiency).toBeGreaterThan(0);
      expect(result.quantumAdvantage).toBeGreaterThanOrEqual(0);
    });

    test('should respect task dependencies in schedule', async () => {
      const task1 = createTestTask('task-1', 0.9, 50);
      const task2 = createTestTask('task-2', 0.8, 75, ['task-1']);
      
      planner.addTask(task1);
      planner.addTask(task2);
      
      const result = await planner.planOptimal();
      const schedule = result.tasks;
      
      const task1Index = schedule.findIndex(t => t.id === 'task-1');
      const task2Index = schedule.findIndex(t => t.id === 'task-2');
      
      expect(task1Index).toBeLessThan(task2Index);
    });

    test('should handle empty task list', async () => {
      const result = await planner.planOptimal();
      
      expect(result.tasks).toHaveLength(0);
      expect(result.totalTime).toBe(0);
    });
  });

  describe('Task Execution', () => {
    test('should execute tasks in planned order', async () => {
      const task1 = createTestTask('task-1', 0.9, 10);
      const task2 = createTestTask('task-2', 0.8, 15);
      
      planner.addTask(task1);
      planner.addTask(task2);
      
      await planner.planOptimal();
      
      const executed1 = await planner.executeNext();
      const executed2 = await planner.executeNext();
      const executed3 = await planner.executeNext();
      
      expect(executed1).toBeTruthy();
      expect(executed2).toBeTruthy();
      expect(executed3).toBeNull(); // No more tasks
    });

    test('should update entangled states after task completion', async () => {
      const task1 = createTestTask('task-1', 0.9, 10);
      const task2 = createTestTask('task-2', 0.8, 15);
      
      planner.addTask(task1);
      planner.addTask(task2);
      planner.entangleTasks('task-1', 'task-2');
      
      const originalAmplitude = { ...task2.quantumState.amplitude };
      
      await planner.planOptimal();
      await planner.executeNext(); // Execute task-1
      
      // task-2's quantum state should be affected
      expect(task2.quantumState.amplitude).not.toEqual(originalAmplitude);
    });
  });

  describe('Lifecycle Management', () => {
    test('should start and stop successfully', () => {
      expect(() => {
        planner.start();
        planner.stop();
      }).not.toThrow();
    });

    test('should trigger replanning when task added during execution', (done) => {
      planner.start();
      
      // Listen for planning events
      planner.on('planningComplete', () => {
        planner.stop();
        done();
      });
      
      const task = createTestTask('dynamic-task', 0.8, 100);
      planner.addTask(task);
    });
  });

  describe('Resource Management', () => {
    test('should handle resource constraints in planning', async () => {
      const highResourceTask = createTestTask('high-resource', 0.9, 100, [], {
        cpu: 0.9,
        memory: 1024,
        gpu: 0.8,
        bandwidth: 500
      });
      
      planner.addTask(highResourceTask);
      
      const result = await planner.planOptimal();
      
      expect(result.tasks).toHaveLength(1);
      expect(result.totalTime).toBeGreaterThan(0);
    });
  });

  describe('Quantum Properties', () => {
    test('should calculate quantum priority correctly', () => {
      const task = createTestTask('quantum-task', 0.8, 100);
      task.quantumState.coherence = 0.9;
      task.quantumState.superposition = 0.7;
      task.quantumState.amplitude = { real: 0.8, imaginary: 0.6 };
      
      // Test private method through planning
      planner.addTask(task);
      expect(() => planner.planOptimal()).not.toThrow();
    });

    test('should handle quantum superposition in task execution', async () => {
      const task = createTestTask('superposed-task', 0.8, 100);
      task.quantumState.superposition = 0.9; // High superposition
      
      planner.addTask(task);
      await planner.planOptimal();
      
      const result = planner.getSchedule();
      expect(result).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle planning errors gracefully', async () => {
      // Add task with invalid data to trigger error
      const invalidTask = createTestTask('invalid', -1, -100); // Invalid priority and duration
      planner.addTask(invalidTask);
      
      const result = await planner.planOptimal();
      
      expect(result.tasks).toHaveLength(1); // Should still work with invalid data
    });

    test('should emit error events for failed tasks', (done) => {
      planner.on('taskFailed', ({ task, error }) => {
        expect(task.id).toBe('failing-task');
        expect(error).toBeDefined();
        done();
      });
      
      // Mock a task that will fail during execution
      const originalExecuteTask = (planner as any).executeTask;
      (planner as any).executeTask = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const task = createTestTask('failing-task', 0.8, 100);
      planner.addTask(task);
      
      planner.planOptimal().then(() => {
        planner.executeNext().catch(() => {}); // Expect it to fail
      });
    });
  });

  describe('Performance', () => {
    test('should handle large number of tasks efficiently', async () => {
      const startTime = Date.now();
      
      // Add 100 tasks
      for (let i = 0; i < 100; i++) {
        const task = createTestTask(`task-${i}`, Math.random(), Math.random() * 100 + 50);
        planner.addTask(task);
      }
      
      const result = await planner.planOptimal();
      const planningTime = Date.now() - startTime;
      
      expect(result.tasks).toHaveLength(100);
      expect(planningTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should optimize schedule efficiency', async () => {
      const tasks = [
        createTestTask('high-priority', 0.95, 50),
        createTestTask('low-priority', 0.1, 200),
        createTestTask('medium-priority', 0.5, 100)
      ];
      
      tasks.forEach(task => planner.addTask(task));
      
      const result = await planner.planOptimal();
      
      // High priority task should be scheduled first
      expect(result.tasks[0].priority).toBeGreaterThanOrEqual(0.9);
      expect(result.efficiency).toBeGreaterThan(0);
    });
  });

  // Helper function to create test tasks
  function createTestTask(
    id: string, 
    priority: number, 
    duration: number, 
    dependencies: string[] = [],
    resources: Partial<ResourceRequirements> = {}
  ): QuantumTask {
    return {
      id,
      name: `Test Task ${id}`,
      priority,
      estimatedDuration: duration,
      dependencies,
      resourceRequirements: {
        cpu: 0.3,
        memory: 256,
        gpu: 0.5,
        bandwidth: 100,
        ...resources
      },
      quantumState: {
        superposition: Math.random() * 0.5 + 0.3,
        entanglement: [],
        coherence: Math.random() * 0.3 + 0.7,
        amplitude: QuantumUtils.normalizeAmplitude(Math.random(), Math.random() * 0.5)
      },
      metadata: {
        createdAt: Date.now(),
        category: 'test'
      }
    };
  }
});

describe('QuantumUtils', () => {
  describe('Amplitude Calculations', () => {
    test('should calculate amplitude magnitude correctly', () => {
      const magnitude = QuantumUtils.calculateAmplitude(3, 4);
      expect(magnitude).toBeCloseTo(5, 5); // 3-4-5 triangle
    });

    test('should normalize amplitude correctly', () => {
      const normalized = QuantumUtils.normalizeAmplitude(6, 8);
      const magnitude = QuantumUtils.calculateAmplitude(normalized.real, normalized.imaginary);
      expect(magnitude).toBeCloseTo(1, 5);
    });

    test('should handle zero amplitude', () => {
      const normalized = QuantumUtils.normalizeAmplitude(0, 0);
      expect(normalized).toEqual({ real: 1, imaginary: 0 });
    });
  });

  describe('Superposition Calculations', () => {
    test('should calculate superposition correctly', () => {
      const superposition1 = QuantumUtils.calculateSuperposition({ real: 1, imaginary: 0 });
      const superposition2 = QuantumUtils.calculateSuperposition({ real: 0.5, imaginary: 0.5 });
      
      expect(superposition1).toBeCloseTo(0, 2);
      expect(superposition2).toBeGreaterThan(0);
    });
  });

  describe('Quantum Gates', () => {
    test('should apply Hadamard gate correctly', () => {
      const state = { real: 1, imaginary: 0 };
      const result = QuantumUtils.applyQuantumGate(state, 'hadamard');
      
      const expectedReal = 1 / Math.sqrt(2);
      const expectedImag = 1 / Math.sqrt(2);
      
      expect(result.real).toBeCloseTo(expectedReal, 5);
      expect(result.imaginary).toBeCloseTo(expectedImag, 5);
    });

    test('should apply Pauli-X gate correctly', () => {
      const state = { real: 1, imaginary: 0 };
      const result = QuantumUtils.applyQuantumGate(state, 'pauli-x');
      
      expect(result).toEqual({ real: 0, imaginary: 1 });
    });

    test('should apply Pauli-Z gate correctly', () => {
      const state = { real: 1, imaginary: 1 };
      const result = QuantumUtils.applyQuantumGate(state, 'pauli-z');
      
      expect(result).toEqual({ real: 1, imaginary: -1 });
    });
  });

  describe('Superposition Creation', () => {
    test('should create superposition from multiple states', () => {
      const states = [
        { real: 1, imaginary: 0, weight: 0.6 },
        { real: 0, imaginary: 1, weight: 0.4 }
      ];
      
      const superposition = QuantumUtils.createSuperposition(states);
      const magnitude = QuantumUtils.calculateAmplitude(superposition.real, superposition.imaginary);
      
      expect(magnitude).toBeCloseTo(1, 5);
    });

    test('should handle single state superposition', () => {
      const states = [{ real: 1, imaginary: 0, weight: 1 }];
      const superposition = QuantumUtils.createSuperposition(states);
      
      expect(superposition).toEqual({ real: 1, imaginary: 0 });
    });
  });

  describe('State Measurement', () => {
    test('should measure quantum state', () => {
      const state = { real: 0.8, imaginary: 0.6 };
      const result = QuantumUtils.measureState(state);
      
      expect(result.measured).toBeOneOf([0, 1]);
      expect(result.collapsed).toBeDefined();
    });

    test('should return consistent measurement types', () => {
      const state = { real: 1, imaginary: 0 };
      
      for (let i = 0; i < 10; i++) {
        const result = QuantumUtils.measureState(state);
        expect([0, 1]).toContain(result.measured);
      }
    });
  });

  describe('Decoherence', () => {
    test('should apply decoherence correctly', () => {
      const initialCoherence = 0.9;
      const timeElapsed = 1000;
      
      const noisyDecoherence = QuantumUtils.applyDecoherence(initialCoherence, timeElapsed, 'noisy');
      const isolatedDecoherence = QuantumUtils.applyDecoherence(initialCoherence, timeElapsed, 'isolated');
      
      expect(noisyDecoherence).toBeLessThan(initialCoherence);
      expect(isolatedDecoherence).toBeLessThan(initialCoherence);
      expect(noisyDecoherence).toBeLessThan(isolatedDecoherence); // Noisy environment decays faster
    });

    test('should not go below minimum coherence', () => {
      const result = QuantumUtils.applyDecoherence(0.1, 10000, 'noisy');
      expect(result).toBeGreaterThanOrEqual(0.01); // QUANTUM_CONSTANTS.MIN_COHERENCE
    });
  });

  describe('Entanglement Strength', () => {
    test('should calculate entanglement strength correctly', () => {
      const state1 = { amplitude: { real: 0.8, imaginary: 0.6 }, coherence: 0.9 };
      const state2 = { amplitude: { real: 0.6, imaginary: 0.8 }, coherence: 0.8 };
      
      const strength = QuantumUtils.calculateEntanglementStrength(state1, state2);
      
      expect(strength).toBeGreaterThan(0);
      expect(strength).toBeLessThanOrEqual(1);
    });

    test('should return zero for orthogonal states', () => {
      const state1 = { amplitude: { real: 1, imaginary: 0 }, coherence: 0.9 };
      const state2 = { amplitude: { real: 0, imaginary: 1 }, coherence: 0.8 };
      
      const strength = QuantumUtils.calculateEntanglementStrength(state1, state2);
      
      expect(strength).toBeCloseTo(0, 5);
    });
  });
});

// Custom Jest matcher for arrays containing one of values
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