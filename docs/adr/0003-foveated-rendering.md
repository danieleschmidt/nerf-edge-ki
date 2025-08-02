# ADR-0003: Foveated Rendering Implementation

**Status**: Accepted
**Date**: 2025-08-02
**Authors**: Terragon Labs
**Reviewers**: Vision Team

## Context

Spatial computing devices like Apple Vision Pro require extremely high frame rates (90+ FPS) with limited power budgets. Traditional uniform rendering approaches cannot meet these requirements while maintaining visual quality.

Foveated rendering leverages the human visual system's properties:
- High acuity in the foveal region (center of vision)
- Reduced acuity in peripheral vision
- Eye-tracking data available on modern XR devices

## Decision

Implement a multi-level foveated rendering system with:

1. **Dynamic Foveation Maps**: Real-time generation based on eye-tracking
2. **Multi-resolution Sampling**: 3-4 quality levels from fovea to periphery
3. **Temporal Coherence**: Smooth transitions as gaze direction changes
4. **Adaptive Parameters**: Scene complexity-based foveation adjustment

### Foveation Levels:
- **Foveal (0-2°)**: Full quality, all rays, highest sample count
- **Para-foveal (2-8°)**: 75% quality, reduced samples, maintained detail
- **Peripheral (8-30°)**: 50% quality, aggressive LOD, motion-optimized
- **Far Peripheral (30+°)**: 25% quality, minimal samples, basic rendering

### Implementation Strategy:
1. **Gaze Prediction**: Anticipate eye movement for reduced latency
2. **Smooth Blending**: Gradient transitions between quality levels
3. **Scene Analysis**: Adaptive foveation based on content complexity
4. **Performance Scaling**: Dynamic adjustment based on frame rate

## Consequences

### Positive
- 30-50% performance improvement with minimal quality loss
- Enables target frame rates on resource-constrained devices
- Natural integration with spatial computing workflows
- Significant power savings (up to 40% reduction)
- Imperceptible quality reduction in most scenarios

### Negative
- Requires accurate eye-tracking data
- Complexity in transition zone rendering
- Potential artifacts during rapid eye movements
- Additional memory for foveation maps
- Calibration requirements per user

### Neutral
- Eye-tracking latency affects effectiveness
- Individual visual acuity variations
- Scene-dependent optimization effectiveness
- Platform-specific eye-tracking APIs

## Implementation

### Core Components:

1. **Eye Tracking Interface**: Unified API across platforms
2. **Foveation Map Generator**: Real-time quality map creation
3. **Adaptive Ray Tracer**: Variable quality ray generation
4. **Temporal Blending**: Smooth transitions between frames
5. **Performance Monitor**: Real-time adjustment system

### Platform Integration:

#### Vision Pro
- ARKit eye-tracking integration
- Metal compute shaders for foveation maps
- 90 FPS target with 4K per eye

#### iPhone/iPad
- Face-tracking based approximation
- Reduced foveation aggressiveness
- 60 FPS target with adaptive resolution

#### Web
- Mouse/touch-based focus approximation
- Progressive enhancement approach
- Variable frame rate targets

### Configuration:
```typescript
interface FoveationConfig {
  levels: number;           // Number of quality levels (3-4)
  centerRadius: number;     // Foveal region size (degrees)
  blendWidth: number;       // Transition zone width
  temporalSmoothing: number; // Frame-to-frame smoothing
  adaptiveThreshold: number; // Performance adjustment trigger
}
```

## Related Decisions

- [ADR-0001: Real-time NeRF Rendering Architecture](0001-realtime-nerf-architecture.md)
- [ADR-0002: Multi-platform Rendering Backend Strategy](0002-multiplatform-backends.md)