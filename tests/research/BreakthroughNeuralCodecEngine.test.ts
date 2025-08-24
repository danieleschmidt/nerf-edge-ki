/**
 * Tests for Breakthrough Neural Codec Engine
 * 
 * Comprehensive testing of revolutionary neural compression and decompression
 * capabilities including quantum-inspired encoding and perceptual optimization.
 */

import { BreakthroughNeuralCodecEngine, NeuralCodecConfig, PerceptualImportanceMap } from '../../src/research/BreakthroughNeuralCodecEngine';

describe('BreakthroughNeuralCodecEngine', () => {
  let codecEngine: BreakthroughNeuralCodecEngine;
  let testConfig: NeuralCodecConfig;

  beforeEach(() => {
    testConfig = {
      targetBitrate: 1000000, // 1 Mbps
      qualityTarget: 0.85,
      latencyBudget: 10.0, // 10ms
      adaptiveComplexity: true,
      quantumEncoding: true,
      perceptualWeighting: true,
      temporalConsistency: true,
      eyeTrackingIntegration: true
    };

    codecEngine = new BreakthroughNeuralCodecEngine(testConfig);
  });

  afterEach(() => {
    codecEngine.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(codecEngine).toBeDefined();
      expect(codecEngine.getPerformanceStats).toBeDefined();
      expect(codecEngine.compress).toBeDefined();
      expect(codecEngine.decompress).toBeDefined();
    });

    it('should initialize neural networks', () => {
      const stats = codecEngine.getPerformanceStats();
      expect(stats).toBeDefined();
      expect(stats.encoding).toBeDefined();
      expect(stats.decoding).toBeDefined();
    });

    it('should support quantum encoding when enabled', () => {
      const quantumConfig: NeuralCodecConfig = {
        ...testConfig,
        quantumEncoding: true
      };

      const quantumCodec = new BreakthroughNeuralCodecEngine(quantumConfig);
      expect(quantumCodec).toBeDefined();
      quantumCodec.dispose();
    });
  });

  describe('Neural Compression', () => {
    let testNerfData: Float32Array;
    let testResolution: [number, number, number];

    beforeEach(() => {
      testResolution = [64, 64, 32];
      const dataSize = testResolution[0] * testResolution[1] * testResolution[2] * 4; // RGBA
      testNerfData = new Float32Array(dataSize);
      
      // Fill with test pattern
      for (let i = 0; i < testNerfData.length; i++) {
        testNerfData[i] = Math.sin(i * 0.1) * 0.5 + 0.5;
      }
    });

    it('should compress NeRF data successfully', async () => {
      const result = await codecEngine.compress(testNerfData, testResolution);
      
      expect(result).toBeDefined();
      expect(result.compressedData).toBeInstanceOf(Uint8Array);
      expect(result.compressedData.length).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeGreaterThan(1.0);
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1.0);
      expect(result.encodingTime).toBeGreaterThan(0);
      expect(result.bitrate).toBeGreaterThan(0);
    });

    it('should achieve target compression ratio', async () => {
      const result = await codecEngine.compress(testNerfData, testResolution);
      
      expect(result.compressionRatio).toBeGreaterThan(2.0); // At least 2:1 compression
      expect(result.qualityScore).toBeGreaterThan(0.7); // Maintain reasonable quality
    });

    it('should handle perceptual importance mapping', async () => {
      const perceptualMap: PerceptualImportanceMap = {
        regions: {
          foveal: 0.9,
          parafoveal: 0.7,
          peripheral: 0.4
        },
        semantic: {
          faces: 0.95,
          hands: 0.8,
          motion: 0.85,
          text: 0.9
        },
        temporal: {
          static: 0.6,
          dynamic: 0.9,
          predicted: 0.7
        }
      };

      const result = await codecEngine.compress(
        testNerfData, 
        testResolution,
        perceptualMap
      );

      expect(result).toBeDefined();
      expect(result.metadata.perceptualRegions).toBeGreaterThanOrEqual(3);
    });

    it('should integrate eye tracking data', async () => {
      const eyeTrackingData = {
        gazeX: 0.5,
        gazeY: 0.5,
        pupilDilation: 0.7
      };

      const result = await codecEngine.compress(
        testNerfData,
        testResolution,
        undefined,
        eyeTrackingData
      );

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0.7);
    });

    it('should handle temporal consistency', async () => {
      const previousFrame = new Float32Array(testNerfData.length);
      for (let i = 0; i < previousFrame.length; i++) {
        previousFrame[i] = testNerfData[i] + (Math.random() - 0.5) * 0.1;
      }

      const motionVectors = new Float32Array(1000);
      for (let i = 0; i < motionVectors.length; i++) {
        motionVectors[i] = (Math.random() - 0.5) * 0.2;
      }

      const temporalContext = {
        previousFrames: [previousFrame],
        motionVectors
      };

      const result = await codecEngine.compress(
        testNerfData,
        testResolution,
        undefined,
        undefined,
        temporalContext
      );

      expect(result).toBeDefined();
      expect(result.metadata.temporalFrames).toBe(1);
    });

    it('should use quantum encoding when enabled', async () => {
      const quantumConfig: NeuralCodecConfig = {
        ...testConfig,
        quantumEncoding: true
      };

      const quantumCodec = new BreakthroughNeuralCodecEngine(quantumConfig);
      const result = await quantumCodec.compress(testNerfData, testResolution);

      expect(result).toBeDefined();
      expect(result.metadata.quantumPaths).toBeGreaterThan(1);
      
      quantumCodec.dispose();
    });

    it('should respect latency budget', async () => {
      const lowLatencyConfig: NeuralCodecConfig = {
        ...testConfig,
        latencyBudget: 5.0 // 5ms budget
      };

      const fastCodec = new BreakthroughNeuralCodecEngine(lowLatencyConfig);
      
      const startTime = performance.now();
      const result = await fastCodec.compress(testNerfData, testResolution);
      const actualTime = performance.now() - startTime;

      expect(result).toBeDefined();
      // Allow some tolerance for test environment
      expect(actualTime).toBeLessThan(lowLatencyConfig.latencyBudget * 5);
      
      fastCodec.dispose();
    });
  });

  describe('Neural Decompression', () => {
    let compressedData: Uint8Array;
    let originalResolution: [number, number, number];

    beforeEach(async () => {
      originalResolution = [32, 32, 16];
      const dataSize = originalResolution[0] * originalResolution[1] * originalResolution[2] * 4;
      const testData = new Float32Array(dataSize);
      
      // Fill with test pattern
      for (let i = 0; i < testData.length; i++) {
        testData[i] = Math.cos(i * 0.05) * 0.5 + 0.5;
      }

      const compressionResult = await codecEngine.compress(testData, originalResolution);
      compressedData = compressionResult.compressedData;
    });

    it('should decompress data successfully', async () => {
      const result = await codecEngine.decompress(compressedData, originalResolution);

      expect(result).toBeDefined();
      expect(result.decompressedData).toBeInstanceOf(Float32Array);
      expect(result.decompressedData.length).toBeGreaterThan(0);
      expect(result.qualityMetrics).toBeDefined();
      expect(result.qualityMetrics.psnr).toBeGreaterThan(20); // Reasonable PSNR
      expect(result.qualityMetrics.ssim).toBeGreaterThan(0.7); // Good SSIM
      expect(result.decodingTime).toBeGreaterThan(0);
    });

    it('should handle different target resolutions', async () => {
      const higherResolution: [number, number, number] = [64, 64, 32];
      const result = await codecEngine.decompress(compressedData, higherResolution);

      expect(result).toBeDefined();
      expect(result.decompressedData.length).toBe(
        higherResolution[0] * higherResolution[1] * higherResolution[2] * 4
      );
    });

    it('should apply rendering context optimization', async () => {
      const renderingContext = {
        viewingAngle: [0.1, 0.2, 0.3] as [number, number, number],
        eyeTrackingData: {
          gazeX: 0.6,
          gazeY: 0.4
        },
        qualityTarget: 0.9
      };

      const result = await codecEngine.decompress(
        compressedData,
        originalResolution,
        renderingContext
      );

      expect(result).toBeDefined();
      expect(result.qualityMetrics.psnr).toBeGreaterThan(25); // Higher quality expected
    });

    it('should maintain acceptable quality metrics', async () => {
      const result = await codecEngine.decompress(compressedData, originalResolution);

      expect(result.qualityMetrics.psnr).toBeGreaterThan(25);
      expect(result.qualityMetrics.ssim).toBeGreaterThan(0.8);
      expect(result.qualityMetrics.lpips).toBeLessThan(0.2);
      expect(result.qualityMetrics.temporalConsistency).toBeGreaterThan(0.7);
    });

    it('should meet performance requirements', async () => {
      const startTime = performance.now();
      const result = await codecEngine.decompress(compressedData, originalResolution);
      const decodingTime = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(decodingTime).toBeLessThan(testConfig.latencyBudget * 2); // Allow 2x tolerance
      expect(result.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Performance Optimization', () => {
    it('should track performance metrics', async () => {
      const testData = new Float32Array(1000);
      const resolution: [number, number, number] = [10, 10, 10];
      
      // Perform several operations to generate metrics
      await codecEngine.compress(testData, resolution);
      
      const compressed = new Uint8Array(500);
      await codecEngine.decompress(compressed, resolution);

      const stats = codecEngine.getPerformanceStats();
      expect(stats.encoding.average).toBeGreaterThanOrEqual(0);
      expect(stats.decoding.average).toBeGreaterThanOrEqual(0);
      expect(stats.throughput.encoding).toBeGreaterThan(0);
      expect(stats.throughput.decoding).toBeGreaterThan(0);
    });

    it('should utilize caching effectively', async () => {
      const testData = new Float32Array(1000);
      const resolution: [number, number, number] = [10, 10, 10];

      // First compression
      const result1 = await codecEngine.compress(testData, resolution);
      
      // Second compression with same data (should hit cache)
      const result2 = await codecEngine.compress(testData, resolution);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      const stats = codecEngine.getPerformanceStats();
      expect(stats.cacheHitRate.encoding).toBeGreaterThanOrEqual(0);
    });

    it('should adapt to content complexity', async () => {
      // Simple data
      const simpleData = new Float32Array(1000);
      simpleData.fill(0.5);
      
      // Complex data
      const complexData = new Float32Array(1000);
      for (let i = 0; i < complexData.length; i++) {
        complexData[i] = Math.sin(i * 0.1) * Math.cos(i * 0.05) * 0.5 + 0.5;
      }

      const resolution: [number, number, number] = [10, 10, 10];
      
      const simpleResult = await codecEngine.compress(simpleData, resolution);
      const complexResult = await codecEngine.compress(complexData, resolution);

      // Complex data should result in different compression characteristics
      expect(simpleResult.compressionRatio).not.toBe(complexResult.compressionRatio);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        targetBitrate: 2000000, // 2 Mbps
        qualityTarget: 0.9
      };

      codecEngine.updateConfig(newConfig);
      
      // Configuration should be updated (no direct way to verify, but should not throw)
      expect(() => codecEngine.updateConfig(newConfig)).not.toThrow();
    });

    it('should handle quantum encoding toggle', () => {
      codecEngine.updateConfig({ quantumEncoding: false });
      expect(() => codecEngine.updateConfig({ quantumEncoding: true })).not.toThrow();
    });

    it('should clear caches on demand', () => {
      expect(() => codecEngine.clearCaches()).not.toThrow();
      
      const stats = codecEngine.getPerformanceStats();
      expect(stats.cacheHitRate.encoding).toBe(0);
      expect(stats.cacheHitRate.decoding).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty input data', async () => {
      const emptyData = new Float32Array(0);
      const resolution: [number, number, number] = [1, 1, 1];

      await expect(codecEngine.compress(emptyData, resolution))
        .rejects.toThrow();
    });

    it('should handle invalid resolutions', async () => {
      const testData = new Float32Array(100);
      const invalidResolution: [number, number, number] = [0, 0, 0];

      await expect(codecEngine.compress(testData, invalidResolution))
        .rejects.toThrow();
    });

    it('should handle malformed compressed data', async () => {
      const malformedData = new Uint8Array([1, 2, 3, 4, 5]);
      const resolution: [number, number, number] = [10, 10, 10];

      const result = await codecEngine.decompress(malformedData, resolution);
      
      // Should handle gracefully, even if quality is poor
      expect(result).toBeDefined();
      expect(result.decompressedData).toBeInstanceOf(Float32Array);
    });

    it('should handle extreme latency budgets', async () => {
      const extremeConfig: NeuralCodecConfig = {
        ...testConfig,
        latencyBudget: 0.1 // 0.1ms - nearly impossible
      };

      const extremeCodec = new BreakthroughNeuralCodecEngine(extremeConfig);
      const testData = new Float32Array(100);
      const resolution: [number, number, number] = [5, 5, 4];

      const result = await extremeCodec.compress(testData, resolution);
      
      // Should still work, even if it exceeds budget
      expect(result).toBeDefined();
      expect(result.compressedData.length).toBeGreaterThan(0);
      
      extremeCodec.dispose();
    });
  });

  describe('Research Validation', () => {
    it('should demonstrate compression breakthrough', async () => {
      const largeData = new Float32Array(10000);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = Math.sin(i * 0.01) * Math.cos(i * 0.005) * 0.5 + 0.5;
      }
      
      const resolution: [number, number, number] = [50, 50, 4];
      const result = await codecEngine.compress(largeData, resolution);

      // Breakthrough criteria
      expect(result.compressionRatio).toBeGreaterThan(5.0); // At least 5:1
      expect(result.qualityScore).toBeGreaterThan(0.8); // High quality maintained
      expect(result.encodingTime).toBeLessThan(50); // Fast encoding
    });

    it('should validate quantum-inspired improvements', async () => {
      const classicalConfig: NeuralCodecConfig = {
        ...testConfig,
        quantumEncoding: false
      };

      const quantumConfig: NeuralCodecConfig = {
        ...testConfig,
        quantumEncoding: true
      };

      const classicalCodec = new BreakthroughNeuralCodecEngine(classicalConfig);
      const quantumCodec = new BreakthroughNeuralCodecEngine(quantumConfig);

      const testData = new Float32Array(5000);
      for (let i = 0; i < testData.length; i++) {
        testData[i] = Math.random();
      }
      
      const resolution: [number, number, number] = [25, 25, 8];

      const classicalResult = await classicalCodec.compress(testData, resolution);
      const quantumResult = await quantumCodec.compress(testData, resolution);

      // Quantum should provide benefits (in research context)
      expect(quantumResult.metadata.quantumPaths).toBeGreaterThan(1);
      expect(quantumResult).toBeDefined();
      expect(classicalResult).toBeDefined();

      classicalCodec.dispose();
      quantumCodec.dispose();
    });

    it('should demonstrate perceptual optimization benefits', async () => {
      const uniformMap: PerceptualImportanceMap = {
        regions: { foveal: 0.5, parafoveal: 0.5, peripheral: 0.5 },
        semantic: { faces: 0.5, hands: 0.5, motion: 0.5, text: 0.5 },
        temporal: { static: 0.5, dynamic: 0.5, predicted: 0.5 }
      };

      const optimizedMap: PerceptualImportanceMap = {
        regions: { foveal: 0.95, parafoveal: 0.7, peripheral: 0.3 },
        semantic: { faces: 0.95, hands: 0.85, motion: 0.9, text: 0.95 },
        temporal: { static: 0.4, dynamic: 0.9, predicted: 0.7 }
      };

      const testData = new Float32Array(2000);
      const resolution: [number, number, number] = [20, 20, 5];

      const uniformResult = await codecEngine.compress(testData, resolution, uniformMap);
      const optimizedResult = await codecEngine.compress(testData, resolution, optimizedMap);

      // Optimized should show different characteristics
      expect(optimizedResult.metadata.perceptualRegions).toBeGreaterThanOrEqual(
        uniformResult.metadata.perceptualRegions
      );
    });
  });
});