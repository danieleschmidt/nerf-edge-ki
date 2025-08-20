/**
 * Robust Input Validation System for NeRF Edge Kit
 * Provides comprehensive validation, sanitization, and type checking
 */

export interface ValidationRule {
  name: string;
  validate: (value: any) => boolean;
  errorMessage: string;
  sanitize?: (value: any) => any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedValue?: any;
  warnings?: string[];
}

export class RobustValidator {
  private static instance: RobustValidator;
  private rules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  static getInstance(): RobustValidator {
    if (!RobustValidator.instance) {
      RobustValidator.instance = new RobustValidator();
    }
    return RobustValidator.instance;
  }

  /**
   * Validate NerfConfig object
   */
  validateNerfConfig(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = { ...config };

    try {
      // Validate targetFPS
      if (config.targetFPS !== undefined) {
        if (!this.isValidFPS(config.targetFPS)) {
          errors.push('targetFPS must be a positive number between 1 and 240');
        } else if (config.targetFPS > 120) {
          warnings.push('targetFPS above 120 may cause performance issues');
        }
      }

      // Validate maxResolution
      if (config.maxResolution !== undefined) {
        if (!this.isValidResolution(config.maxResolution)) {
          errors.push('maxResolution must be an array of two positive integers');
        } else {
          sanitizedValue.maxResolution = this.sanitizeResolution(config.maxResolution);
        }
      }

      // Validate memoryLimit
      if (config.memoryLimit !== undefined) {
        if (!this.isValidMemoryLimit(config.memoryLimit)) {
          errors.push('memoryLimit must be a positive number (MB)');
        } else if (config.memoryLimit > 8192) {
          warnings.push('memoryLimit above 8GB may not be available on all devices');
        }
      }

      // Validate powerMode
      if (config.powerMode !== undefined) {
        if (!this.isValidPowerMode(config.powerMode)) {
          errors.push('powerMode must be "performance", "balanced", or "power-saving"');
        }
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      sanitizedValue: errors.length === 0 ? sanitizedValue : undefined
    };
  }

  /**
   * Validate RenderOptions object
   */
  validateRenderOptions(options: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = { ...options };

    try {
      // Validate cameraPosition
      if (!this.isValidVector3(options.cameraPosition)) {
        errors.push('cameraPosition must be an array of 3 numbers');
      }

      // Validate cameraRotation (quaternion)
      if (!this.isValidQuaternion(options.cameraRotation)) {
        errors.push('cameraRotation must be an array of 4 numbers (quaternion)');
      } else {
        sanitizedValue.cameraRotation = this.normalizeQuaternion(options.cameraRotation);
      }

      // Validate fieldOfView
      if (!this.isValidFOV(options.fieldOfView)) {
        errors.push('fieldOfView must be a number between 10 and 170 degrees');
      }

      // Validate near/far planes
      if (!this.isValidNumber(options.near) || options.near <= 0) {
        errors.push('near plane must be a positive number');
      }

      if (!this.isValidNumber(options.far) || options.far <= 0) {
        errors.push('far plane must be a positive number');
      }

      if (this.isValidNumber(options.near) && this.isValidNumber(options.far)) {
        if (options.far <= options.near) {
          errors.push('far plane must be greater than near plane');
        }
        
        const ratio = options.far / options.near;
        if (ratio > 10000) {
          warnings.push('Large near/far ratio may cause depth precision issues');
        }
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      sanitizedValue: errors.length === 0 ? sanitizedValue : undefined
    };
  }

  /**
   * Validate and sanitize string input
   */
  validateString(value: any, options: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}): ValidationResult {
    const errors: string[] = [];
    
    if (typeof value !== 'string') {
      if (value === null || value === undefined) {
        if (!options.allowEmpty) {
          errors.push('String value is required');
        }
        return { valid: options.allowEmpty || false, errors };
      }
      
      // Try to convert to string
      try {
        value = String(value);
      } catch (error) {
        errors.push('Value cannot be converted to string');
        return { valid: false, errors };
      }
    }

    // Sanitize string (remove dangerous characters)
    let sanitizedValue = this.sanitizeString(value);

    // Length validation
    if (options.minLength !== undefined && sanitizedValue.length < options.minLength) {
      errors.push(`String must be at least ${options.minLength} characters`);
    }

    if (options.maxLength !== undefined && sanitizedValue.length > options.maxLength) {
      sanitizedValue = sanitizedValue.substring(0, options.maxLength);
    }

    // Pattern validation
    if (options.pattern && !options.pattern.test(sanitizedValue)) {
      errors.push('String does not match required pattern');
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedValue: errors.length === 0 ? sanitizedValue : undefined
    };
  }

  /**
   * Validate numeric ranges
   */
  validateNumber(value: any, options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}): ValidationResult {
    const errors: string[] = [];
    
    if (!this.isValidNumber(value)) {
      errors.push('Value must be a valid number');
      return { valid: false, errors };
    }

    let sanitizedValue = Number(value);

    // Integer validation
    if (options.integer && !Number.isInteger(sanitizedValue)) {
      sanitizedValue = Math.round(sanitizedValue);
    }

    // Range validation
    if (options.min !== undefined && sanitizedValue < options.min) {
      errors.push(`Number must be at least ${options.min}`);
    }

    if (options.max !== undefined && sanitizedValue > options.max) {
      errors.push(`Number must be at most ${options.max}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedValue: errors.length === 0 ? sanitizedValue : undefined
    };
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Common validation patterns
    this.addRule('email', {
      name: 'email',
      validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      errorMessage: 'Invalid email format'
    });

    this.addRule('url', {
      name: 'url',
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      errorMessage: 'Invalid URL format'
    });

    this.addRule('nonEmpty', {
      name: 'nonEmpty',
      validate: (value) => value !== null && value !== undefined && value !== '',
      errorMessage: 'Value cannot be empty'
    });
  }

  /**
   * Add custom validation rule
   */
  addRule(category: string, rule: ValidationRule): void {
    if (!this.rules.has(category)) {
      this.rules.set(category, []);
    }
    this.rules.get(category)!.push(rule);
  }

  // Validation helper methods
  private isValidFPS(value: any): boolean {
    return this.isValidNumber(value) && value > 0 && value <= 240;
  }

  private isValidResolution(value: any): boolean {
    return Array.isArray(value) && 
           value.length === 2 && 
           value.every(v => this.isValidNumber(v) && v > 0 && v <= 16384);
  }

  private isValidMemoryLimit(value: any): boolean {
    return this.isValidNumber(value) && value > 0 && value <= 65536; // Max 64GB
  }

  private isValidPowerMode(value: any): boolean {
    return ['performance', 'balanced', 'power-saving'].includes(value);
  }

  private isValidVector3(value: any): boolean {
    return Array.isArray(value) && 
           value.length === 3 && 
           value.every(v => this.isValidNumber(v));
  }

  private isValidQuaternion(value: any): boolean {
    return Array.isArray(value) && 
           value.length === 4 && 
           value.every(v => this.isValidNumber(v));
  }

  private isValidFOV(value: any): boolean {
    return this.isValidNumber(value) && value >= 10 && value <= 170;
  }

  private isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  private sanitizeResolution(resolution: number[]): number[] {
    return [
      Math.max(1, Math.min(16384, Math.round(resolution[0]))),
      Math.max(1, Math.min(16384, Math.round(resolution[1])))
    ];
  }

  private normalizeQuaternion(quaternion: number[]): number[] {
    const [x, y, z, w] = quaternion;
    const length = Math.sqrt(x*x + y*y + z*z + w*w);
    
    if (length === 0) {
      return [0, 0, 0, 1]; // Identity quaternion
    }
    
    return [x/length, y/length, z/length, w/length];
  }

  private sanitizeString(value: string): string {
    // Remove potentially dangerous characters
    return value
      .replace(/[<>\"'&]/g, '') // Remove HTML/XML characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  }
}

export default RobustValidator;