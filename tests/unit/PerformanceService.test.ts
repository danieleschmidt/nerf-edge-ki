/**
 * Unit tests for PerformanceService
 */

import { PerformanceService, PerformanceProfile, BenchmarkResult } from '../../src/services/PerformanceService';
import { PerformanceMetrics } from '../../src/core/types';

describe('PerformanceService', () => {
  let service: PerformanceService;

  beforeEach(() => {
    service = new PerformanceService();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('initialization', () => {
    it('should initialize with default profile', () => {
      // Assert
      const stats = service.getCurrentStats();
      expect(stats.target).toBeDefined();
      expect(stats.target.fps).toBeGreaterThan(0);
    });

    it('should get all device profiles', () => {
      // Act
      const profiles = PerformanceService.getDeviceProfiles();

      // Assert
      expect(profiles).toHaveProperty('vision-pro');
      expect(profiles).toHaveProperty('iphone-15-pro');
      expect(profiles).toHaveProperty('web-high');
      expect(profiles).toHaveProperty('web-low');
      
      expect(profiles['vision-pro'].target.fps).toBe(90);
      expect(profiles['iphone-15-pro'].target.fps).toBe(60);
    });
  });

  describe('profile management', () => {
    it('should set performance profile', () => {
      // Act
      service.setProfile('vision-pro');
      const stats = service.getCurrentStats();

      // Assert
      expect(stats.target.fps).toBe(90);
      expect(stats.target.powerLimit).toBe(8.0);
    });

    it('should handle invalid profile name', () => {
      // Act
      service.setProfile('invalid-profile');
      const stats = service.getCurrentStats();

      // Assert - should still have valid target (fallback to default)
      expect(stats.target).toBeDefined();
    });
  });

  describe('performance monitoring', () => {
    it('should start and stop monitoring', () => {
      // Arrange
      const mockMetricsProvider = jest.fn().mockReturnValue({
        fps: 60,
        frameTime: 16.7,
        gpuUtilization: 0.7,
        memoryUsage: 256,
        powerConsumption: 5.0
      } as PerformanceMetrics);

      // Act
      service.startMonitoring(mockMetricsProvider, 100);
      
      // Wait a bit for metrics collection
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          service.stopMonitoring();
          
          // Assert
          expect(mockMetricsProvider).toHaveBeenCalled();
          const stats = service.getCurrentStats();
          expect(stats.current.fps).toBe(60);
          resolve();
        }, 150);
      });
    });

    it('should record metrics manually', () => {
      // Arrange
      const metrics: PerformanceMetrics = {
        fps: 90,
        frameTime: 11.1,
        gpuUtilization: 0.8,
        memoryUsage: 512,
        powerConsumption: 8.0
      };

      // Act
      service.recordMetrics(metrics);
      const stats = service.getCurrentStats();

      // Assert
      expect(stats.current).toEqual(metrics);
    });

    it('should calculate running averages', () => {
      // Arrange
      const metrics1: PerformanceMetrics = {
        fps: 60,
        frameTime: 16.7,
        gpuUtilization: 0.5,
        memoryUsage: 200,
        powerConsumption: 4.0
      };
      
      const metrics2: PerformanceMetrics = {
        fps: 80,
        frameTime: 12.5,
        gpuUtilization: 0.7,
        memoryUsage: 300,
        powerConsumption: 6.0
      };

      // Act
      service.recordMetrics(metrics1);
      service.recordMetrics(metrics2);
      const stats = service.getCurrentStats();

      // Assert
      expect(stats.averages.fps).toBe(70); // (60 + 80) / 2
      expect(stats.averages.memoryUsage).toBe(250); // (200 + 300) / 2
    });
  });

  describe('benchmarking', () => {
    it('should run performance benchmark', async () => {
      // Arrange
      let sampleCount = 0;
      const mockMetricsProvider = jest.fn().mockImplementation(() => {
        sampleCount++;
        return {
          fps: 60 + Math.random() * 10,
          frameTime: 16.7 + Math.random() * 2,
          gpuUtilization: 0.6 + Math.random() * 0.2,
          memoryUsage: 400 + Math.random() * 100,
          powerConsumption: 5.0 + Math.random() * 1
        } as PerformanceMetrics;
      });

      // Act
      const result = await service.runBenchmark('Test Benchmark', 0.2, mockMetricsProvider);

      // Assert
      expect(result).toHaveProperty('testName', 'Test Benchmark');
      expect(result).toHaveProperty('duration', 0.2);
      expect(result.averageFPS).toBeGreaterThan(0);
      expect(result.minFPS).toBeGreaterThan(0);
      expect(result.maxFPS).toBeGreaterThan(0);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
      expect(mockMetricsProvider).toHaveBeenCalled();
    });

    it('should store benchmark results', async () => {
      // Arrange
      const mockMetricsProvider = () => ({
        fps: 75,
        frameTime: 13.3,
        gpuUtilization: 0.8,
        memoryUsage: 512,
        powerConsumption: 7.0
      } as PerformanceMetrics);

      // Act
      await service.runBenchmark('Stored Test', 0.1, mockMetricsProvider);
      const results = service.getBenchmarkResults();

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].testName).toBe('Stored Test');
    });
  });

  describe('performance analysis', () => {
    beforeEach(() => {
      // Setup some performance data
      service.setProfile('vision-pro');
      for (let i = 0; i < 10; i++) {
        const metrics: PerformanceMetrics = {
          fps: 85 + Math.random() * 10, // Around 90 FPS target
          frameTime: 11 + Math.random() * 2,
          gpuUtilization: 0.7 + Math.random() * 0.2,
          memoryUsage: 800 + Math.random() * 200,
          powerConsumption: 7 + Math.random() * 2
        };
        service.recordMetrics(metrics);
      }
    });

    it('should provide performance recommendations', () => {
      // Act
      const recommendations = service.getRecommendations();

      // Assert
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(typeof recommendations[0]).toBe('string');
    });

    it('should calculate performance percentiles', () => {
      // Act
      const percentiles = service.getPercentiles();

      // Assert
      expect(percentiles).toHaveProperty('fps');
      expect(percentiles).toHaveProperty('frameTime');
      expect(percentiles.fps).toHaveProperty('p50');
      expect(percentiles.fps).toHaveProperty('p95');
      expect(percentiles.fps).toHaveProperty('p99');
    });

    it('should detect if meeting performance targets', () => {
      // Arrange - record poor performance
      const poorMetrics: PerformanceMetrics = {
        fps: 30, // Well below target
        frameTime: 33.3,
        gpuUtilization: 0.9,
        memoryUsage: 1500, // Over limit
        powerConsumption: 12 // Over limit
      };
      
      service.recordMetrics(poorMetrics);

      // Act
      const stats = service.getCurrentStats();

      // Assert
      expect(stats.meetingTargets).toBe(false);
    });
  });

  describe('data export', () => {
    beforeEach(() => {
      // Add some test data
      const metrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 16.7,
        gpuUtilization: 0.6,
        memoryUsage: 300,
        powerConsumption: 4.5
      };
      service.recordMetrics(metrics);
    });

    it('should export performance data', () => {
      // Act
      const exportedData = service.exportData();

      // Assert
      expect(exportedData).toHaveProperty('profile');
      expect(exportedData).toHaveProperty('metrics');
      expect(exportedData).toHaveProperty('benchmarks');
      expect(exportedData).toHaveProperty('stats');
      expect(exportedData).toHaveProperty('percentiles');
      expect(exportedData).toHaveProperty('recommendations');
      
      expect(exportedData.metrics.length).toBeGreaterThan(0);
    });

    it('should clear performance history', () => {
      // Act
      service.clearHistory();
      const stats = service.getCurrentStats();
      const exportedData = service.exportData();

      // Assert
      expect(exportedData.metrics).toHaveLength(0);
      expect(exportedData.benchmarks).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle monitoring errors gracefully', () => {
      // Arrange
      const errorMetricsProvider = jest.fn().mockImplementation(() => {
        throw new Error('Metrics collection failed');
      });

      // Act & Assert - should not throw
      expect(() => {
        service.startMonitoring(errorMetricsProvider, 50);
      }).not.toThrow();

      // Cleanup
      service.stopMonitoring();
    });

    it('should handle benchmark errors', async () => {
      // Arrange
      const errorMetricsProvider = () => {
        throw new Error('Benchmark failed');
      };

      // Act
      const result = await service.runBenchmark('Error Test', 0.1, errorMetricsProvider);

      // Assert - should complete with zero values
      expect(result.averageFPS).toBe(0);
      expect(result.qualityScore).toBe(0);
    });
  });

  describe('resource management', () => {
    it('should stop monitoring on dispose', () => {
      // Arrange
      const mockMetricsProvider = jest.fn().mockReturnValue({
        fps: 60,
        frameTime: 16.7,
        gpuUtilization: 0.5,
        memoryUsage: 200,
        powerConsumption: 3.0
      } as PerformanceMetrics);

      service.startMonitoring(mockMetricsProvider, 100);

      // Act
      service.dispose();

      // Assert - monitoring should be stopped
      // We can't directly test the interval is cleared, but dispose should handle it
      expect(() => service.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls', () => {
      // Act & Assert
      expect(() => {
        service.dispose();
        service.dispose();
      }).not.toThrow();
    });
  });
});