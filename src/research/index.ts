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

// Hyper-Dimensional NeRF Engine - Revolutionary multi-dimensional rendering
export {
  HyperDimensionalNerfEngine,
  type HyperDimension,
  type HyperSpace,
  type HyperSample,
  type NeuralManifold,
  type HyperRenderingConfig
} from './HyperDimensionalNerfEngine';

// Enhanced Temporal NeRF Prediction - Next-generation predictive rendering
export {
  TemporalNerfPrediction,
  type TemporalState,
  type PredictionResult,
  type NeuralTrajectoryModel,
  type TrajectoryPattern
} from './TemporalNerfPrediction';

// Robust Hyper-Dimensional System - Enterprise-grade error handling and validation
export {
  RobustHyperDimensionalSystem,
  type SystemHealthMetrics,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ErrorRecoveryPlan,
  type SystemGuards
} from './RobustHyperDimensionalSystem';

// Quantum Performance Optimizer - Revolutionary performance enhancement system
export {
  QuantumPerformanceOptimizer,
  type QuantumPerformanceConfig,
  type PerformanceMetrics,
  type CacheEntry,
  type OptimizationStrategy,
  type OptimizationContext,
  type OptimizationResult,
  type ResourceInfo,
  type PredictiveTask
} from './QuantumPerformanceOptimizer';

// Breakthrough Neural Codec Engine - Revolutionary compression and transmission
export {
  BreakthroughNeuralCodecEngine,
  type PerceptualImportanceMap,
  type QuantumEncodingState,
  type NeuralCodecConfig,
  type CompressionResult,
  type DecompressionResult
} from './BreakthroughNeuralCodecEngine';

// Novel Spatial Awareness Engine - Revolutionary multi-user spatial computing
export {
  NovelSpatialAwarenessEngine,
  type SpatialAnchor,
  type SemanticObject,
  type SpatialUser,
  type PredictiveSpatialModel,
  type SpatialAwarenessConfig,
  type SpatialSyncMessage
} from './NovelSpatialAwarenessEngine';

// Version information
export const RESEARCH_VERSION = '4.0.0';
export const RESEARCH_BUILD_DATE = '2025-08-23';
export const RESEARCH_COMPONENTS = [
  'AdvancedNerfOptimizer',
  'QuantumNeuralAccelerator', 
  'SpatialSyncProtocol',
  'AdaptiveFoveatedRenderer',
  'AdaptiveNeuralCompressor',
  'ResearchIntegrationHub',
  'HyperDimensionalNerfEngine',
  'TemporalNerfPrediction',
  'RobustHyperDimensionalSystem',
  'QuantumPerformanceOptimizer',
  'BreakthroughNeuralCodecEngine',
  'NovelSpatialAwarenessEngine'
] as const;