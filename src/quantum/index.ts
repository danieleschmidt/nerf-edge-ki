/**
 * Quantum-Inspired Task Planning System for NeRF Edge Kit
 * Entry point for quantum computing principles applied to task scheduling
 */

import { QuantumTaskPlanner } from './QuantumTaskPlanner';
import { QuantumNerfScheduler } from './QuantumNerfScheduler';

export { QuantumTaskPlanner } from './QuantumTaskPlanner';
export { QuantumNerfScheduler } from './QuantumNerfScheduler';
export { QuantumErrorHandler } from './QuantumErrorHandler';
export { QuantumValidator } from './QuantumValidator';
export { QuantumMonitor } from './QuantumMonitor';
export { QuantumScaler } from './QuantumScaler';
export { QuantumCache } from './QuantumCache';
export { default as QuantumI18n } from './i18n/QuantumI18n';
export { default as QuantumCompliance } from './compliance/QuantumCompliance';

export type {
  QuantumTask,
  ResourceRequirements,
  QuantumState,
  Complex,
  ScheduleResult
} from './QuantumTaskPlanner';

export type {
  NerfRenderTask,
  NerfScheduleConfig
} from './QuantumNerfScheduler';

// Quantum constants and utilities
export const QUANTUM_CONSTANTS = {
  PLANCK_CONSTANT: 6.62607015e-34,
  DECOHERENCE_THRESHOLD: 0.1,
  MAX_SUPERPOSITION: 1.0,
  MIN_COHERENCE: 0.01,
  ENTANGLEMENT_STRENGTH: 0.8
} as const;

export const QUANTUM_DEFAULTS = {
  TEMPERATURE: 0.1,
  ANNEALING_TIME: 1000,
  MAX_ITERATIONS: 1000,
  COOLING_RATE: 0.95,
  COHERENCE_DECAY: 0.99
} as const;

/**
 * Utility functions for quantum state manipulation
 */
export class QuantumUtils {
  /**
   * Calculate quantum state probability amplitude
   */
  static calculateAmplitude(real: number, imaginary: number): number {
    return Math.sqrt(real * real + imaginary * imaginary);
  }

  /**
   * Normalize quantum state amplitude
   */
  static normalizeAmplitude(real: number, imaginary: number): { real: number; imaginary: number } {
    const magnitude = this.calculateAmplitude(real, imaginary);
    
    if (magnitude === 0) {
      return { real: 1, imaginary: 0 };
    }
    
    return {
      real: real / magnitude,
      imaginary: imaginary / magnitude
    };
  }

  /**
   * Calculate quantum superposition value
   */
  static calculateSuperposition(amplitude: { real: number; imaginary: number }): number {
    const magnitude = this.calculateAmplitude(amplitude.real, amplitude.imaginary);
    // Superposition is higher when imaginary component is significant
    return Math.min(1, Math.abs(amplitude.imaginary) + (1 - magnitude) * 0.5);
  }

  /**
   * Apply quantum decoherence over time
   */
  static applyDecoherence(coherence: number, timeElapsed: number, environment: 'isolated' | 'noisy' = 'noisy'): number {
    const decayRate = environment === 'isolated' ? 0.001 : 0.01;
    return Math.max(QUANTUM_CONSTANTS.MIN_COHERENCE, coherence * Math.exp(-decayRate * timeElapsed));
  }

  /**
   * Calculate quantum entanglement strength between two states
   */
  static calculateEntanglementStrength(
    state1: { amplitude: { real: number; imaginary: number }; coherence: number },
    state2: { amplitude: { real: number; imaginary: number }; coherence: number }
  ): number {
    const coherenceProduct = state1.coherence * state2.coherence;
    const amplitudeCorrelation = 
      state1.amplitude.real * state2.amplitude.real + 
      state1.amplitude.imaginary * state2.amplitude.imaginary;
    
    return coherenceProduct * Math.abs(amplitudeCorrelation);
  }

  /**
   * Generate quantum random number using quantum-inspired algorithm
   */
  static quantumRandom(amplitude: { real: number; imaginary: number }): number {
    const phase = Math.atan2(amplitude.imaginary, amplitude.real);
    const magnitude = this.calculateAmplitude(amplitude.real, amplitude.imaginary);
    
    // Use quantum phase to influence randomness
    const quantumSeed = (Math.sin(phase) + 1) / 2;
    return (Math.random() + quantumSeed * magnitude) % 1;
  }

  /**
   * Apply quantum gate operation to state
   */
  static applyQuantumGate(
    state: { real: number; imaginary: number },
    gate: 'hadamard' | 'pauli-x' | 'pauli-z' | 'phase'
  ): { real: number; imaginary: number } {
    switch (gate) {
      case 'hadamard':
        // Hadamard gate creates superposition
        return {
          real: (state.real + state.imaginary) / Math.sqrt(2),
          imaginary: (state.real - state.imaginary) / Math.sqrt(2)
        };
      
      case 'pauli-x':
        // Bit flip
        return { real: state.imaginary, imaginary: state.real };
      
      case 'pauli-z':
        // Phase flip
        return { real: state.real, imaginary: -state.imaginary };
      
      case 'phase':
        // Phase shift
        return { real: state.real, imaginary: state.imaginary * Math.E };
      
      default:
        return state;
    }
  }

  /**
   * Create quantum superposition of multiple states
   */
  static createSuperposition(states: { real: number; imaginary: number; weight: number }[]): { real: number; imaginary: number } {
    const totalWeight = states.reduce((sum, state) => sum + state.weight, 0);
    
    let realSum = 0;
    let imagSum = 0;
    
    for (const state of states) {
      const normalizedWeight = state.weight / totalWeight;
      realSum += state.real * normalizedWeight;
      imagSum += state.imaginary * normalizedWeight;
    }
    
    return this.normalizeAmplitude(realSum, imagSum);
  }

  /**
   * Measure quantum state (causes collapse)
   */
  static measureState(
    state: { real: number; imaginary: number },
    basis: 'computational' | 'hadamard' = 'computational'
  ): { measured: 0 | 1; collapsed: { real: number; imaginary: number } } {
    const probability = state.real * state.real;
    const measurement = this.quantumRandom(state) < probability ? 0 : 1;
    
    // State collapses based on measurement
    const collapsed = measurement === 0 
      ? { real: 1, imaginary: 0 }
      : { real: 0, imaginary: 1 };
    
    return { measured: measurement, collapsed };
  }
}

/**
 * Quantum-inspired performance optimizer
 */
export class QuantumPerformanceOptimizer {
  private quantumStates: Map<string, { real: number; imaginary: number; coherence: number }> = new Map();
  
  /**
   * Initialize quantum state for a performance metric
   */
  initializeMetric(metricName: string, initialValue: number): void {
    const amplitude = QuantumUtils.normalizeAmplitude(initialValue, 0);
    this.quantumStates.set(metricName, {
      ...amplitude,
      coherence: 0.9
    });
  }

  /**
   * Update metric using quantum superposition
   */
  updateMetric(metricName: string, newValue: number, confidence: number = 0.8): void {
    const currentState = this.quantumStates.get(metricName);
    if (!currentState) {
      this.initializeMetric(metricName, newValue);
      return;
    }

    // Create superposition of current and new state
    const newAmplitude = QuantumUtils.normalizeAmplitude(newValue, 0);
    const superposition = QuantumUtils.createSuperposition([
      { ...currentState, weight: 1 - confidence },
      { ...newAmplitude, weight: confidence }
    ]);

    // Update coherence based on measurement confidence
    const newCoherence = currentState.coherence * confidence;

    this.quantumStates.set(metricName, {
      ...superposition,
      coherence: newCoherence
    });
  }

  /**
   * Get optimized value using quantum measurement
   */
  getOptimizedValue(metricName: string): number {
    const state = this.quantumStates.get(metricName);
    if (!state) return 0;

    // Use amplitude and coherence to calculate optimized value
    const amplitude = QuantumUtils.calculateAmplitude(state.real, state.imaginary);
    return amplitude * state.coherence;
  }

  /**
   * Create entanglement between related metrics
   */
  entangleMetrics(metric1: string, metric2: string): void {
    const state1 = this.quantumStates.get(metric1);
    const state2 = this.quantumStates.get(metric2);
    
    if (!state1 || !state2) return;

    // Create entangled state
    const entanglementStrength = QuantumUtils.calculateEntanglementStrength(
      { amplitude: state1, coherence: state1.coherence },
      { amplitude: state2, coherence: state2.coherence }
    );

    // Update both states with entanglement
    const entangledAmplitude1 = {
      real: state1.real * entanglementStrength + state2.real * (1 - entanglementStrength),
      imaginary: state1.imaginary * entanglementStrength + state2.imaginary * (1 - entanglementStrength)
    };

    const entangledAmplitude2 = {
      real: state2.real * entanglementStrength + state1.real * (1 - entanglementStrength),
      imaginary: state2.imaginary * entanglementStrength + state1.imaginary * (1 - entanglementStrength)
    };

    this.quantumStates.set(metric1, {
      ...QuantumUtils.normalizeAmplitude(entangledAmplitude1.real, entangledAmplitude1.imaginary),
      coherence: Math.min(state1.coherence, state2.coherence) * entanglementStrength
    });

    this.quantumStates.set(metric2, {
      ...QuantumUtils.normalizeAmplitude(entangledAmplitude2.real, entangledAmplitude2.imaginary),
      coherence: Math.min(state1.coherence, state2.coherence) * entanglementStrength
    });
  }

  /**
   * Apply decoherence to all metrics over time
   */
  applyDecoherence(timeElapsed: number): void {
    for (const [metricName, state] of this.quantumStates.entries()) {
      const newCoherence = QuantumUtils.applyDecoherence(state.coherence, timeElapsed);
      this.quantumStates.set(metricName, {
        ...state,
        coherence: newCoherence
      });
    }
  }

  /**
   * Get all quantum states for debugging
   */
  getQuantumStates(): Map<string, { real: number; imaginary: number; coherence: number }> {
    return new Map(this.quantumStates);
  }
}

export default {
  QuantumTaskPlanner,
  QuantumNerfScheduler,
  QuantumUtils,
  QuantumPerformanceOptimizer,
  QUANTUM_CONSTANTS,
  QUANTUM_DEFAULTS
};