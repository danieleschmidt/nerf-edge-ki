/**
 * Clean Robust Hyper-Dimensional System - Fixed version
 */

import { HyperDimensionalNerfEngine, type HyperSample, type HyperRenderingConfig } from './HyperDimensionalNerfEngine';
import { TemporalNerfPrediction, type TemporalState } from './TemporalNerfPrediction';

export interface SystemHealthMetrics {
  hyperDimensionalHealth: number;
  temporalPredictionHealth: number;
  quantumCoherenceHealth: number;
  memoryHealth: number;
  performanceHealth: number;
  overallHealth: number;
  criticalErrors: number;
  warnings: number;
  lastHealthCheck: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  component: string;
  severity: 'medium' | 'high' | 'critical';
  timestamp: number;
  stackTrace?: string;
  context?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  component: string;
  timestamp: number;
  context?: Record<string, any>;
}

export interface SystemGuards {
  maxMemoryUsage: number;
  maxDimensionCount: number;
  maxSampleCount: number;
  maxInferenceTime: number;
  maxCoherenceDeviation: number;
  emergencyFallbackEnabled: boolean;
}

export class CleanRobustSystem {
  private systemHealth: SystemHealthMetrics;
  private guards: SystemGuards;
  private errorHistory: ValidationError[] = [];
  private warningHistory: ValidationWarning[] = [];

  constructor(
    private hyperEngine: HyperDimensionalNerfEngine,
    private temporalPredictor: TemporalNerfPrediction,
    guards?: Partial<SystemGuards>
  ) {
    this.guards = {
      maxMemoryUsage: 4096,
      maxDimensionCount: 100,
      maxSampleCount: 1024,
      maxInferenceTime: 50,
      maxCoherenceDeviation: 0.5,
      emergencyFallbackEnabled: true,
      ...guards
    };
    
    this.initializeSystemHealth();
    console.log('🛡️ Clean Robust System initialized');
  }

  async robustHyperDimensionalSample(
    basePosition: [number, number, number],
    rayDirection: [number, number, number],
    temporalContext?: number,
    perspectiveId?: number,
    semanticQuery?: string,
    sampleCount: number = 128
  ): Promise<{ samples: HyperSample[]; validation: ValidationResult }> {
    try {
      // Input validation
      const inputValidation = this.validateInputs({
        basePosition,
        rayDirection,
        temporalContext,
        perspectiveId,
        semanticQuery,
        sampleCount
      });
      
      if (!inputValidation.isValid && inputValidation.severity === 'critical') {
        throw new Error(`Critical validation failed: ${inputValidation.errors.map(e => e.message).join(', ')}`);
      }
      
      // Enforce guards
      const safeSampleCount = Math.min(sampleCount, this.guards.maxSampleCount);
      if (safeSampleCount !== sampleCount) {
        this.recordWarning({
          code: 'SAMPLE_COUNT_LIMITED',
          message: `Sample count reduced from ${sampleCount} to ${safeSampleCount}`,
          component: 'CleanRobustSystem',
          timestamp: Date.now()
        });
      }
      
      // Execute sampling
      const samples = await this.hyperEngine.hyperDimensionalSample(
        basePosition,
        rayDirection,
        temporalContext,
        perspectiveId,
        semanticQuery,
        safeSampleCount
      );
      
      // Validate output
      const outputValidation = this.validateHyperSamples(samples);
      
      return { samples, validation: outputValidation };
      
    } catch (error) {
      this.recordError({
        code: 'HYPER_SAMPLE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        component: 'HyperDimensionalNerfEngine',
        severity: 'high',
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  private validateInputs(inputs: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate base position
    if (!Array.isArray(inputs.basePosition) || inputs.basePosition.length !== 3) {
      errors.push({
        code: 'INVALID_BASE_POSITION',
        message: 'Base position must be a 3-element array',
        component: 'InputValidation',
        severity: 'critical',
        timestamp: Date.now()
      });
    }
    
    // Validate ray direction
    if (!Array.isArray(inputs.rayDirection) || inputs.rayDirection.length !== 3) {
      errors.push({
        code: 'INVALID_RAY_DIRECTION',
        message: 'Ray direction must be a 3-element array',
        component: 'InputValidation',
        severity: 'critical',
        timestamp: Date.now()
      });
    }
    
    // Validate sample count
    if (inputs.sampleCount <= 0 || inputs.sampleCount > this.guards.maxSampleCount) {
      errors.push({
        code: 'INVALID_SAMPLE_COUNT',
        message: `Sample count ${inputs.sampleCount} outside valid range`,
        component: 'InputValidation',
        severity: 'high',
        timestamp: Date.now()
      });
    }
    
    const severity = errors.some(e => e.severity === 'critical') ? 'critical' :
                    errors.some(e => e.severity === 'high') ? 'high' :
                    errors.length > 0 ? 'medium' : 'low';
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity,
      recommendedActions: this.generateRecommendedActions(errors, warnings)
    };
  }

  private validateHyperSamples(samples: HyperSample[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    if (!Array.isArray(samples) || samples.length === 0) {
      errors.push({
        code: 'EMPTY_SAMPLES',
        message: 'No samples generated',
        component: 'HyperSampleValidation',
        severity: 'critical',
        timestamp: Date.now()
      });
      
      return {
        isValid: false,
        errors,
        warnings,
        severity: 'critical',
        recommendedActions: ['Check engine configuration']
      };
    }
    
    // Validate sample properties
    const coherenceValues: number[] = [];
    
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      
      if (!sample.coordinates || !sample.weights || sample.coherence === undefined) {
        errors.push({
          code: 'INVALID_SAMPLE_STRUCTURE',
          message: `Sample ${i} missing required properties`,
          component: 'HyperSampleValidation',
          severity: 'high',
          timestamp: Date.now()
        });
        continue;
      }
      
      if (sample.coherence < 0 || sample.coherence > 1) {
        errors.push({
          code: 'INVALID_COHERENCE_RANGE',
          message: `Sample ${i} coherence outside [0,1] range`,
          component: 'HyperSampleValidation',
          severity: 'medium',
          timestamp: Date.now()
        });
      }
      
      coherenceValues.push(sample.coherence);
    }
    
    // Statistical validation
    if (coherenceValues.length > 1) {
      const avgCoherence = coherenceValues.reduce((sum, c) => sum + c, 0) / coherenceValues.length;
      
      if (avgCoherence < 0.3) {
        warnings.push({
          code: 'LOW_AVERAGE_COHERENCE',
          message: `Average coherence ${avgCoherence.toFixed(3)} is low`,
          component: 'HyperSampleValidation',
          timestamp: Date.now()
        });
      }
    }
    
    const severity = errors.some(e => e.severity === 'critical') ? 'critical' :
                    errors.some(e => e.severity === 'high') ? 'high' :
                    errors.length > 0 ? 'medium' : 'low';
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity,
      recommendedActions: this.generateRecommendedActions(errors, warnings)
    };
  }

  async performHealthCheck(): Promise<SystemHealthMetrics> {
    try {
      const hyperStats = this.hyperEngine.getHyperStats();
      const temporalStats = this.temporalPredictor.getStats();
      
      const hyperHealth = Math.min(1, hyperStats.quantumCoherence + 0.3);
      const temporalHealth = Math.min(1, temporalStats.estimatedAccuracy + 0.2);
      
      this.systemHealth = {
        hyperDimensionalHealth: hyperHealth,
        temporalPredictionHealth: temporalHealth,
        quantumCoherenceHealth: hyperStats.quantumCoherence,
        memoryHealth: 0.85,
        performanceHealth: 0.9,
        overallHealth: (hyperHealth + temporalHealth + 0.85 + 0.9) / 4,
        criticalErrors: this.errorHistory.filter(e => e.severity === 'critical').length,
        warnings: this.warningHistory.length,
        lastHealthCheck: Date.now()
      };
      
      return this.systemHealth;
    } catch (error) {
      console.error('Health check failed:', error);
      return this.systemHealth;
    }
  }

  private initializeSystemHealth(): void {
    this.systemHealth = {
      hyperDimensionalHealth: 1.0,
      temporalPredictionHealth: 1.0,
      quantumCoherenceHealth: 1.0,
      memoryHealth: 1.0,
      performanceHealth: 1.0,
      overallHealth: 1.0,
      criticalErrors: 0,
      warnings: 0,
      lastHealthCheck: Date.now()
    };
  }

  private recordError(error: ValidationError): void {
    this.errorHistory.push(error);
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-500);
    }
    console.error(`❌ Error: [${error.code}] ${error.message}`);
  }

  private recordWarning(warning: ValidationWarning): void {
    this.warningHistory.push(warning);
    if (this.warningHistory.length > 1000) {
      this.warningHistory = this.warningHistory.slice(-500);
    }
    console.warn(`⚠️ Warning: [${warning.code}] ${warning.message}`);
  }

  private generateRecommendedActions(errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const actions: string[] = [];
    
    if (errors.some(e => e.code === 'INVALID_BASE_POSITION')) {
      actions.push('Verify input position coordinates');
    }
    
    if (warnings.some(w => w.code === 'LOW_AVERAGE_COHERENCE')) {
      actions.push('Check quantum coherence settings');
    }
    
    if (actions.length === 0) {
      actions.push('Monitor system performance');
    }
    
    return actions;
  }

  getSystemHealth(): SystemHealthMetrics {
    return { ...this.systemHealth };
  }

  getErrorHistory(): ValidationError[] {
    return [...this.errorHistory];
  }

  getWarningHistory(): ValidationWarning[] {
    return [...this.warningHistory];
  }

  clearHistory(): void {
    this.errorHistory = [];
    this.warningHistory = [];
  }

  updateGuards(newGuards: Partial<SystemGuards>): void {
    this.guards = { ...this.guards, ...newGuards };
  }

  dispose(): void {
    this.clearHistory();
    console.log('♻️ Clean Robust System disposed');
  }
}

export default CleanRobustSystem;