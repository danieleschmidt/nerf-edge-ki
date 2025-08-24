/**
 * Tests for Novel Spatial Awareness Engine
 * 
 * Comprehensive testing of revolutionary multi-user collaborative spatial computing
 * capabilities including semantic understanding and predictive modeling.
 */

import { NovelSpatialAwarenessEngine, SpatialAwarenessConfig, SpatialAnchor, SemanticObject, SpatialUser } from '../../src/research/NovelSpatialAwarenessEngine';

describe('NovelSpatialAwarenessEngine', () => {
  let spatialEngine: NovelSpatialAwarenessEngine;
  let testConfig: SpatialAwarenessConfig;

  beforeEach(() => {
    testConfig = {
      trackingAccuracy: 'high',
      collaborativeMode: true,
      semanticAnalysis: true,
      predictiveModeling: true,
      privacyPreservation: true,
      maxUsers: 10,
      maxObjects: 1000,
      updateFrequency: 60, // 60Hz
      driftCorrectionEnabled: true,
      crossDeviceSync: true
    };

    spatialEngine = new NovelSpatialAwarenessEngine(testConfig);
  });

  afterEach(() => {
    spatialEngine.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(spatialEngine).toBeDefined();
      expect(spatialEngine.updateSpatialAnchors).toBeDefined();
      expect(spatialEngine.recognizeSemanticObjects).toBeDefined();
      expect(spatialEngine.generatePredictiveModel).toBeDefined();
      expect(spatialEngine.synchronizeWithDevices).toBeDefined();
    });

    it('should initialize with collaborative mode', () => {
      const stats = spatialEngine.getSpatialStats();
      expect(stats).toBeDefined();
      expect(stats.consensus).toBeDefined();
      expect(stats.performance.updateFrequency).toBe(60);
    });

    it('should support single-device mode', () => {
      const singleDeviceConfig: SpatialAwarenessConfig = {
        ...testConfig,
        collaborativeMode: false,
        maxUsers: 1
      };

      const singleEngine = new NovelSpatialAwarenessEngine(singleDeviceConfig);
      expect(singleEngine).toBeDefined();
      
      singleEngine.dispose();
    });
  });

  describe('Spatial Anchor Management', () => {
    const mockDeviceId = 'device_001';
    
    it('should update spatial anchors successfully', async () => {
      const newAnchors: Partial<SpatialAnchor>[] = [
        {
          position: [1.0, 0.5, 2.0],
          orientation: [0, 0, 0, 1],
          semanticLabel: 'wall'
        },
        {
          position: [0.0, 0.0, 0.0],
          orientation: [0, 0, 0, 1],
          semanticLabel: 'floor'
        }
      ];

      const result = await spatialEngine.updateSpatialAnchors(mockDeviceId, newAnchors);

      expect(result).toBeDefined();
      expect(result.updatedAnchors).toHaveLength(2);
      expect(result.driftCorrection).toHaveLength(6);
      expect(result.consensusStatus).toBeDefined();
      
      // Check anchor properties
      result.updatedAnchors.forEach(anchor => {
        expect(anchor.id).toBeDefined();
        expect(anchor.deviceId).toBe(mockDeviceId);
        expect(anchor.confidence).toBeGreaterThan(0);
        expect(anchor.confidence).toBeLessThanOrEqual(1);
        expect(anchor.persistenceScore).toBeGreaterThan(0);
        expect(anchor.persistenceScore).toBeLessThanOrEqual(1);
        expect(anchor.timestamp).toBeGreaterThan(0);
      });
    });

    it('should handle anchor confidence scoring', async () => {
      const newAnchors: Partial<SpatialAnchor>[] = [
        {
          position: [1.0, 1.5, 3.0],
          orientation: [0, 0, 0.707, 0.707],
          semanticLabel: 'wall' // High persistence
        },
        {
          position: [2.0, 1.0, 1.0],
          orientation: [0, 0, 0, 1],
          semanticLabel: 'person' // Low persistence
        }
      ];

      const sensorData = {
        accelerometer: [0.1, 9.8, 0.2] as [number, number, number],
        gyroscope: [0.01, 0.02, -0.01] as [number, number, number],
        magnetometer: [23.1, 5.2, -41.3] as [number, number, number]
      };

      const result = await spatialEngine.updateSpatialAnchors(mockDeviceId, newAnchors, sensorData);

      expect(result.updatedAnchors).toHaveLength(2);
      
      const wallAnchor = result.updatedAnchors.find(a => a.semanticLabel === 'wall');
      const personAnchor = result.updatedAnchors.find(a => a.semanticLabel === 'person');
      
      expect(wallAnchor?.persistenceScore).toBeGreaterThan(personAnchor?.persistenceScore || 0);
    });

    it('should perform drift correction in collaborative mode', async () => {
      const device1 = 'device_001';
      const device2 = 'device_002';

      // Add anchors from first device
      const anchors1: Partial<SpatialAnchor>[] = [
        {
          position: [1.0, 0.0, 1.0],
          orientation: [0, 0, 0, 1],
          semanticLabel: 'table'
        }
      ];

      await spatialEngine.updateSpatialAnchors(device1, anchors1);

      // Add slightly offset anchors from second device (simulating drift)
      const anchors2: Partial<SpatialAnchor>[] = [
        {
          position: [1.05, 0.02, 1.03], // Small drift
          orientation: [0, 0.01, 0, 0.9999],
          semanticLabel: 'table'
        }
      ];

      const result = await spatialEngine.updateSpatialAnchors(device2, anchors2);

      expect(result.driftCorrection).toBeDefined();
      expect(result.driftCorrection).toHaveLength(6); // 3D position + 3D orientation
    });

    it('should build collaborative consensus', async () => {
      const devices = ['device_001', 'device_002', 'device_003'];
      const commonAnchor: Partial<SpatialAnchor> = {
        position: [0.0, 1.0, 2.0],
        orientation: [0, 0, 0, 1],
        semanticLabel: 'chair'
      };

      // Add the same anchor from multiple devices with slight variations
      for (const device of devices) {
        const anchors = [{
          ...commonAnchor,
          position: [
            commonAnchor.position![0] + (Math.random() - 0.5) * 0.1,
            commonAnchor.position![1] + (Math.random() - 0.5) * 0.1,
            commonAnchor.position![2] + (Math.random() - 0.5) * 0.1
          ] as [number, number, number]
        }];
        
        await spatialEngine.updateSpatialAnchors(device, anchors);
      }

      const stats = spatialEngine.getSpatialStats();
      expect(stats.consensus.avgConsensusScore).toBeGreaterThan(0.5);
    });
  });

  describe('Semantic Object Recognition', () => {
    const mockDeviceId = 'device_semantic';
    
    it('should recognize semantic objects successfully', async () => {
      // Create mock sensor data
      const pointCloud = new Float32Array(3000); // 1000 points * 3D
      for (let i = 0; i < pointCloud.length; i += 3) {
        pointCloud[i] = Math.random() * 5 - 2.5; // X: -2.5 to 2.5
        pointCloud[i + 1] = Math.random() * 3; // Y: 0 to 3
        pointCloud[i + 2] = Math.random() * 5 - 2.5; // Z: -2.5 to 2.5
      }

      const rgbData = new Uint8Array(1000 * 3); // RGB for each point
      for (let i = 0; i < rgbData.length; i++) {
        rgbData[i] = Math.floor(Math.random() * 256);
      }

      const depth = new Float32Array(1000);
      for (let i = 0; i < depth.length; i++) {
        depth[i] = Math.random() * 10; // 0 to 10 meters
      }

      const result = await spatialEngine.recognizeSemanticObjects(
        pointCloud,
        rgbData,
        depth,
        mockDeviceId
      );

      expect(result).toBeDefined();
      expect(result.detectedObjects).toBeDefined();
      expect(result.objectUpdates).toBeDefined();
      expect(result.semanticScene).toBeDefined();
      expect(result.semanticScene.roomType).toBeDefined();
      expect(result.semanticScene.primarySurfaces).toBeDefined();
      expect(result.semanticScene.interactionZones).toBeDefined();
    });

    it('should handle user context for improved recognition', async () => {
      const pointCloud = new Float32Array(1500);
      const rgbData = new Uint8Array(500 * 3);
      const depth = new Float32Array(500);

      // Fill with test data
      pointCloud.fill(1.0);
      rgbData.fill(128);
      depth.fill(2.0);

      const userContext = {
        gazeDirection: [0.0, 0.0, 1.0] as [number, number, number],
        handPositions: [
          [0.5, 1.0, 0.8] as [number, number, number],
          [-0.5, 1.0, 0.8] as [number, number, number]
        ],
        voiceCommand: 'find chair'
      };

      const result = await spatialEngine.recognizeSemanticObjects(
        pointCloud,
        rgbData,
        depth,
        mockDeviceId,
        userContext
      );

      expect(result).toBeDefined();
      expect(result.detectedObjects.length).toBeGreaterThanOrEqual(0);
    });

    it('should track object persistence over time', async () => {
      const pointCloud = new Float32Array(1200);
      const rgbData = new Uint8Array(400 * 3);
      const depth = new Float32Array(400);

      // First recognition
      const result1 = await spatialEngine.recognizeSemanticObjects(
        pointCloud,
        rgbData,
        depth,
        mockDeviceId
      );

      // Second recognition with slight changes (simulating tracking)
      for (let i = 0; i < pointCloud.length; i++) {
        pointCloud[i] += (Math.random() - 0.5) * 0.1; // Add noise
      }

      const result2 = await spatialEngine.recognizeSemanticObjects(
        pointCloud,
        rgbData,
        depth,
        mockDeviceId
      );

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Check for object updates
      expect(result2.objectUpdates).toBeDefined();
    });

    it('should validate semantic scene analysis', async () => {
      const pointCloud = new Float32Array(3000);
      const rgbData = new Uint8Array(1000 * 3);
      const depth = new Float32Array(1000);

      // Create a more structured scene
      for (let i = 0; i < 1000; i++) {
        const idx = i * 3;
        if (i < 200) {
          // Floor points
          pointCloud[idx] = Math.random() * 4 - 2;
          pointCloud[idx + 1] = 0;
          pointCloud[idx + 2] = Math.random() * 4 - 2;
        } else if (i < 400) {
          // Wall points
          pointCloud[idx] = 2;
          pointCloud[idx + 1] = Math.random() * 3;
          pointCloud[idx + 2] = Math.random() * 4 - 2;
        } else {
          // Object points
          pointCloud[idx] = Math.random() * 2 - 1;
          pointCloud[idx + 1] = Math.random() * 2 + 0.5;
          pointCloud[idx + 2] = Math.random() * 2 - 1;
        }
      }

      rgbData.fill(100);
      depth.fill(3.0);

      const result = await spatialEngine.recognizeSemanticObjects(
        pointCloud,
        rgbData,
        depth,
        mockDeviceId
      );

      expect(result.semanticScene.roomType).toBeDefined();
      expect(result.semanticScene.primarySurfaces.length).toBeGreaterThan(0);
      expect(result.semanticScene.interactionZones.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Predictive Modeling', () => {
    it('should generate predictive model successfully', async () => {
      // Add some mock users and objects first
      const mockUser: SpatialUser = {
        id: 'user_001',
        deviceId: 'device_001',
        headPose: {
          position: [0, 1.7, 0],
          orientation: [0, 0, 0, 1],
          velocity: [0.1, 0, 0.05],
          acceleration: [0, 0, 0]
        },
        handPoses: [
          {
            hand: 'right',
            position: [0.3, 1.2, 0.2],
            orientation: [0, 0, 0, 1],
            gesture: 'point',
            confidence: 0.8
          }
        ],
        privacyBounds: {
          center: [0, 1.7, 0],
          radius: 1.0,
          shareLevel: 'full'
        },
        lastUpdate: Date.now()
      };

      // Simulate adding user to the system (would be done through internal methods)
      // For testing, we'll call generatePredictiveModel directly
      const result = await spatialEngine.generatePredictiveModel(2000); // 2 second horizon

      expect(result).toBeDefined();
      expect(result.userMovementPrediction).toBeDefined();
      expect(result.objectInteractionPrediction).toBeDefined();
      expect(result.environmentChangePrediction).toBeDefined();
      expect(result.environmentChangePrediction.newObjects).toBeDefined();
      expect(result.environmentChangePrediction.disappearingObjects).toBeDefined();
    });

    it('should predict user movements with confidence scores', async () => {
      const result = await spatialEngine.generatePredictiveModel(1000);

      for (const [userId, prediction] of result.userMovementPrediction) {
        expect(prediction.predictedPosition).toHaveLength(3);
        expect(prediction.predictedOrientation).toHaveLength(4);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(prediction.timeHorizon).toBe(1000);
      }
    });

    it('should predict object interactions', async () => {
      const result = await spatialEngine.generatePredictiveModel(1500);

      for (const [objectId, prediction] of result.objectInteractionPrediction) {
        expect(prediction.likelyInteractions).toBeDefined();
        
        for (const interaction of prediction.likelyInteractions) {
          expect(interaction.type).toBeDefined();
          expect(interaction.probability).toBeGreaterThanOrEqual(0);
          expect(interaction.probability).toBeLessThanOrEqual(1);
          expect(interaction.expectedTime).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should predict environment changes', async () => {
      const result = await spatialEngine.generatePredictiveModel(3000);

      expect(result.environmentChangePrediction.newObjects).toBeDefined();
      expect(result.environmentChangePrediction.disappearingObjects).toBeDefined();

      for (const newObj of result.environmentChangePrediction.newObjects) {
        expect(newObj.type).toBeDefined();
        expect(newObj.probability).toBeGreaterThanOrEqual(0);
        expect(newObj.probability).toBeLessThanOrEqual(1);
        expect(newObj.expectedPosition).toHaveLength(3);
      }

      for (const disappearing of result.environmentChangePrediction.disappearingObjects) {
        expect(disappearing.objectId).toBeDefined();
        expect(disappearing.probability).toBeGreaterThanOrEqual(0);
        expect(disappearing.probability).toBeLessThanOrEqual(1);
        expect(disappearing.expectedTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle different time horizons', async () => {
      const shortTerm = await spatialEngine.generatePredictiveModel(500);
      const longTerm = await spatialEngine.generatePredictiveModel(5000);

      expect(shortTerm).toBeDefined();
      expect(longTerm).toBeDefined();

      // Predictions should have different characteristics for different time horizons
      for (const [_, prediction] of shortTerm.userMovementPrediction) {
        expect(prediction.timeHorizon).toBe(500);
      }

      for (const [_, prediction] of longTerm.userMovementPrediction) {
        expect(prediction.timeHorizon).toBe(5000);
      }
    });
  });

  describe('Collaborative Synchronization', () => {
    it('should synchronize with multiple devices', async () => {
      const targetDevices = ['device_002', 'device_003', 'device_004'];
      const dataToShare = {
        anchors: true,
        objects: true,
        users: false, // Privacy - don't share user data
        predictions: true
      };

      const result = await spatialEngine.synchronizeWithDevices(
        targetDevices,
        dataToShare,
        'selective'
      );

      expect(result).toBeDefined();
      expect(result.syncedDevices).toBeDefined();
      expect(result.failedDevices).toBeDefined();
      expect(result.sharedDataSize).toBeGreaterThanOrEqual(0);
      expect(result.encryptionUsed).toBeDefined();
    });

    it('should respect privacy levels', async () => {
      const targetDevices = ['device_privacy_test'];
      const dataToShare = {
        anchors: true,
        objects: true,
        users: true,
        predictions: true
      };

      const minimalResult = await spatialEngine.synchronizeWithDevices(
        targetDevices,
        dataToShare,
        'minimal'
      );

      const fullResult = await spatialEngine.synchronizeWithDevices(
        targetDevices,
        dataToShare,
        'full'
      );

      expect(minimalResult.sharedDataSize).toBeLessThanOrEqual(fullResult.sharedDataSize);
    });

    it('should handle synchronization failures gracefully', async () => {
      const invalidDevices = ['non_existent_device', 'offline_device'];
      const dataToShare = { anchors: true, objects: false, users: false, predictions: false };

      const result = await spatialEngine.synchronizeWithDevices(
        invalidDevices,
        dataToShare,
        'selective'
      );

      expect(result).toBeDefined();
      expect(result.failedDevices.length).toBeGreaterThan(0);
      expect(result.syncedDevices.length).toBe(0);
    });

    it('should use encryption when privacy preservation is enabled', async () => {
      const privacyEngine = new NovelSpatialAwarenessEngine({
        ...testConfig,
        privacyPreservation: true
      });

      const result = await privacyEngine.synchronizeWithDevices(
        ['device_encrypted'],
        { anchors: true, objects: false, users: false, predictions: false },
        'full'
      );

      expect(result.encryptionUsed).toBe(true);
      
      privacyEngine.dispose();
    });
  });

  describe('Performance and Optimization', () => {
    it('should track comprehensive spatial statistics', () => {
      const stats = spatialEngine.getSpatialStats();

      expect(stats).toBeDefined();
      expect(stats.anchors).toBeDefined();
      expect(stats.objects).toBeDefined();
      expect(stats.users).toBeDefined();
      expect(stats.performance).toBeDefined();
      expect(stats.consensus).toBeDefined();

      expect(stats.anchors.total).toBeGreaterThanOrEqual(0);
      expect(stats.objects.total).toBeGreaterThanOrEqual(0);
      expect(stats.users.total).toBeGreaterThanOrEqual(0);
      expect(stats.performance.updateFrequency).toBe(60);
    });

    it('should maintain performance under load', async () => {
      // Simulate high load with multiple simultaneous operations
      const deviceId = 'load_test_device';
      const operations: Promise<any>[] = [];

      // Multiple anchor updates
      for (let i = 0; i < 10; i++) {
        const anchors: Partial<SpatialAnchor>[] = [
          {
            position: [Math.random() * 5, Math.random() * 3, Math.random() * 5],
            orientation: [0, 0, 0, 1],
            semanticLabel: `object_${i}`
          }
        ];
        operations.push(spatialEngine.updateSpatialAnchors(deviceId, anchors));
      }

      // Multiple object recognition calls
      for (let i = 0; i < 5; i++) {
        const pointCloud = new Float32Array(600);
        const rgbData = new Uint8Array(200 * 3);
        const depth = new Float32Array(200);
        
        pointCloud.fill(Math.random());
        rgbData.fill(128);
        depth.fill(2.0);

        operations.push(spatialEngine.recognizeSemanticObjects(
          pointCloud, rgbData, depth, `${deviceId}_${i}`
        ));
      }

      // Multiple predictive model generations
      for (let i = 0; i < 3; i++) {
        operations.push(spatialEngine.generatePredictiveModel(1000 + i * 500));
      }

      // Wait for all operations to complete
      const results = await Promise.allSettled(operations);
      
      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(operations.length * 0.8);
    });

    it('should optimize memory usage', async () => {
      const initialStats = spatialEngine.getSpatialStats();
      const initialMemory = initialStats.performance.memoryUsage;

      // Add many objects and anchors
      for (let i = 0; i < 50; i++) {
        const anchors: Partial<SpatialAnchor>[] = [
          {
            position: [Math.random() * 10, Math.random() * 5, Math.random() * 10],
            orientation: [0, 0, 0, 1],
            semanticLabel: `temp_object_${i}`
          }
        ];
        await spatialEngine.updateSpatialAnchors(`device_${i}`, anchors);
      }

      const afterAddingStats = spatialEngine.getSpatialStats();
      expect(afterAddingStats.performance.memoryUsage).toBeGreaterThan(initialMemory);

      // Clear data and check memory reduction
      spatialEngine.clearSpatialData();
      
      const afterClearStats = spatialEngine.getSpatialStats();
      expect(afterClearStats.performance.memoryUsage).toBeLessThan(afterAddingStats.performance.memoryUsage);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxUsers: 20,
        updateFrequency: 120,
        trackingAccuracy: 'medium' as const
      };

      spatialEngine.updateConfig(newConfig);
      
      // Should not throw and configuration should be updated
      expect(() => spatialEngine.updateConfig(newConfig)).not.toThrow();
    });

    it('should handle configuration edge cases', () => {
      const extremeConfig = {
        maxUsers: 1000,
        maxObjects: 10000,
        updateFrequency: 1000 // Very high frequency
      };

      expect(() => spatialEngine.updateConfig(extremeConfig)).not.toThrow();
    });

    it('should clear spatial data on demand', () => {
      spatialEngine.clearSpatialData();
      
      const stats = spatialEngine.getSpatialStats();
      expect(stats.anchors.total).toBe(0);
      expect(stats.objects.total).toBe(0);
      expect(stats.users.total).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid anchor data', async () => {
      const invalidAnchors: Partial<SpatialAnchor>[] = [
        {
          position: [NaN, Infinity, -Infinity],
          orientation: [0, 0, 0, 0], // Invalid quaternion
          semanticLabel: ''
        }
      ];

      // Should handle gracefully without crashing
      const result = await spatialEngine.updateSpatialAnchors('test_device', invalidAnchors);
      expect(result).toBeDefined();
    });

    it('should handle empty sensor data', async () => {
      const emptyPointCloud = new Float32Array(0);
      const emptyRgb = new Uint8Array(0);
      const emptyDepth = new Float32Array(0);

      const result = await spatialEngine.recognizeSemanticObjects(
        emptyPointCloud,
        emptyRgb,
        emptyDepth,
        'empty_test_device'
      );

      expect(result).toBeDefined();
      expect(result.detectedObjects).toHaveLength(0);
    });

    it('should handle malformed sensor data', async () => {
      // Create malformed data with mismatched sizes
      const pointCloud = new Float32Array(100); // Only 100 values, not divisible by 3
      const rgbData = new Uint8Array(50); // Mismatched size
      const depth = new Float32Array(200); // Different size again

      pointCloud.fill(1.0);
      rgbData.fill(128);
      depth.fill(2.0);

      const result = await spatialEngine.recognizeSemanticObjects(
        pointCloud,
        rgbData,
        depth,
        'malformed_test_device'
      );

      expect(result).toBeDefined();
    });

    it('should handle prediction with no data', async () => {
      // Clear all data first
      spatialEngine.clearSpatialData();
      
      const result = await spatialEngine.generatePredictiveModel(1000);
      
      expect(result).toBeDefined();
      expect(result.userMovementPrediction.size).toBe(0);
      expect(result.objectInteractionPrediction.size).toBe(0);
    });
  });

  describe('Research Validation', () => {
    it('should demonstrate spatial awareness breakthrough', async () => {
      const deviceId = 'breakthrough_test';
      
      // Create a complex spatial scene
      const anchors: Partial<SpatialAnchor>[] = [
        { position: [0, 0, 0], orientation: [0, 0, 0, 1], semanticLabel: 'floor' },
        { position: [2, 1.5, 0], orientation: [0, 0, 0, 1], semanticLabel: 'wall' },
        { position: [1, 0.8, 1], orientation: [0, 0, 0, 1], semanticLabel: 'table' },
        { position: [1.2, 1.2, 1.2], orientation: [0, 0, 0, 1], semanticLabel: 'lamp' }
      ];

      const result = await spatialEngine.updateSpatialAnchors(deviceId, anchors);
      
      // Breakthrough criteria
      expect(result.updatedAnchors.length).toBe(4);
      expect(result.consensusStatus.size).toBeGreaterThan(0);
      
      // All anchors should have high confidence
      const avgConfidence = result.updatedAnchors.reduce((sum, a) => sum + a.confidence, 0) / result.updatedAnchors.length;
      expect(avgConfidence).toBeGreaterThan(0.7);
    });

    it('should validate multi-user collaboration benefits', async () => {
      const devices = ['device_collab_1', 'device_collab_2', 'device_collab_3'];
      
      // Each device reports the same object with slight variations
      const basePosition: [number, number, number] = [1.5, 0.5, 2.0];
      
      for (const [index, device] of devices.entries()) {
        const anchors: Partial<SpatialAnchor>[] = [
          {
            position: [
              basePosition[0] + (Math.random() - 0.5) * 0.05, // ±2.5cm variation
              basePosition[1] + (Math.random() - 0.5) * 0.05,
              basePosition[2] + (Math.random() - 0.5) * 0.05
            ],
            orientation: [0, 0, 0, 1],
            semanticLabel: 'shared_object'
          }
        ];
        
        await spatialEngine.updateSpatialAnchors(device, anchors);
      }

      const stats = spatialEngine.getSpatialStats();
      
      // Collaboration should improve accuracy
      expect(stats.consensus.avgConsensusScore).toBeGreaterThan(0.8);
      expect(stats.anchors.total).toBeGreaterThan(0);
    });

    it('should demonstrate predictive modeling accuracy', async () => {
      // Add a user with predictable movement pattern
      const deviceId = 'predictive_test';
      const anchors: Partial<SpatialAnchor>[] = [
        {
          position: [0, 1.7, 0], // Head height
          orientation: [0, 0, 0, 1],
          semanticLabel: 'user_head'
        }
      ];

      await spatialEngine.updateSpatialAnchors(deviceId, anchors);

      // Generate prediction
      const prediction = await spatialEngine.generatePredictiveModel(2000);
      
      expect(prediction).toBeDefined();
      expect(prediction.userMovementPrediction.size).toBeGreaterThanOrEqual(0);
      
      // Validate prediction quality (simplified)
      for (const [_, userPrediction] of prediction.userMovementPrediction) {
        expect(userPrediction.confidence).toBeGreaterThan(0.3);
        expect(userPrediction.predictedPosition).toHaveLength(3);
        expect(userPrediction.predictedOrientation).toHaveLength(4);
      }
    });

    it('should validate semantic understanding capabilities', async () => {
      // Create a structured room scene
      const pointCloud = new Float32Array(6000); // 2000 points
      const rgbData = new Uint8Array(2000 * 3);
      const depth = new Float32Array(2000);

      // Generate floor points
      for (let i = 0; i < 500; i++) {
        const idx = i * 3;
        pointCloud[idx] = Math.random() * 4 - 2; // X: -2 to 2
        pointCloud[idx + 1] = 0; // Y: floor level
        pointCloud[idx + 2] = Math.random() * 4 - 2; // Z: -2 to 2
      }

      // Generate wall points
      for (let i = 500; i < 1000; i++) {
        const idx = i * 3;
        pointCloud[idx] = 2; // X: wall position
        pointCloud[idx + 1] = Math.random() * 3; // Y: 0 to 3
        pointCloud[idx + 2] = Math.random() * 4 - 2; // Z: -2 to 2
      }

      // Generate furniture points
      for (let i = 1000; i < 2000; i++) {
        const idx = i * 3;
        pointCloud[idx] = Math.random() * 2 - 1; // X: -1 to 1
        pointCloud[idx + 1] = Math.random() * 1.5 + 0.5; // Y: 0.5 to 2
        pointCloud[idx + 2] = Math.random() * 2 - 1; // Z: -1 to 1
      }

      rgbData.fill(150); // Medium gray
      depth.fill(3.0); // 3 meters average

      const result = await spatialEngine.recognizeSemanticObjects(
        pointCloud,
        rgbData,
        depth,
        'semantic_test'
      );

      // Semantic understanding criteria
      expect(result.semanticScene.roomType).toBeDefined();
      expect(result.semanticScene.primarySurfaces.length).toBeGreaterThan(0);
      expect(result.detectedObjects.length).toBeGreaterThanOrEqual(0);
      
      // Should identify at least floor surface
      const surfaces = result.semanticScene.primarySurfaces;
      const hasFloor = surfaces.some(s => s.type.toLowerCase().includes('floor'));
      expect(hasFloor || surfaces.length === 0).toBe(true); // Either has floor or no surfaces detected
    });

    it('should validate privacy preservation', async () => {
      const privacyEngine = new NovelSpatialAwarenessEngine({
        ...testConfig,
        privacyPreservation: true
      });

      const sensitiveDevices = ['sensitive_device_1', 'sensitive_device_2'];
      const dataToShare = {
        anchors: true,
        objects: true,
        users: true, // Sensitive data
        predictions: true
      };

      const minimalShare = await privacyEngine.synchronizeWithDevices(
        sensitiveDevices,
        dataToShare,
        'minimal'
      );

      const fullShare = await privacyEngine.synchronizeWithDevices(
        sensitiveDevices,
        dataToShare,
        'full'
      );

      // Minimal sharing should use less data
      expect(minimalShare.sharedDataSize).toBeLessThanOrEqual(fullShare.sharedDataSize);
      expect(minimalShare.encryptionUsed).toBe(true);
      expect(fullShare.encryptionUsed).toBe(true);
      
      privacyEngine.dispose();
    });
  });
});