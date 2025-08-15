/**
 * Research Components Export Index
 * 
 * Centralized exports for all breakthrough research implementations
 */

// Advanced NeRF Optimization
export { 
  AdvancedNerfOptimizer,
  type OptimizationConfig,
  type OptimizationResult,
  type FrameCoherenceData
} from './AdvancedNerfOptimizer';

// Quantum-Inspired Neural Acceleration
export {
  QuantumNeuralAccelerator,
  type QuantumState,
  type QuantumAccelerationConfig,
  type QuantumAccelerationResult
} from './QuantumNeuralAccelerator';

// Multi-Device Spatial Synchronization
export {
  SpatialSyncProtocol,
  type SpatialAnchor,
  type DeviceState,
  type SyncMessage,
  type CollaborationEvent,
  type NetworkOptimization
} from './SpatialSyncProtocol';

// Next-Generation Adaptive Foveated Rendering
export {
  AdaptiveFoveatedRenderer,
  type EyeCharacteristics,
  type CognitiveState,
  type SceneAnalysis,
  type GazePrediction,
  type FoveationLevels
} from './AdaptiveFoveatedRenderer';

// Adaptive Neural Compression
export {
  AdaptiveNeuralCompressor,
  type CompressionProfile,
  type NetworkConditions,
  type DeviceCapabilities,
  type CompressionResult,
  type DecompressionResult
} from './AdaptiveNeuralCompressor';

// Research Integration Hub
export {
  ResearchIntegrationHub,
  type ResearchExperiment,
  type ExperimentResult,
  type PerformanceProfile,
  type ResearchMetrics
} from './ResearchIntegrationHub';

// Demo System - Examples excluded from TypeScript compilation
// export { ResearchIntegrationDemo } from '../../examples/research-integration-demo';

// Version information
export const RESEARCH_VERSION = '1.0.0';
export const RESEARCH_BUILD_DATE = '2025-08-07';
export const RESEARCH_COMPONENTS = [
  'AdvancedNerfOptimizer',
  'QuantumNeuralAccelerator', 
  'SpatialSyncProtocol',
  'AdaptiveFoveatedRenderer',
  'AdaptiveNeuralCompressor',
  'ResearchIntegrationHub'
] as const;