/**
 * Spatial computing utilities
 */

import { SpatialTransform } from '../core/types';

export class SpatialUtils {
  static createTransform(
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number, number] = [0, 0, 0, 1],
    scale: [number, number, number] = [1, 1, 1]
  ): SpatialTransform {
    return { position, rotation, scale };
  }

  static multiplyTransforms(a: SpatialTransform, b: SpatialTransform): SpatialTransform {
    // Transform multiplication logic would go here
    return {
      position: [
        a.position[0] + b.position[0],
        a.position[1] + b.position[1], 
        a.position[2] + b.position[2]
      ],
      rotation: b.rotation, // Simplified
      scale: [
        a.scale[0] * b.scale[0],
        a.scale[1] * b.scale[1],
        a.scale[2] * b.scale[2]
      ]
    };
  }

  static matrixFromTransform(transform: SpatialTransform): Float32Array {
    // 4x4 transformation matrix creation
    const matrix = new Float32Array(16);
    // Simplified identity matrix for now
    matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
    // Apply transform (simplified)
    matrix[12] = transform.position[0];
    matrix[13] = transform.position[1];
    matrix[14] = transform.position[2];
    return matrix;
  }
}