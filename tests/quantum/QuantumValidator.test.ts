/**
 * Quantum Validator Test Suite
 * Tests for quantum task validation and constraint checking
 */

import { QuantumValidator } from '../../src/quantum/QuantumValidator';
import { QuantumTask, ResourceRequirements } from '../../src/quantum/QuantumTaskPlanner';
import { NerfRenderTask } from '../../src/quantum/QuantumNerfScheduler';

describe('QuantumValidator', () => {
  let validator: QuantumValidator;

  beforeEach(() => {
    validator = new QuantumValidator(
      {
        minCoherence: 0.1,
        maxSuperposition: 1.0,
        maxEntanglements: 5,
        minAmplitudeMagnitude: 0.01
      },
      {
        maxCpuUtilization: 0.9,
        maxMemoryMb: 1024,
        maxGpuUtilization: 0.95,
        availableResources: {
          cpu: 1.0,
          memory: 1024,
          gpu: 1.0,
          bandwidth: 1000
        }
      }
    );
  });

  describe('Basic Task Validation', () => {
    test('should validate correct task', () => {
      const task = createValidTask();
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeCloseTo(1.0, 1);
    });

    test('should fail validation for missing task ID', () => {
      const task = createValidTask();
      task.id = '';
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_TASK_ID',
          severity: 'critical'
        })
      );
    });

    test('should fail validation for missing task name', () => {
      const task = createValidTask();
      task.name = '';
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_TASK_NAME',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid priority', () => {
      const task = createValidTask();
      task.priority = 1.5; // > 1.0
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_PRIORITY',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid duration', () => {
      const task = createValidTask();
      task.estimatedDuration = -100; // Negative
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_DURATION',
          severity: 'error'
        })
      );
    });

    test('should warn for long duration', () => {
      const task = createValidTask();
      task.estimatedDuration = 15000; // Very long
      
      const result = validator.validateTask(task);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'LONG_DURATION'
        })
      );
    });
  });

  describe('Quantum State Validation', () => {
    test('should fail validation for low coherence', () => {
      const task = createValidTask();
      task.quantumState.coherence = 0.05; // Below minimum
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'LOW_COHERENCE',
          severity: 'error'
        })
      );
    });

    test('should warn for degraded coherence', () => {
      const task = createValidTask();
      task.quantumState.coherence = 0.2; // Above minimum but degraded
      
      const result = validator.validateTask(task);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'DEGRADED_COHERENCE'
        })
      );
    });

    test('should fail validation for invalid superposition', () => {
      const task = createValidTask();
      task.quantumState.superposition = 1.5; // > 1.0
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_SUPERPOSITION',
          severity: 'error'
        })
      );
    });

    test('should warn for excessive entanglement', () => {
      const task = createValidTask();
      task.quantumState.entanglement = ['1', '2', '3', '4', '5', '6']; // More than max
      
      const result = validator.validateTask(task);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'EXCESSIVE_ENTANGLEMENT'
        })
      );
    });

    test('should fail validation for low amplitude', () => {
      const task = createValidTask();
      task.quantumState.amplitude = { real: 0.005, imaginary: 0.005 }; // Very low magnitude
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'LOW_AMPLITUDE',
          severity: 'error'
        })
      );
    });

    test('should fail validation for non-normalized amplitude', () => {
      const task = createValidTask();
      task.quantumState.amplitude = { real: 2.0, imaginary: 2.0 }; // Magnitude > 1
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'AMPLITUDE_NOT_NORMALIZED',
          severity: 'error'
        })
      );
    });
  });

  describe('Resource Requirements Validation', () => {
    test('should fail validation for invalid CPU requirement', () => {
      const task = createValidTask();
      task.resourceRequirements.cpu = 1.5; // > max
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_CPU_REQUIREMENT',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid memory requirement', () => {
      const task = createValidTask();
      task.resourceRequirements.memory = -100; // Negative
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_MEMORY_REQUIREMENT',
          severity: 'error'
        })
      );
    });

    test('should warn for high memory requirement', () => {
      const task = createValidTask();
      task.resourceRequirements.memory = 2048; // Very high
      
      const result = validator.validateTask(task);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'HIGH_MEMORY_REQUIREMENT'
        })
      );
    });

    test('should fail validation for invalid GPU requirement', () => {
      const task = createValidTask();
      task.resourceRequirements.gpu = -0.5; // Negative
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_GPU_REQUIREMENT',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid bandwidth requirement', () => {
      const task = createValidTask();
      task.resourceRequirements.bandwidth = -50; // Negative
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_BANDWIDTH_REQUIREMENT',
          severity: 'error'
        })
      );
    });
  });

  describe('Dependency Validation', () => {
    test('should fail validation for self-dependency', () => {
      const task = createValidTask();
      task.dependencies = ['task-1']; // Self-dependency
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'SELF_DEPENDENCY',
          severity: 'critical'
        })
      );
    });

    test('should warn for duplicate dependencies', () => {
      const task = createValidTask();
      task.dependencies = ['task-2', 'task-3', 'task-2']; // Duplicate
      
      const result = validator.validateTask(task);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'DUPLICATE_DEPENDENCIES'
        })
      );
    });
  });

  describe('Task Set Validation', () => {
    test('should validate set of correct tasks', () => {
      const tasks = [
        createValidTask('task-1'),
        createValidTask('task-2', ['task-1']),
        createValidTask('task-3')
      ];
      
      const result = validator.validateTaskSet(tasks);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation for missing dependency', () => {
      const tasks = [
        createValidTask('task-1'),
        createValidTask('task-2', ['non-existent'])
      ];
      
      const result = validator.validateTaskSet(tasks);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_DEPENDENCY',
          severity: 'critical'
        })
      );
    });

    test('should detect dependency cycles', () => {
      const tasks = [
        createValidTask('task-1', ['task-2']),
        createValidTask('task-2', ['task-3']),
        createValidTask('task-3', ['task-1'])
      ];
      
      const result = validator.validateTaskSet(tasks);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'DEPENDENCY_CYCLE',
          severity: 'critical'
        })
      );
    });

    test('should fail validation for insufficient resources', () => {
      const tasks = [
        createValidTask('task-1', [], { cpu: 0.8, memory: 800 }),
        createValidTask('task-2', [], { cpu: 0.7, memory: 600 })
      ];
      
      const result = validator.validateTaskSet(tasks);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INSUFFICIENT_CPU',
          severity: 'error'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INSUFFICIENT_MEMORY',
          severity: 'error'
        })
      );
    });

    test('should validate quantum entanglements', () => {
      const task1 = createValidTask('task-1');
      const task2 = createValidTask('task-2');
      task1.quantumState.entanglement = ['task-2'];
      task2.quantumState.entanglement = ['task-1'];
      
      const result = validator.validateTaskSet([task1, task2]);
      
      expect(result.valid).toBe(true);
    });

    test('should fail validation for invalid entanglement', () => {
      const task1 = createValidTask('task-1');
      task1.quantumState.entanglement = ['non-existent'];
      
      const result = validator.validateTaskSet([task1]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_ENTANGLEMENT',
          severity: 'error'
        })
      );
    });

    test('should warn for asymmetric entanglement', () => {
      const task1 = createValidTask('task-1');
      const task2 = createValidTask('task-2');
      task1.quantumState.entanglement = ['task-2'];
      // task2 doesn't have task1 in entanglement - asymmetric
      
      const result = validator.validateTaskSet([task1, task2]);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'ASYMMETRIC_ENTANGLEMENT'
        })
      );
    });
  });

  describe('NeRF Task Validation', () => {
    test('should validate correct NeRF task', () => {
      const nerfTask = createValidNerfTask();
      const result = validator.validateNerfRenderTask(nerfTask);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation for invalid render type', () => {
      const nerfTask = createValidNerfTask();
      (nerfTask as any).renderType = 'invalid';
      
      const result = validator.validateNerfRenderTask(nerfTask);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_RENDER_TYPE',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid quality level', () => {
      const nerfTask = createValidNerfTask();
      (nerfTask as any).qualityLevel = 'invalid';
      
      const result = validator.validateNerfRenderTask(nerfTask);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_QUALITY_LEVEL',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid foveation level', () => {
      const nerfTask = createValidNerfTask();
      nerfTask.foveationLevel = 1.5; // > 1.0
      
      const result = validator.validateNerfRenderTask(nerfTask);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_FOVEATION_LEVEL',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid device target', () => {
      const nerfTask = createValidNerfTask();
      (nerfTask as any).deviceTarget = 'invalid';
      
      const result = validator.validateNerfRenderTask(nerfTask);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_DEVICE_TARGET',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid FOV', () => {
      const nerfTask = createValidNerfTask();
      nerfTask.renderOptions.fieldOfView = 200; // > 180
      
      const result = validator.validateNerfRenderTask(nerfTask);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_FOV',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid clipping planes', () => {
      const nerfTask = createValidNerfTask();
      nerfTask.renderOptions.near = 10;
      nerfTask.renderOptions.far = 5; // near > far
      
      const result = validator.validateNerfRenderTask(nerfTask);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_CLIPPING_PLANES',
          severity: 'error'
        })
      );
    });
  });

  describe('Schedule Result Validation', () => {
    test('should validate correct schedule result', () => {
      const tasks = [createValidTask('task-1'), createValidTask('task-2')];
      const scheduledTasks = [...tasks];
      
      const result = validator.validateScheduleResult(tasks, scheduledTasks, 100, 0.8);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation for incomplete schedule', () => {
      const tasks = [createValidTask('task-1'), createValidTask('task-2')];
      const scheduledTasks = [tasks[0]]; // Missing one task
      
      const result = validator.validateScheduleResult(tasks, scheduledTasks, 100, 0.8);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INCOMPLETE_SCHEDULE',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid total time', () => {
      const tasks = [createValidTask('task-1')];
      const scheduledTasks = [...tasks];
      
      const result = validator.validateScheduleResult(tasks, scheduledTasks, -100, 0.8);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_TOTAL_TIME',
          severity: 'error'
        })
      );
    });

    test('should fail validation for invalid efficiency', () => {
      const tasks = [createValidTask('task-1')];
      const scheduledTasks = [...tasks];
      
      const result = validator.validateScheduleResult(tasks, scheduledTasks, 100, 3.0);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_EFFICIENCY',
          severity: 'error'
        })
      );
    });

    test('should warn for low efficiency', () => {
      const tasks = [createValidTask('task-1')];
      const scheduledTasks = [...tasks];
      
      const result = validator.validateScheduleResult(tasks, scheduledTasks, 100, 0.3);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'LOW_EFFICIENCY'
        })
      );
    });

    test('should fail validation for dependency order violation', () => {
      const task1 = createValidTask('task-1', ['task-2']);
      const task2 = createValidTask('task-2');
      const scheduledTasks = [task1, task2]; // Wrong order
      
      const result = validator.validateScheduleResult([task1, task2], scheduledTasks, 100, 0.8);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'DEPENDENCY_ORDER_VIOLATION',
          severity: 'critical'
        })
      );
    });
  });

  describe('Custom Validation Rules', () => {
    test('should add and apply custom validation rule', () => {
      validator.addValidationRule({
        id: 'test_rule',
        description: 'Test custom rule',
        validate: (task, errors, warnings) => {
          if (task.name.includes('test')) {
            warnings.push({
              code: 'TEST_WARNING',
              message: 'Task name contains test'
            });
          }
        }
      });
      
      const task = createValidTask('test-task');
      const result = validator.validateTask(task);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'TEST_WARNING'
        })
      );
    });
  });

  describe('Validation Statistics', () => {
    test('should track validation statistics', () => {
      // Perform some validations
      validator.validateTask(createValidTask());
      validator.validateTask(createValidTask());
      
      const invalidTask = createValidTask();
      invalidTask.id = ''; // Make it invalid
      validator.validateTask(invalidTask);
      
      const stats = validator.getValidationStats();
      
      expect(stats.totalValidations).toBe(3);
      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    test('should identify common errors', () => {
      // Create multiple tasks with same error
      for (let i = 0; i < 5; i++) {
        const task = createValidTask();
        task.priority = -1; // Same error type
        validator.validateTask(task);
      }
      
      const stats = validator.getValidationStats();
      
      expect(stats.commonErrors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_PRIORITY'
        })
      );
    });
  });

  describe('Constraint Updates', () => {
    test('should update quantum constraints', () => {
      validator.updateConstraints({ minCoherence: 0.2 });
      
      const task = createValidTask();
      task.quantumState.coherence = 0.15; // Below new minimum
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
    });

    test('should update resource constraints', () => {
      validator.updateConstraints(undefined, { maxCpuUtilization: 0.5 });
      
      const task = createValidTask();
      task.resourceRequirements.cpu = 0.7; // Above new maximum
      
      const result = validator.validateTask(task);
      
      expect(result.valid).toBe(false);
    });
  });

  // Helper functions
  function createValidTask(id: string = 'task-1', dependencies: string[] = [], resources: Partial<ResourceRequirements> = {}): QuantumTask {
    return {
      id,
      name: `Valid Task ${id}`,
      priority: 0.7,
      estimatedDuration: 100,
      dependencies,
      resourceRequirements: {
        cpu: 0.5,
        memory: 256,
        gpu: 0.4,
        bandwidth: 100,
        ...resources
      },
      quantumState: {
        superposition: 0.6,
        entanglement: [],
        coherence: 0.8,
        amplitude: { real: 0.8, imaginary: 0.6 }
      },
      metadata: {
        createdAt: Date.now()
      }
    };
  }

  function createValidNerfTask(): NerfRenderTask {
    const baseTask = createValidTask();
    return {
      ...baseTask,
      renderType: 'rayMarching',
      renderOptions: {
        cameraPosition: [0, 0, 0],
        cameraRotation: [0, 0, 0, 1],
        fieldOfView: 90,
        near: 0.1,
        far: 100
      },
      qualityLevel: 'high',
      foveationLevel: 0.7,
      deviceTarget: 'visionPro'
    } as NerfRenderTask;
  }
});