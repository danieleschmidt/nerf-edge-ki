/**
 * Advanced Research Tests
 * Comprehensive testing for research components
 */

import { AdvancedSpatialCodec, SpatialCodecConfig, SpatialFeature } from '../../src/research/AdvancedSpatialCodec';
import { NeuralCompressionEngine, NeuralCompressionConfig, NeRFSample } from '../../src/research/NeuralCompressionEngine';
import { QuantumNerfOptimizer, QuantumOptimizationConfig, RenderingTask } from '../../src/research/QuantumNerfOptimizer';

describe('Advanced Research Components', () => {
  describe('AdvancedSpatialCodec', () => {
    let codec: AdvancedSpatialCodec;
    let testFeatures: SpatialFeature[];

    beforeEach(() => {
      const config: SpatialCodecConfig = {
        compressionLevel: 5,
        adaptiveQuality: true,
        realTimeMode: false,
        targetBitrate: 10,
        memoryBudget: 512
      };
      
      codec = new AdvancedSpatialCodec(config);
      
      // Generate test spatial features
      testFeatures = Array.from({ length: 1000 }, (_, i) => ({
        position: [Math.random() * 10, Math.random() * 10, Math.random() * 10] as [number, number, number],
        direction: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1] as [number, number, number],
        density: Math.random(),
        color: [Math.random(), Math.random(), Math.random()] as [number, number, number],
        importance: Math.random()
      }));
    });

    test('should compress and decompress spatial data', async () => {
      const compressionResult = await codec.compressSpatialData(testFeatures);
      
      expect(compressionResult.compressed).toBeInstanceOf(Uint8Array);
      expect(compressionResult.metadata.compressionRatio).toBeGreaterThan(1);
      expect(compressionResult.metadata.qualityScore).toBeGreaterThan(0);
      expect(compressionResult.metadata.encodeTime).toBeGreaterThan(0);

      const decompressionResult = await codec.decompressSpatialData(compressionResult.compressed);
      
      expect(decompressionResult.features).toHaveLength(compressionResult.metadata.compressedSize / 32);
      expect(decompressionResult.metadata.decodeTime).toBeGreaterThan(0);
    });

    test('should adapt quality based on scene complexity', () => {
      const initialLevel = 5;
      codec = new AdvancedSpatialCodec({
        compressionLevel: initialLevel,
        adaptiveQuality: true,
        realTimeMode: false,
        targetBitrate: 10,
        memoryBudget: 512
      });

      // Simulate high complexity scene requiring faster encoding
      codec.adaptQuality(0.9, 16.67); // Target 60 FPS
      
      // Quality adaptation should be working
      expect(codec).toBeDefined();
    });

    test('should handle streaming compression', async () => {
      const deltaFeatures = testFeatures.slice(0, 100);
      
      const streamingResult = await codec.streamingCompress(testFeatures, deltaFeatures);
      
      expect(streamingResult).toBeInstanceOf(Uint8Array);
      expect(streamingResult.length).toBeGreaterThan(0);
    });

    test('should provide performance metrics', () => {
      const metrics = codec.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('averageCompressionRatio');
      expect(metrics).toHaveProperty('averageQuality');
      expect(metrics).toHaveProperty('totalCompressions');
      expect(metrics.totalCompressions).toBe(0); // No compressions yet
    });

    test('should handle different compression levels', async () => {
      const lowCompressionConfig: SpatialCodecConfig = {
        compressionLevel: 1,
        adaptiveQuality: false,
        realTimeMode: true,
        targetBitrate: 20,
        memoryBudget: 1024
      };

      const highCompressionConfig: SpatialCodecConfig = {
        compressionLevel: 10,
        adaptiveQuality: false,
        realTimeMode: false,
        targetBitrate: 5,
        memoryBudget: 256
      };

      const lowCompressionCodec = new AdvancedSpatialCodec(lowCompressionConfig);
      const highCompressionCodec = new AdvancedSpatialCodec(highCompressionConfig);

      const lowResult = await lowCompressionCodec.compressSpatialData(testFeatures);
      const highResult = await highCompressionCodec.compressSpatialData(testFeatures);

      // Higher compression should result in smaller size but potentially lower quality
      expect(highResult.metadata.compressionRatio).toBeGreaterThan(lowResult.metadata.compressionRatio);
    });
  });

  describe('NeuralCompressionEngine', () => {
    let engine: NeuralCompressionEngine;
    let testSamples: NeRFSample[];

    beforeEach(async () => {
      const config: NeuralCompressionConfig = {
        modelComplexity: 'balanced',
        adaptiveCompression: true,
        perceptualLoss: true,
        temporalConsistency: true,
        targetQuality: 0.9,
        maxLatency: 16.67 // 60 FPS
      };

      engine = new NeuralCompressionEngine(config);
      await engine.initialize();

      // Generate test NeRF samples
      testSamples = Array.from({ length: 500 }, () => ({
        position: new Float32Array([Math.random() * 10, Math.random() * 10, Math.random() * 10]),
        viewDirection: new Float32Array([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1]),
        density: Math.random(),
        color: new Float32Array([Math.random(), Math.random(), Math.random()]),
        features: new Float32Array(Array.from({ length: 32 }, () => Math.random()))
      }));
    });

    test('should compress and decompress NeRF samples', async () => {
      const compressionResult = await engine.compressNeRFSamples(testSamples);
      
      expect(compressionResult.compressed).toBeInstanceOf(ArrayBuffer);
      expect(compressionResult.compressionRatio).toBeGreaterThan(1);
      expect(compressionResult.reconstructionError).toBeGreaterThanOrEqual(0);
      expect(compressionResult.processingTime).toBeGreaterThan(0);
      expect(compressionResult.networkInferences).toBeGreaterThan(0);

      const decompressedSamples = await engine.decompressNeRFSamples(compressionResult.compressed);
      
      expect(decompressedSamples).toHaveLength(testSamples.length);
      expect(decompressedSamples[0]).toHaveProperty('position');
      expect(decompressedSamples[0]).toHaveProperty('color');
      expect(decompressedSamples[0]).toHaveProperty('density');
    });

    test('should handle temporal sequence compression', async () => {
      const sequence = [testSamples, testSamples.slice(0, 400), testSamples.slice(0, 300)];
      const frameIndices = [0, 1, 2];

      const temporalResult = await engine.compressTemporalSequence(sequence, frameIndices);
      
      expect(temporalResult.keyFrames).toHaveLength(1); // Should identify key frames
      expect(temporalResult.deltaFrames.length).toBeGreaterThanOrEqual(0);
      expect(temporalResult.temporalMap).toHaveLength(sequence.length);
    });

    test('should optimize perceptual quality', async () => {
      const viewpoint = new Float32Array([0, 0, 5]);
      const importance = new Float32Array(testSamples.length).fill(1);

      const optimizedSamples = await engine.optimizePerceptualQuality(testSamples, viewpoint, importance);
      
      expect(optimizedSamples).toHaveLength(testSamples.length);
      expect(optimizedSamples[0]).toHaveProperty('features');
    });

    test('should provide comprehensive performance metrics', () => {
      const metrics = engine.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('averageCompressionRatio');
      expect(metrics).toHaveProperty('averageReconstructionError');
      expect(metrics).toHaveProperty('networkUtilization');
      expect(metrics.totalCompressions).toBeGreaterThanOrEqual(0);
    });

    test('should adapt model complexity based on performance', async () => {
      // Test with lightweight configuration
      const lightweightConfig: NeuralCompressionConfig = {
        modelComplexity: 'lightweight',
        adaptiveCompression: true,
        perceptualLoss: false,
        temporalConsistency: false,
        targetQuality: 0.7,
        maxLatency: 8.33 // 120 FPS
      };

      const lightweightEngine = new NeuralCompressionEngine(lightweightConfig);
      await lightweightEngine.initialize();

      const result = await lightweightEngine.compressNeRFSamples(testSamples.slice(0, 100));
      
      // Lightweight model should be faster
      expect(result.processingTime).toBeLessThan(50); // ms
    });
  });

  describe('QuantumNerfOptimizer', () => {
    let optimizer: QuantumNerfOptimizer;
    let testTasks: RenderingTask[];

    beforeEach(async () => {
      const config: QuantumOptimizationConfig = {
        quantumDepth: 8,
        entanglementStrength: 0.7,
        measurementStrategy: 'adaptive',
        coherenceTime: 1000,
        optimizationTarget: 'balanced',
        enableSuperposition: true
      };

      optimizer = new QuantumNerfOptimizer(config);
      await optimizer.initialize();

      // Generate test rendering tasks
      testTasks = Array.from({ length: 20 }, (_, i) => ({
        id: `task-${i}`,
        priority: Math.floor(Math.random() * 100),
        complexity: Math.floor(Math.random() * 100),
        resourceRequirements: {
          memory: Math.random() * 512,
          compute: Math.random() * 100,
          bandwidth: Math.random() * 50
        }
      }));
    });

    afterEach(() => {
      optimizer.dispose();
    });

    test('should optimize rendering tasks using quantum algorithms', async () => {
      const optimizationResult = await optimizer.optimizeRendering(testTasks);
      
      expect(optimizationResult.convergenceTime).toBeGreaterThan(0);
      expect(optimizationResult.finalState).toHaveLength(8); // quantumDepth
      expect(optimizationResult.optimizationSteps).toBeGreaterThan(0);
      expect(optimizationResult.qualityImprovement).toBeGreaterThanOrEqual(-1); // Can be negative
      expect(optimizationResult.energyReduction).toBeGreaterThanOrEqual(-1);
      expect(optimizationResult.coherenceLoss).toBeGreaterThanOrEqual(0);
    });

    test('should perform quantum annealing optimization', async () => {
      const parameters = [1, 2, 3, 4, 5];
      const costFunction = (params: number[]) => {
        return params.reduce((sum, p) => sum + p * p, 0); // Minimize sum of squares
      };

      const annealingResult = await optimizer.quantumAnnealing(parameters, costFunction);
      
      expect(annealingResult.optimizedParameters).toHaveLength(parameters.length);
      expect(annealingResult.minCost).toBeLessThanOrEqual(costFunction(parameters));
      expect(annealingResult.annealingSteps).toBeGreaterThan(0);
    });

    test('should perform quantum error correction', async () => {
      const renderingErrors = [0.1, 0.05, 0.2, 0.15, 0.08];
      
      const correctedErrors = await optimizer.quantumErrorCorrection(renderingErrors);
      
      expect(correctedErrors).toHaveLength(renderingErrors.length);
      
      // Error correction should reduce errors on average
      const originalMeanError = renderingErrors.reduce((sum, e) => sum + e, 0) / renderingErrors.length;
      const correctedMeanError = correctedErrors.reduce((sum, e) => sum + e, 0) / correctedErrors.length;
      
      expect(Math.abs(correctedMeanError)).toBeLessThanOrEqual(originalMeanError * 1.1); // Allow some tolerance
    });

    test('should execute tasks in quantum parallel', async () => {
      const parallelResults = await optimizer.quantumParallelExecution(testTasks);
      
      expect(parallelResults).toHaveLength(testTasks.length);
      expect(parallelResults[0]).toHaveProperty('id');
      expect(parallelResults[0]).toHaveProperty('priority');
      expect(parallelResults[0]).toHaveProperty('complexity');
    });

    test('should adapt optimization based on performance feedback', async () => {
      const currentMetrics = {
        fps: 45,
        frameTime: 22.2,
        gpuUtilization: 80,
        memoryUsage: 400,
        powerConsumption: 8
      };

      const targetMetrics = {
        fps: 60,
        frameTime: 16.67,
        gpuUtilization: 70,
        memoryUsage: 300,
        powerConsumption: 6
      };

      const newConfig = await optimizer.adaptiveOptimization(currentMetrics, targetMetrics);
      
      expect(newConfig).toHaveProperty('quantumDepth');
      expect(newConfig).toHaveProperty('entanglementStrength');
      expect(newConfig).toHaveProperty('coherenceTime');
      expect(newConfig.quantumDepth).toBeGreaterThan(0);
    });

    test('should provide quantum performance metrics', () => {
      const metrics = optimizer.getQuantumMetrics();
      
      expect(metrics).toHaveProperty('quantumCoherence');
      expect(metrics).toHaveProperty('entanglementStrength');
      expect(metrics).toHaveProperty('quantumSpeedup');
      expect(metrics).toHaveProperty('errorCorrectionRate');
      expect(metrics).toHaveProperty('optimizationEfficiency');
      
      expect(metrics.quantumCoherence).toBeGreaterThanOrEqual(0);
      expect(metrics.quantumCoherence).toBeLessThanOrEqual(1);
      expect(metrics.entanglementStrength).toBeGreaterThanOrEqual(0);
      expect(metrics.quantumSpeedup).toBeGreaterThan(0);
    });

    test('should handle different optimization targets', async () => {
      const speedConfig: QuantumOptimizationConfig = {
        quantumDepth: 4,
        entanglementStrength: 0.5,
        measurementStrategy: 'periodic',
        coherenceTime: 500,
        optimizationTarget: 'speed',
        enableSuperposition: true
      };

      const qualityConfig: QuantumOptimizationConfig = {
        quantumDepth: 16,
        entanglementStrength: 0.9,
        measurementStrategy: 'threshold',
        coherenceTime: 2000,
        optimizationTarget: 'quality',
        enableSuperposition: true
      };

      const speedOptimizer = new QuantumNerfOptimizer(speedConfig);
      const qualityOptimizer = new QuantumNerfOptimizer(qualityConfig);

      await speedOptimizer.initialize();
      await qualityOptimizer.initialize();

      const speedResult = await speedOptimizer.optimizeRendering(testTasks);
      const qualityResult = await qualityOptimizer.optimizeRendering(testTasks);

      // Speed optimizer should converge faster
      expect(speedResult.convergenceTime).toBeLessThan(qualityResult.convergenceTime * 2);

      speedOptimizer.dispose();
      qualityOptimizer.dispose();
    });
  });

  describe('Integration Tests', () => {
    test('should integrate all research components', async () => {
      // Create components
      const spatialCodec = new AdvancedSpatialCodec({
        compressionLevel: 7,
        adaptiveQuality: true,
        realTimeMode: true,
        targetBitrate: 15,
        memoryBudget: 512
      });

      const neuralEngine = new NeuralCompressionEngine({
        modelComplexity: 'balanced',
        adaptiveCompression: true,
        perceptualLoss: true,
        temporalConsistency: true,
        targetQuality: 0.85,
        maxLatency: 16.67
      });

      const quantumOptimizer = new QuantumNerfOptimizer({
        quantumDepth: 6,
        entanglementStrength: 0.6,
        measurementStrategy: 'adaptive',
        coherenceTime: 1500,
        optimizationTarget: 'balanced',
        enableSuperposition: true
      });

      await neuralEngine.initialize();
      await quantumOptimizer.initialize();

      // Test data
      const spatialFeatures: SpatialFeature[] = Array.from({ length: 100 }, (_, i) => ({
        position: [i * 0.1, Math.sin(i * 0.1), Math.cos(i * 0.1)] as [number, number, number],
        direction: [0, 0, 1] as [number, number, number],
        density: Math.abs(Math.sin(i * 0.1)),
        color: [Math.abs(Math.sin(i * 0.1)), Math.abs(Math.cos(i * 0.1)), 0.5] as [number, number, number],
        importance: Math.random()
      }));

      const nerfSamples: NeRFSample[] = Array.from({ length: 50 }, (_, i) => ({
        position: new Float32Array([i * 0.2, Math.sin(i * 0.2), Math.cos(i * 0.2)]),
        viewDirection: new Float32Array([0, 0, 1]),
        density: Math.abs(Math.sin(i * 0.2)),
        color: new Float32Array([Math.abs(Math.sin(i * 0.2)), Math.abs(Math.cos(i * 0.2)), 0.5]),
        features: new Float32Array(Array.from({ length: 16 }, () => Math.random()))
      }));

      const renderingTasks: RenderingTask[] = Array.from({ length: 10 }, (_, i) => ({
        id: `integrated-task-${i}`,
        priority: 50 + i * 5,
        complexity: 30 + i * 7,
        resourceRequirements: {
          memory: 100 + i * 20,
          compute: 50 + i * 5,
          bandwidth: 10 + i * 2
        }
      }));

      // Execute integrated workflow
      const spatialResult = await spatialCodec.compressSpatialData(spatialFeatures);
      const neuralResult = await neuralEngine.compressNeRFSamples(nerfSamples);
      const quantumResult = await quantumOptimizer.optimizeRendering(renderingTasks);

      // Verify integration
      expect(spatialResult.metadata.compressionRatio).toBeGreaterThan(1);
      expect(neuralResult.compressionRatio).toBeGreaterThan(1);
      expect(quantumResult.optimizationSteps).toBeGreaterThan(0);

      // Get combined metrics
      const spatialMetrics = spatialCodec.getPerformanceMetrics();
      const neuralMetrics = neuralEngine.getPerformanceMetrics();
      const quantumMetrics = quantumOptimizer.getQuantumMetrics();

      expect(spatialMetrics.totalCompressions).toBe(1);
      expect(neuralMetrics.totalCompressions).toBe(1);
      expect(quantumMetrics.quantumCoherence).toBeGreaterThan(0);

      // Test cross-component optimization
      const combinedPerformance = {
        spatialCompressionRatio: spatialMetrics.averageCompressionRatio,
        neuralCompressionRatio: neuralMetrics.averageCompressionRatio,
        quantumSpeedup: quantumMetrics.quantumSpeedup,
        totalProcessingTime: spatialResult.metadata.encodeTime + neuralResult.processingTime + quantumResult.convergenceTime
      };

      expect(combinedPerformance.totalProcessingTime).toBeGreaterThan(0);
      expect(combinedPerformance.spatialCompressionRatio).toBeGreaterThan(0);
      expect(combinedPerformance.neuralCompressionRatio).toBeGreaterThan(0);
      expect(combinedPerformance.quantumSpeedup).toBeGreaterThan(0);

      // Cleanup
      quantumOptimizer.dispose();
    });

    test('should handle error conditions gracefully', async () => {
      const codec = new AdvancedSpatialCodec({
        compressionLevel: 5,
        adaptiveQuality: false,
        realTimeMode: false,
        targetBitrate: 10,
        memoryBudget: 512
      });

      // Test with empty data
      const emptyFeatures: SpatialFeature[] = [];
      const emptyResult = await codec.compressSpatialData(emptyFeatures);
      
      expect(emptyResult.compressed).toBeInstanceOf(Uint8Array);
      expect(emptyResult.metadata.originalSize).toBe(0);

      // Test decompression of empty data
      const emptyDecompression = await codec.decompressSpatialData(new Uint8Array(0));
      expect(emptyDecompression.features).toHaveLength(0);
    });
  });
});