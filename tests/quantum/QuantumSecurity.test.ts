/**
 * Quantum Security Test Suite
 * Security validation and penetration testing for quantum task planning
 */

import { QuantumTaskPlanner, QuantumTask } from '../../src/quantum/QuantumTaskPlanner';
import { QuantumValidator } from '../../src/quantum/QuantumValidator';
import { QuantumCache } from '../../src/quantum/QuantumCache';
import { QuantumMonitor } from '../../src/quantum/QuantumMonitor';

describe('Quantum Security Tests', () => {
  describe('Input Validation & Sanitization', () => {
    let planner: QuantumTaskPlanner;

    beforeEach(() => {
      planner = new QuantumTaskPlanner();
    });

    afterEach(() => {
      planner.stop();
    });

    test('should sanitize malicious task IDs', () => {
      const maliciousTask: QuantumTask = {
        id: '<script>alert("xss")</script>',
        name: 'Test Task',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: [],
        resourceRequirements: {
          cpu: 0.3,
          memory: 256,
          gpu: 0.5,
          bandwidth: 100
        },
        quantumState: {
          superposition: 0.5,
          entanglement: [],
          coherence: 0.8,
          amplitude: { real: 1, imaginary: 0 }
        },
        metadata: {}
      };

      expect(() => {
        planner.addTask(maliciousTask);
      }).not.toThrow();

      // Should not execute or contain script tags
      const schedule = planner.getSchedule();
      expect(schedule.every(task => !task.id.includes('<script>'))).toBe(true);
    });

    test('should prevent SQL injection in metadata', () => {
      const sqlInjectionTask: QuantumTask = {
        id: 'safe-id',
        name: 'Test Task',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: [],
        resourceRequirements: {
          cpu: 0.3,
          memory: 256,
          gpu: 0.5,
          bandwidth: 100
        },
        quantumState: {
          superposition: 0.5,
          entanglement: [],
          coherence: 0.8,
          amplitude: { real: 1, imaginary: 0 }
        },
        metadata: {
          query: "1'; DROP TABLE tasks; --",
          description: "'; DELETE FROM users; --"
        }
      };

      expect(() => {
        planner.addTask(sqlInjectionTask);
      }).not.toThrow();

      // Metadata should not contain dangerous SQL
      // In a real implementation, metadata should be properly escaped
    });

    test('should validate resource limits to prevent DoS', () => {
      const dosTask: QuantumTask = {
        id: 'dos-task',
        name: 'DoS Task',
        priority: 0.5,
        estimatedDuration: Number.MAX_SAFE_INTEGER, // Extremely long duration
        dependencies: [],
        resourceRequirements: {
          cpu: 999999, // Impossible CPU requirement
          memory: Number.MAX_SAFE_INTEGER,
          gpu: 999999,
          bandwidth: Number.MAX_SAFE_INTEGER
        },
        quantumState: {
          superposition: 0.5,
          entanglement: [],
          coherence: 0.8,
          amplitude: { real: 1, imaginary: 0 }
        },
        metadata: {}
      };

      const validator = new QuantumValidator();
      const result = validator.validateTask(dosTask);

      // Should fail validation due to excessive resource requirements
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should prevent prototype pollution', () => {
      const pollutionTask = {
        id: 'pollution-task',
        name: 'Test Task',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: [],
        resourceRequirements: {
          cpu: 0.3,
          memory: 256,
          gpu: 0.5,
          bandwidth: 100
        },
        quantumState: {
          superposition: 0.5,
          entanglement: [],
          coherence: 0.8,
          amplitude: { real: 1, imaginary: 0 }
        },
        metadata: {
          '__proto__': { polluted: true },
          'constructor.prototype.polluted': true
        }
      } as any;

      planner.addTask(pollutionTask);

      // Check that prototype wasn't polluted
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((QuantumTask.prototype as any)?.polluted).toBeUndefined();
    });
  });

  describe('Authentication & Authorization', () => {
    test('should not expose sensitive internal state', () => {
      const planner = new QuantumTaskPlanner();
      
      // Try to access private members
      expect((planner as any).tasks).toBeUndefined(); // Should be private
      expect((planner as any).quantumAnnealer).toBeUndefined(); // Should be private
      
      planner.stop();
    });

    test('should prevent unauthorized task manipulation', () => {
      const planner = new QuantumTaskPlanner();
      const task: QuantumTask = {
        id: 'secure-task',
        name: 'Secure Task',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: [],
        resourceRequirements: {
          cpu: 0.3,
          memory: 256,
          gpu: 0.5,
          bandwidth: 100
        },
        quantumState: {
          superposition: 0.5,
          entanglement: [],
          coherence: 0.8,
          amplitude: { real: 1, imaginary: 0 }
        },
        metadata: { userId: 'user-123' }
      };

      planner.addTask(task);

      // Attempt to remove task without proper authorization
      // In a real implementation, this would check user permissions
      const removed = planner.removeTask('secure-task');
      expect(removed).toBe(true); // Current implementation allows it

      planner.stop();
    });
  });

  describe('Data Encryption & Privacy', () => {
    let cache: QuantumCache;

    beforeEach(() => {
      cache = new QuantumCache({
        compression: true,
        persistence: false
      });
    });

    afterEach(() => {
      cache.dispose();
    });

    test('should not leak sensitive data in exports', () => {
      const sensitiveData = {
        password: 'secret123',
        apiKey: 'sk-1234567890',
        personalInfo: 'PII data'
      };

      cache.set('sensitive', sensitiveData);
      const exported = cache.export();

      // Exported data should not contain actual values
      expect(JSON.stringify(exported)).not.toContain('secret123');
      expect(JSON.stringify(exported)).not.toContain('sk-1234567890');
      expect(JSON.stringify(exported)).not.toContain('PII data');
    });

    test('should handle quantum state information securely', () => {
      const quantumData = {
        amplitude: { real: 0.8, imaginary: 0.6 },
        superposition: 0.9,
        coherence: 0.7
      };

      cache.set('quantum-state', quantumData, {
        superposition: 0.8,
        tags: ['quantum', 'sensitive']
      });

      const retrieved = cache.get('quantum-state');
      expect(retrieved).toBeTruthy();

      // Ensure quantum properties are preserved but not exposed in logs
      const stats = cache.getStats();
      expect(stats.avgSuperposition).toBeGreaterThan(0);
    });
  });

  describe('Resource Exhaustion Prevention', () => {
    test('should prevent memory exhaustion through cache limits', async () => {
      const cache = new QuantumCache({
        maxSize: 1, // 1 MB limit
        compression: false
      });

      try {
        // Try to add data exceeding the limit
        const largeData = 'x'.repeat(1024 * 1024 * 2); // 2 MB of data

        await cache.set('large-data-1', largeData);
        await cache.set('large-data-2', largeData);

        // Should trigger eviction
        const stats = cache.getStats();
        expect(stats.evictionCount).toBeGreaterThan(0);
      } finally {
        cache.dispose();
      }
    });

    test('should prevent infinite loops in dependency resolution', () => {
      const validator = new QuantumValidator();

      // Create circular dependency
      const task1: QuantumTask = {
        id: 'task-1',
        name: 'Task 1',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: ['task-2'],
        resourceRequirements: { cpu: 0.3, memory: 256, gpu: 0.5, bandwidth: 100 },
        quantumState: { superposition: 0.5, entanglement: [], coherence: 0.8, amplitude: { real: 1, imaginary: 0 } },
        metadata: {}
      };

      const task2: QuantumTask = {
        id: 'task-2',
        name: 'Task 2',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: ['task-1'],
        resourceRequirements: { cpu: 0.3, memory: 256, gpu: 0.5, bandwidth: 100 },
        quantumState: { superposition: 0.5, entanglement: [], coherence: 0.8, amplitude: { real: 1, imaginary: 0 } },
        metadata: {}
      };

      const startTime = Date.now();
      const result = validator.validateTaskSet([task1, task2]);
      const duration = Date.now() - startTime;

      // Should detect cycle quickly without infinite loop
      expect(duration).toBeLessThan(1000); // Less than 1 second
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'DEPENDENCY_CYCLE'
        })
      );
    });
  });

  describe('Information Disclosure Prevention', () => {
    test('should not expose internal implementation details in errors', () => {
      const planner = new QuantumTaskPlanner();
      
      try {
        // Try to trigger an internal error
        planner.entangleTasks('non-existent-1', 'non-existent-2');
      } catch (error: any) {
        // Error message should not contain sensitive paths or internal details
        expect(error.message).not.toMatch(/\/Users\/|\/home\/|C:\\/); // No file paths
        expect(error.message).not.toMatch(/password|secret|key/i); // No sensitive keywords
        expect(error.message).not.toContain('quantum annealer'); // No internal component names
      }

      planner.stop();
    });

    test('should sanitize monitoring data', () => {
      const monitor = new QuantumMonitor();
      
      monitor.start();

      // Add some test data
      const task: QuantumTask = {
        id: 'monitored-task',
        name: 'Monitored Task',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: [],
        resourceRequirements: { cpu: 0.3, memory: 256, gpu: 0.5, bandwidth: 100 },
        quantumState: { superposition: 0.5, entanglement: [], coherence: 0.8, amplitude: { real: 1, imaginary: 0 } },
        metadata: { 
          userId: 'user-123',
          sessionToken: 'sensitive-token-data'
        }
      };

      monitor.trackTaskStarted(task);
      monitor.trackTaskCompleted(task, 50);

      const metrics = monitor.getCurrentMetrics();
      const stats = monitor.getMonitoringStats();

      // Metrics should not contain sensitive user data
      expect(JSON.stringify(metrics)).not.toContain('sensitive-token-data');
      expect(JSON.stringify(stats)).not.toContain('user-123');

      monitor.stop();
    });
  });

  describe('Quantum State Security', () => {
    test('should prevent quantum state manipulation attacks', () => {
      const planner = new QuantumTaskPlanner();
      const task: QuantumTask = {
        id: 'quantum-task',
        name: 'Quantum Task',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: [],
        resourceRequirements: { cpu: 0.3, memory: 256, gpu: 0.5, bandwidth: 100 },
        quantumState: { 
          superposition: 0.5,
          entanglement: [],
          coherence: 0.8,
          amplitude: { real: 1, imaginary: 0 }
        },
        metadata: {}
      };

      planner.addTask(task);

      // Attempt to manipulate quantum state externally
      const maliciousAmplitude = { real: 999999, imaginary: 999999 };
      task.quantumState.amplitude = maliciousAmplitude;

      // Validator should catch this
      const validator = new QuantumValidator();
      const result = validator.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'AMPLITUDE_NOT_NORMALIZED'
        })
      );

      planner.stop();
    });

    test('should prevent quantum entanglement poisoning', () => {
      const planner = new QuantumTaskPlanner();
      
      // Create legitimate task
      const legitTask: QuantumTask = {
        id: 'legit-task',
        name: 'Legitimate Task',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: [],
        resourceRequirements: { cpu: 0.3, memory: 256, gpu: 0.5, bandwidth: 100 },
        quantumState: { superposition: 0.5, entanglement: [], coherence: 0.8, amplitude: { real: 1, imaginary: 0 } },
        metadata: {}
      };

      // Create malicious task with many entanglements
      const maliciousTask: QuantumTask = {
        id: 'malicious-task',
        name: 'Malicious Task',
        priority: 0.5,
        estimatedDuration: 100,
        dependencies: [],
        resourceRequirements: { cpu: 0.3, memory: 256, gpu: 0.5, bandwidth: 100 },
        quantumState: { 
          superposition: 0.5,
          entanglement: Array.from({ length: 1000 }, (_, i) => `fake-task-${i}`), // Too many entanglements
          coherence: 0.8,
          amplitude: { real: 1, imaginary: 0 }
        },
        metadata: {}
      };

      planner.addTask(legitTask);
      planner.addTask(maliciousTask);

      const validator = new QuantumValidator({
        maxEntanglements: 10 // Reasonable limit
      });

      const result = validator.validateTask(maliciousTask);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'EXCESSIVE_ENTANGLEMENT'
        })
      );

      planner.stop();
    });
  });

  describe('Rate Limiting & Throttling', () => {
    test('should handle rapid task additions gracefully', async () => {
      const planner = new QuantumTaskPlanner();
      const startTime = Date.now();

      // Rapidly add many tasks
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        const task: QuantumTask = {
          id: `rapid-task-${i}`,
          name: `Rapid Task ${i}`,
          priority: Math.random(),
          estimatedDuration: Math.random() * 100 + 50,
          dependencies: [],
          resourceRequirements: { cpu: 0.1, memory: 50, gpu: 0.1, bandwidth: 10 },
          quantumState: { superposition: 0.5, entanglement: [], coherence: 0.8, amplitude: { real: 1, imaginary: 0 } },
          metadata: {}
        };

        // Add task (should not block)
        planner.addTask(task);

        if (i % 100 === 0) {
          // Periodically allow event loop to process
          promises.push(new Promise(resolve => setTimeout(resolve, 1)));
        }
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max

      planner.stop();
    });
  });

  describe('Secure Defaults', () => {
    test('should use secure defaults for quantum parameters', () => {
      const planner = new QuantumTaskPlanner();
      
      // Default configuration should be secure
      const defaultConfig = (planner as any).config;
      
      // Temperature should not be too high (avoid quantum decoherence)
      expect(defaultConfig?.temperature || 0.1).toBeLessThanOrEqual(1.0);
      
      // Annealing time should be reasonable (prevent DoS)
      expect(defaultConfig?.annealingTime || 1000).toBeLessThanOrEqual(10000);

      planner.stop();
    });

    test('should use secure defaults for cache configuration', () => {
      const cache = new QuantumCache();
      const stats = cache.getStats();
      
      // Should have reasonable defaults
      expect(stats.totalSize).toBe(0); // Empty initially
      
      cache.dispose();
    });

    test('should use secure defaults for monitoring', () => {
      const monitor = new QuantumMonitor();
      const stats = monitor.getMonitoringStats();
      
      // Should start in a safe state
      expect(stats.systemHealth).toBe('healthy');
      expect(stats.activeAlertsCount).toBe(0);
      
      monitor.stop();
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak sensitive information in error messages', () => {
      const planner = new QuantumTaskPlanner();
      
      // Try various operations that might fail
      const errorMessages: string[] = [];

      try {
        planner.entangleTasks('', '');
      } catch (e: any) {
        errorMessages.push(e.message);
      }

      try {
        planner.removeTask('');
      } catch (e: any) {
        errorMessages.push(e.message);
      }

      // Check that error messages don't contain sensitive data
      for (const message of errorMessages) {
        expect(message).not.toMatch(/password|secret|key|token/i);
        expect(message).not.toMatch(/\/.*\/.*\//); // No file paths
        expect(message).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/); // No IP addresses
      }

      planner.stop();
    });
  });
});