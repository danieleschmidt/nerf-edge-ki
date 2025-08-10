/**
 * Comprehensive validation system for NeRF SDK inputs and states
 */

export interface ValidationRule<T> {
  name: string;
  validate: (value: T) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  code?: string;
  suggestions?: string[];
}

export interface ValidationContext {
  component: string;
  operation: string;
  timestamp: number;
}

export class ValidationError extends Error {
  public readonly validationResult: ValidationResult;
  public readonly context: ValidationContext;

  constructor(result: ValidationResult, context: ValidationContext) {
    super(result.message || 'Validation failed');
    this.name = 'ValidationError';
    this.validationResult = result;
    this.context = context;
  }
}

export class ComprehensiveValidator {
  private rules: Map<string, ValidationRule<any>[]> = new Map();
  private validationHistory: Array<{ context: ValidationContext; results: ValidationResult[] }> = [];

  constructor() {
    this.setupDefaultRules();
  }

  /**
   * Validate NeRF configuration
   */
  validateNerfConfig(config: any, context: ValidationContext): ValidationResult[] {
    return this.runValidation('nerf-config', config, context);
  }

  /**
   * Validate render options
   */
  validateRenderOptions(options: any, context: ValidationContext): ValidationResult[] {
    return this.runValidation('render-options', options, context);
  }

  /**
   * Validate model data
   */
  validateModelData(modelData: any, context: ValidationContext): ValidationResult[] {
    return this.runValidation('model-data', modelData, context);
  }

  /**
   * Validate WebGPU state
   */
  validateWebGPUState(device: GPUDevice | null, context: ValidationContext): ValidationResult[] {
    return this.runValidation('webgpu-state', device, context);
  }

  /**
   * Validate memory usage
   */
  validateMemoryUsage(memoryInfo: any, context: ValidationContext): ValidationResult[] {
    return this.runValidation('memory-usage', memoryInfo, context);
  }

  /**
   * Validate streaming parameters
   */
  validateStreamingParams(params: any, context: ValidationContext): ValidationResult[] {
    return this.runValidation('streaming-params', params, context);
  }

  /**
   * Run validation for a specific type
   */
  private runValidation(type: string, value: any, context: ValidationContext): ValidationResult[] {
    const rules = this.rules.get(type) || [];
    const results: ValidationResult[] = [];

    for (const rule of rules) {
      try {
        const result = rule.validate(value);
        if (!result.valid || rule.severity !== 'error') {
          results.push(result);
        }
      } catch (error) {
        results.push({
          valid: false,
          message: `Validation rule '${rule.name}' threw an error: ${error.message}`,
          code: 'VALIDATION_RULE_ERROR'
        });
      }
    }

    // Store validation history
    this.validationHistory.push({ context, results });
    this.trimValidationHistory();

    return results;
  }

  /**
   * Setup default validation rules
   */
  private setupDefaultRules(): void {
    // NeRF Configuration Rules
    this.addRule('nerf-config', {
      name: 'target-fps-range',
      validate: (config) => {
        if (!config.targetFPS || config.targetFPS < 1 || config.targetFPS > 120) {
          return {
            valid: false,
            message: 'Target FPS must be between 1 and 120',
            code: 'INVALID_TARGET_FPS',
            suggestions: ['Use 60 FPS for most applications', 'Use 90 FPS for VR headsets']
          };
        }
        return { valid: true };
      },
      severity: 'error'
    });

    this.addRule('nerf-config', {
      name: 'resolution-limits',
      validate: (config) => {
        const [width, height] = config.maxResolution || [0, 0];
        if (width > 4096 || height > 4096) {
          return {
            valid: false,
            message: 'Maximum resolution exceeds 4K limit',
            code: 'RESOLUTION_TOO_HIGH',
            suggestions: ['Consider using 1920x1080 for better performance']
          };
        }
        if (width < 256 || height < 256) {
          return {
            valid: false,
            message: 'Resolution too low for meaningful rendering',
            code: 'RESOLUTION_TOO_LOW'
          };
        }
        return { valid: true };
      },
      severity: 'error'
    });

    this.addRule('nerf-config', {
      name: 'memory-limit-check',
      validate: (config) => {
        if (config.memoryLimit && config.memoryLimit > 4096) {
          return {
            valid: false,
            message: 'Memory limit exceeds 4GB, may cause issues on some devices',
            code: 'MEMORY_LIMIT_HIGH',
            suggestions: ['Consider reducing memory limit for broader device support']
          };
        }
        return { valid: true };
      },
      severity: 'warning'
    });

    // Render Options Rules
    this.addRule('render-options', {
      name: 'camera-position-bounds',
      validate: (options) => {
        const pos = options.cameraPosition;
        if (!Array.isArray(pos) || pos.length !== 3) {
          return {
            valid: false,
            message: 'Camera position must be a 3-element array',
            code: 'INVALID_CAMERA_POSITION'
          };
        }
        
        const maxDistance = 1000;
        const distance = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
        if (distance > maxDistance) {
          return {
            valid: false,
            message: `Camera too far from origin (${distance.toFixed(1)} > ${maxDistance})`,
            code: 'CAMERA_TOO_FAR',
            suggestions: ['Move camera closer to scene bounds']
          };
        }
        return { valid: true };
      },
      severity: 'error'
    });

    this.addRule('render-options', {
      name: 'fov-range',
      validate: (options) => {
        const fov = options.fieldOfView;
        if (fov < 10 || fov > 120) {
          return {
            valid: false,
            message: 'Field of view should be between 10 and 120 degrees',
            code: 'INVALID_FOV',
            suggestions: ['Use 60-90 degrees for realistic perspective']
          };
        }
        return { valid: true };
      },
      severity: 'warning'
    });

    // Model Data Rules
    this.addRule('model-data', {
      name: 'weights-size-check',
      validate: (modelData) => {
        if (!modelData.weights) {
          return {
            valid: false,
            message: 'Model weights are required',
            code: 'MISSING_WEIGHTS'
          };
        }
        
        const sizeGB = modelData.weights.byteLength / (1024 * 1024 * 1024);
        if (sizeGB > 2) {
          return {
            valid: false,
            message: `Model size (${sizeGB.toFixed(2)}GB) may be too large for real-time rendering`,
            code: 'MODEL_TOO_LARGE',
            suggestions: ['Consider model quantization or compression']
          };
        }
        return { valid: true };
      },
      severity: 'warning'
    });

    this.addRule('model-data', {
      name: 'metadata-completeness',
      validate: (modelData) => {
        const required = ['version', 'resolution', 'bounds', 'layers', 'hiddenSize'];
        const missing = required.filter(field => !modelData.metadata?.[field]);
        
        if (missing.length > 0) {
          return {
            valid: false,
            message: `Missing required metadata fields: ${missing.join(', ')}`,
            code: 'INCOMPLETE_METADATA',
            suggestions: ['Ensure model was exported with complete metadata']
          };
        }
        return { valid: true };
      },
      severity: 'error'
    });

    // WebGPU State Rules
    this.addRule('webgpu-state', {
      name: 'device-availability',
      validate: (device) => {
        if (!device) {
          return {
            valid: false,
            message: 'WebGPU device not available',
            code: 'NO_WEBGPU_DEVICE',
            suggestions: ['Check browser WebGPU support', 'Try updating graphics drivers']
          };
        }
        return { valid: true };
      },
      severity: 'error'
    });

    // Memory Usage Rules
    this.addRule('memory-usage', {
      name: 'memory-pressure-check',
      validate: (memoryInfo) => {
        const usagePercent = memoryInfo.used / memoryInfo.total;
        if (usagePercent > 0.9) {
          return {
            valid: false,
            message: `High memory usage: ${(usagePercent * 100).toFixed(1)}%`,
            code: 'HIGH_MEMORY_USAGE',
            suggestions: ['Free unused resources', 'Reduce cache sizes']
          };
        }
        if (usagePercent > 0.8) {
          return {
            valid: true,
            message: `Memory usage approaching limit: ${(usagePercent * 100).toFixed(1)}%`,
            code: 'MEMORY_WARNING'
          };
        }
        return { valid: true };
      },
      severity: 'warning'
    });

    // Streaming Parameters Rules
    this.addRule('streaming-params', {
      name: 'cache-size-validation',
      validate: (params) => {
        if (params.cacheSize < 64) {
          return {
            valid: false,
            message: 'Cache size too small for effective streaming',
            code: 'CACHE_SIZE_TOO_SMALL',
            suggestions: ['Use at least 64MB cache size']
          };
        }
        if (params.cacheSize > 2048) {
          return {
            valid: false,
            message: 'Cache size may cause memory pressure',
            code: 'CACHE_SIZE_TOO_LARGE',
            suggestions: ['Consider reducing cache size for memory-constrained devices']
          };
        }
        return { valid: true };
      },
      severity: 'warning'
    });

    this.addRule('streaming-params', {
      name: 'preload-distance-validation',
      validate: (params) => {
        if (params.preloadDistance > 100) {
          return {
            valid: false,
            message: 'Preload distance too large, may impact performance',
            code: 'PRELOAD_DISTANCE_TOO_LARGE',
            suggestions: ['Reduce preload distance for better performance']
          };
        }
        return { valid: true };
      },
      severity: 'warning'
    });
  }

  /**
   * Add a custom validation rule
   */
  addRule<T>(type: string, rule: ValidationRule<T>): void {
    if (!this.rules.has(type)) {
      this.rules.set(type, []);
    }
    this.rules.get(type)!.push(rule);
  }

  /**
   * Remove a validation rule
   */
  removeRule(type: string, ruleName: string): boolean {
    const rules = this.rules.get(type);
    if (!rules) return false;

    const index = rules.findIndex(rule => rule.name === ruleName);
    if (index >= 0) {
      rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if all validation results are valid
   */
  allValid(results: ValidationResult[]): boolean {
    return results.every(result => result.valid);
  }

  /**
   * Get only error results
   */
  getErrors(results: ValidationResult[]): ValidationResult[] {
    return results.filter(result => !result.valid);
  }

  /**
   * Get only warning results
   */
  getWarnings(results: ValidationResult[]): ValidationResult[] {
    return results.filter(result => result.valid && result.message);
  }

  /**
   * Format validation results for display
   */
  formatResults(results: ValidationResult[]): string {
    if (results.length === 0) {
      return 'All validations passed';
    }

    const errors = this.getErrors(results);
    const warnings = this.getWarnings(results);

    const parts: string[] = [];

    if (errors.length > 0) {
      parts.push(`Errors (${errors.length}):`);
      errors.forEach(error => {
        parts.push(`  - ${error.message} [${error.code}]`);
        if (error.suggestions) {
          error.suggestions.forEach(suggestion => {
            parts.push(`    → ${suggestion}`);
          });
        }
      });
    }

    if (warnings.length > 0) {
      parts.push(`Warnings (${warnings.length}):`);
      warnings.forEach(warning => {
        parts.push(`  - ${warning.message} [${warning.code}]`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Validate and throw on errors
   */
  validateAndThrow<T>(type: string, value: T, context: ValidationContext): void {
    const results = this.runValidation(type, value, context);
    const errors = this.getErrors(results);

    if (errors.length > 0) {
      throw new ValidationError(errors[0], context);
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    errorRate: number;
    warningRate: number;
    commonErrors: Array<{ code: string; count: number }>;
  } {
    let totalValidations = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    const errorCounts: Record<string, number> = {};

    for (const entry of this.validationHistory) {
      totalValidations += entry.results.length;
      
      for (const result of entry.results) {
        if (!result.valid) {
          totalErrors++;
          if (result.code) {
            errorCounts[result.code] = (errorCounts[result.code] || 0) + 1;
          }
        } else if (result.message) {
          totalWarnings++;
        }
      }
    }

    const commonErrors = Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalValidations,
      errorRate: totalValidations > 0 ? totalErrors / totalValidations : 0,
      warningRate: totalValidations > 0 ? totalWarnings / totalValidations : 0,
      commonErrors
    };
  }

  /**
   * Trim validation history to prevent memory leaks
   */
  private trimValidationHistory(): void {
    if (this.validationHistory.length > 1000) {
      this.validationHistory = this.validationHistory.slice(-500);
    }
  }

  /**
   * Clear validation history
   */
  clearHistory(): void {
    this.validationHistory = [];
  }

  /**
   * Get recent validation failures
   */
  getRecentFailures(count = 10): Array<{ context: ValidationContext; errors: ValidationResult[] }> {
    return this.validationHistory
      .filter(entry => entry.results.some(result => !result.valid))
      .slice(-count)
      .map(entry => ({
        context: entry.context,
        errors: this.getErrors(entry.results)
      }));
  }
}