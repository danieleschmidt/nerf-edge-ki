# NeRF Edge Kit API Reference

## Overview

The NeRF Edge Kit provides a unified SDK for real-time Neural Radiance Field rendering across iOS/Vision Pro, Web/WebGPU, and Python/PyTorch platforms.

## Installation

### Web/TypeScript
```bash
npm install nerf-edge-kit
```

### iOS/Swift
```swift
import NerfEdgeKit
```

### Python
```bash
pip install nerf-edge-kit
```

## Core Classes

### NerfRenderer

Main rendering engine for NeRF models.

```typescript
import { NerfRenderer } from 'nerf-edge-kit';

const renderer = new NerfRenderer({
  targetFPS: 90,
  maxResolution: [3840, 2160],
  foveatedRendering: true
});
```

### NerfScene

Scene management and model loading.

```typescript
import { NerfScene } from 'nerf-edge-kit';

const scene = new NerfScene();
await scene.loadModel('/path/to/model.nerf');
```

### NerfModel

Individual NeRF model representation.

## Platform-Specific APIs

### Vision Pro Integration
- ARKit integration for spatial tracking
- Metal performance shaders for optimized rendering
- Foveated rendering support

### Web/WebGPU Features
- Progressive loading for large models
- WebXR integration
- Fallback to WebGL 2.0

### Python/Training
- PyTorch integration for model training
- CUDA acceleration support
- Model export utilities

## Performance Targets

| Platform | Resolution | FPS | Latency | Power |
|----------|-----------|-----|---------|--------|
| Vision Pro | 4K/eye | 90 | 4.2ms | 8W |
| iPhone 15 Pro | 1080p | 60 | 4.8ms | 3W |
| Web/Chrome | 1440p | 60 | 6.5ms | Variable |

## Examples

See the `examples/` directory for complete implementations.