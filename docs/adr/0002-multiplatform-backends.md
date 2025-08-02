# ADR-0002: Multi-platform Rendering Backend Strategy

**Status**: Accepted
**Date**: 2025-08-02
**Authors**: Terragon Labs
**Reviewers**: Platform Team

## Context

The nerf-edge-kit must support multiple platforms with different graphics APIs and capabilities:
- iOS/Vision Pro: Metal 3.0+ with Apple Neural Engine
- Web browsers: WebGPU with fallback to WebGL
- Future platforms: Android/OpenXR, native desktop

Each platform has unique optimization opportunities and constraints that need to be leveraged for optimal performance.

## Decision

Implement a multi-backend architecture with:

1. **Unified Rendering Interface**: Abstract rendering API that works across all platforms
2. **Platform-specific Optimizations**: Native implementations leveraging each platform's strengths
3. **Backend Selection**: Runtime detection and selection of optimal backend
4. **Graceful Degradation**: Fallback mechanisms for unsupported features

### Backend Implementations:

#### Metal Backend (iOS/macOS)
- Direct Metal API integration
- Apple Neural Engine utilization
- ARKit/RealityKit integration
- Optimized for spatial computing

#### WebGPU Backend (Web)
- Modern web graphics API
- Compute shader support
- Cross-browser compatibility
- Progressive enhancement

#### WebGL Fallback (Web)
- Legacy browser support
- Limited compute capabilities
- Reduced feature set
- Compatibility-focused

## Consequences

### Positive
- Optimal performance on each platform
- Future-proof architecture for new platforms
- Unified developer experience
- Leverages platform-specific optimizations
- Graceful degradation on older hardware

### Negative
- Increased implementation complexity
- Multiple codebases to maintain
- Platform-specific testing requirements
- Potential feature parity challenges

### Neutral
- Requires platform-specific expertise
- Different optimization strategies per platform
- Varying capabilities across backends

## Implementation

1. **Core Abstractions**: Define unified rendering interfaces
2. **Backend Factory**: Runtime backend selection and initialization
3. **Platform Detection**: Capability detection and backend selection
4. **Feature Flags**: Platform-specific feature enablement
5. **Testing Strategy**: Platform-specific test suites and validation

### File Structure:
```
src/
├── backends/
│   ├── metal/          # iOS/macOS Metal implementation
│   ├── webgpu/         # Modern web implementation  
│   ├── webgl/          # Legacy web fallback
│   └── interface.ts    # Unified backend interface
├── platform/           # Platform detection and capabilities
└── renderer/           # High-level rendering orchestration
```

## Related Decisions

- [ADR-0001: Real-time NeRF Rendering Architecture](0001-realtime-nerf-architecture.md)
- [ADR-0003: Foveated Rendering Implementation](0003-foveated-rendering.md)