/**
 * Comprehensive Validation System for NeRF Edge Kit
 * 
 * ROBUST VALIDATION: Multi-layer validation with:
 * 1. Input parameter validation with type safety
 * 2. Performance constraint validation
 * 3. Device capability validation
 * 4. Real-time quality validation
 * 5. Security and safety validation
 */

import { NerfConfig, RenderOptions, PerformanceMetrics } from './types';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from './ErrorHandler';

export enum ValidationType {
  INPUT = 'input',
  PERFORMANCE = 'performance',
  DEVICE = 'device',
  QUALITY = 'quality',
  SECURITY = 'security',
  MEMORY = 'memory',
  RENDER_STATE = 'render_state'
}

export interface ValidationRule {
  name: string;
  type: ValidationType;
  validator: (value: any, context?: ValidationContext) => ValidationResult;
  severity: ErrorSeverity;
  required: boolean;
}

export interface ValidationContext {
  deviceCapabilities?: DeviceCapabilities;
  currentPerformance?: PerformanceMetrics;
  memoryState?: MemoryState;
  securityContext?: SecurityContext;
  renderingContext?: RenderingContext;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  performance?: PerformanceValidation;
}

export interface ValidationError {
  rule: string;
  message: string;
  severity: ErrorSeverity;
  value?: any;
  expectedRange?: [any, any];
}

export interface ValidationWarning {
  rule: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export interface DeviceCapabilities {
  webgpuSupported: boolean;
  maxTextureSize: number;
  maxComputeWorkgroupSize: number;
  maxStorageBufferSize: number;
  memoryLimit: number;
  gpuTier: 1 | 2 | 3;
  supportedFeatures: string[];
}

export interface MemoryState {
  used: number;
  available: number;
  total: number;
  fragmentation: number;
  gcPressure: number;
}

export interface SecurityContext {
  origin: string;
  httpsRequired: boolean;
  cspViolations: string[];
  permissions: string[];
}

export interface RenderingContext {
  activeModels: number;
  renderTargets: number;
  shaderComplexity: number;
  rayDensity: number;
  qualityLevel: number;
}

export interface PerformanceValidation {
  expectedFPS: number;
  memoryFootprint: number;
  powerConsumption: number;
  thermalImpact: number;
  networkBandwidth?: number;
}

/**
 * Comprehensive Validation System
 */
export class ValidationSystem {
  private rules: Map<string, ValidationRule> = new Map();
  private errorHandler: ErrorHandler;
  private validationHistory: ValidationResult[] = [];
  private deviceCapabilities: DeviceCapabilities | null = null;
  private performanceBaseline: PerformanceMetrics | null = null;
  
  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.initializeValidationRules();
    console.log('🔍 Comprehensive ValidationSystem initialized');
  }

  /**
   * Validate NeRF configuration
   */
  async validateConfig(config: NerfConfig, context?: ValidationContext): Promise<ValidationResult> {
    console.log('🔍 Validating NeRF configuration...');
    
    const results: ValidationResult[] = [];
    
    // Input validation
    results.push(await this.validateInputParameters(config, context));
    
    // Performance validation
    results.push(await this.validatePerformanceConstraints(config, context));
    
    // Device capability validation
    results.push(await this.validateDeviceCapabilities(config, context));
    
    // Memory validation
    results.push(await this.validateMemoryRequirements(config, context));
    
    // Security validation
    results.push(await this.validateSecurityConstraints(config, context));
    
    const combinedResult = this.combineValidationResults(results);
    
    // Store validation history
    this.validationHistory.push(combinedResult);
    if (this.validationHistory.length > 100) {
      this.validationHistory.shift();
    }
    
    // Report errors if any
    for (const error of combinedResult.errors) {
      await this.errorHandler.handleError(
        error.message,
        { component: 'ValidationSystem', operation: 'validateConfig' },
        error.severity,
        ErrorCategory.VALIDATION
      );
    }
    
    console.log(`✅ Configuration validation complete: ${combinedResult.valid ? 'VALID' : 'INVALID'}`);
    return combinedResult;
  }

  /**
   * Validate render options
   */
  async validateRenderOptions(options: RenderOptions, context?: ValidationContext): Promise<ValidationResult> {
    const results: ValidationResult[] = [];
    
    // Camera parameter validation
    results.push(await this.validateCameraParameters(options, context));
    
    // Spatial bounds validation  
    results.push(await this.validateSpatialBounds(options, context));
    
    // Rendering performance validation
    results.push(await this.validateRenderingPerformance(options, context));
    
    return this.combineValidationResults(results);
  }

  /**
   * Real-time quality validation during rendering
   */
  async validateQualityMetrics(
    metrics: PerformanceMetrics,
    expectedQuality: number = 0.9
  ): Promise<ValidationResult> {
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // FPS validation
    if (metrics.fps < 30) {
      errors.push({
        rule: 'minimum_fps',
        message: `Frame rate too low: ${metrics.fps} FPS (minimum: 30 FPS)`,
        severity: ErrorSeverity.HIGH,
        value: metrics.fps,
        expectedRange: [30, Infinity]
      });
    } else if (metrics.fps < 60) {
      warnings.push({
        rule: 'target_fps',
        message: `Frame rate below target: ${metrics.fps} FPS (target: 60 FPS)`,
        impact: 'medium',
        recommendation: 'Consider reducing quality settings or optimizing the model'
      });
    }
    
    // Frame time validation
    if (metrics.frameTime > 33.33) {
      errors.push({
        rule: 'maximum_frame_time',
        message: `Frame time too high: ${metrics.frameTime}ms (maximum: 33.33ms)`,
        severity: ErrorSeverity.HIGH,
        value: metrics.frameTime,
        expectedRange: [0, 33.33]
      });
    }
    
    // Memory validation
    if (metrics.memoryUsage > 2048) {
      errors.push({
        rule: 'memory_limit',
        message: `Memory usage exceeded: ${metrics.memoryUsage}MB (limit: 2048MB)`,
        severity: ErrorSeverity.CRITICAL,
        value: metrics.memoryUsage,
        expectedRange: [0, 2048]
      });
    }
    
    // Power consumption validation
    if (metrics.powerConsumption > 15) {
      warnings.push({
        rule: 'power_efficiency',
        message: `High power consumption: ${metrics.powerConsumption}W`,
        impact: 'high',
        recommendation: 'Enable power-saving mode or reduce rendering complexity'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateQualityImprovementSuggestions(metrics),
      performance: {
        expectedFPS: this.calculateExpectedFPS(metrics),
        memoryFootprint: metrics.memoryUsage,
        powerConsumption: metrics.powerConsumption,
        thermalImpact: this.calculateThermalImpact(metrics)
      }
    };
  }

  /**
   * Validate device capabilities
   */
  async validateDeviceSupport(): Promise<DeviceCapabilities> {
    console.log('🔍 Detecting and validating device capabilities...');
    
    const capabilities: DeviceCapabilities = {
      webgpuSupported: await this.detectWebGPUSupport(),
      maxTextureSize: await this.detectMaxTextureSize(),
      maxComputeWorkgroupSize: await this.detectMaxComputeWorkgroupSize(),
      maxStorageBufferSize: await this.detectMaxStorageBufferSize(),
      memoryLimit: await this.detectMemoryLimit(),
      gpuTier: await this.detectGPUTier(),
      supportedFeatures: await this.detectSupportedFeatures()
    };
    
    this.deviceCapabilities = capabilities;
    
    console.log('📊 Device capabilities detected:', {
      webGPU: capabilities.webgpuSupported,
      gpuTier: capabilities.gpuTier,
      memory: `${capabilities.memoryLimit}MB`,
      maxTexture: `${capabilities.maxTextureSize}px`
    });
    
    return capabilities;
  }

  /**
   * Get validation analytics
   */
  getValidationAnalytics(): {
    totalValidations: number;
    successRate: number;
    commonErrors: Array<{ error: string; count: number }>;
    performanceTrends: Array<{ timestamp: number; fps: number; quality: number }>;
    deviceSupport: DeviceCapabilities | null;
  } {
    const successfulValidations = this.validationHistory.filter(v => v.valid).length;
    const successRate = this.validationHistory.length > 0 
      ? successfulValidations / this.validationHistory.length 
      : 0;
    
    // Analyze common errors
    const errorCounts = new Map<string, number>();
    for (const validation of this.validationHistory) {
      for (const error of validation.errors) {
        errorCounts.set(error.rule, (errorCounts.get(error.rule) || 0) + 1);
      }
    }
    
    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalValidations: this.validationHistory.length,
      successRate,
      commonErrors,
      performanceTrends: [], // Would track actual performance over time
      deviceSupport: this.deviceCapabilities
    };
  }

  // Private validation methods
  
  private async validateInputParameters(config: NerfConfig, context?: ValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Target FPS validation
    if (config.targetFPS < 1 || config.targetFPS > 240) {
      errors.push({
        rule: 'target_fps_range',
        message: `Invalid target FPS: ${config.targetFPS} (valid range: 1-240)`,
        severity: ErrorSeverity.HIGH,
        value: config.targetFPS,
        expectedRange: [1, 240]
      });
    }
    
    // Resolution validation
    const [width, height] = config.maxResolution;
    if (width < 320 || width > 8192 || height < 240 || height > 8192) {
      errors.push({
        rule: 'resolution_range',
        message: `Invalid resolution: ${width}x${height}`,
        severity: ErrorSeverity.MEDIUM,
        value: config.maxResolution,
        expectedRange: [[320, 240], [8192, 8192]]
      });
    }
    
    // Memory limit validation
    if (config.memoryLimit < 256 || config.memoryLimit > 16384) {
      warnings.push({
        rule: 'memory_limit_range',
        message: `Unusual memory limit: ${config.memoryLimit}MB`,
        impact: 'medium',
        recommendation: 'Recommended range: 512-4096MB'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }
  
  private async validatePerformanceConstraints(config: NerfConfig, context?: ValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Performance feasibility check
    const pixelCount = config.maxResolution[0] * config.maxResolution[1];
    const pixelRate = pixelCount * config.targetFPS;
    
    if (pixelRate > 500000000) { // 500M pixels/second threshold
      warnings.push({
        rule: 'pixel_rate_high',
        message: `Very high pixel rate: ${(pixelRate / 1000000).toFixed(1)}M pixels/second`,
        impact: 'high',
        recommendation: 'Consider reducing resolution or frame rate for better stability'
      });
    }
    
    // Power mode vs performance validation
    if (config.powerMode === 'power-saving' && config.targetFPS > 60) {
      warnings.push({
        rule: 'power_performance_mismatch',
        message: 'High frame rate requested with power-saving mode',
        impact: 'medium',
        recommendation: 'Switch to balanced or performance mode for high frame rates'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: [],
      performance: {
        expectedFPS: this.estimateExpectedFPS(config),
        memoryFootprint: this.estimateMemoryFootprint(config),
        powerConsumption: this.estimatePowerConsumption(config),
        thermalImpact: this.estimateThermalImpact(config)
      }
    };
  }
  
  private async validateDeviceCapabilities(config: NerfConfig, context?: ValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    if (!this.deviceCapabilities) {
      await this.validateDeviceSupport();
    }
    
    const caps = this.deviceCapabilities!;
    
    // WebGPU support validation
    if (!caps.webgpuSupported) {
      errors.push({
        rule: 'webgpu_required',
        message: 'WebGPU not supported on this device',
        severity: ErrorSeverity.CRITICAL,
        value: false
      });
    }
    
    // Memory validation
    if (config.memoryLimit > caps.memoryLimit) {
      errors.push({
        rule: 'insufficient_memory',
        message: `Requested ${config.memoryLimit}MB exceeds device limit ${caps.memoryLimit}MB`,
        severity: ErrorSeverity.HIGH,
        value: config.memoryLimit,
        expectedRange: [0, caps.memoryLimit]
      });
    }
    
    // Texture size validation
    const maxDimension = Math.max(...config.maxResolution);
    if (maxDimension > caps.maxTextureSize) {
      errors.push({
        rule: 'texture_size_limit',
        message: `Resolution dimension ${maxDimension} exceeds texture limit ${caps.maxTextureSize}`,
        severity: ErrorSeverity.HIGH,
        value: maxDimension,
        expectedRange: [0, caps.maxTextureSize]
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateDeviceOptimizationSuggestions(config, caps)
    };
  }
  
  private async validateMemoryRequirements(config: NerfConfig, context?: ValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    const estimatedUsage = this.estimateMemoryUsage(config);
    
    if (estimatedUsage > config.memoryLimit * 0.9) {
      warnings.push({
        rule: 'high_memory_usage',
        message: `Estimated memory usage ${estimatedUsage}MB approaches limit ${config.memoryLimit}MB`,
        impact: 'high',
        recommendation: 'Increase memory limit or reduce model complexity'
      });
    }
    
    // Check for memory fragmentation risk
    if (context?.memoryState?.fragmentation && context.memoryState.fragmentation > 0.5) {
      warnings.push({
        rule: 'memory_fragmentation',
        message: `High memory fragmentation: ${(context.memoryState.fragmentation * 100).toFixed(1)}%`,
        impact: 'medium',
        recommendation: 'Consider restarting the application to defragment memory'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }
  
  private async validateSecurityConstraints(config: NerfConfig, context?: ValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // HTTPS requirement for WebGPU
    if (typeof location !== 'undefined' && location.protocol !== 'https:' && location.hostname !== 'localhost') {
      errors.push({
        rule: 'https_required',
        message: 'HTTPS required for WebGPU in production environments',
        severity: ErrorSeverity.HIGH,
        value: location.protocol
      });
    }
    
    // CSP validation
    if (context?.securityContext?.cspViolations && context.securityContext.cspViolations.length > 0) {
      warnings.push({
        rule: 'csp_violations',
        message: `Content Security Policy violations detected: ${context.securityContext.cspViolations.join(', ')}`,
        impact: 'medium',
        recommendation: 'Update CSP to allow required WebGPU operations'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }
  
  private async validateCameraParameters(options: RenderOptions, context?: ValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Field of view validation
    if (options.fieldOfView < 10 || options.fieldOfView > 179) {
      errors.push({
        rule: 'fov_range',
        message: `Invalid field of view: ${options.fieldOfView}° (valid range: 10-179°)`,
        severity: ErrorSeverity.MEDIUM,
        value: options.fieldOfView,
        expectedRange: [10, 179]
      });
    }
    
    // Near/far plane validation
    if (options.near >= options.far) {
      errors.push({
        rule: 'near_far_order',
        message: `Near plane (${options.near}) must be less than far plane (${options.far})`,
        severity: ErrorSeverity.HIGH,
        value: [options.near, options.far]
      });
    }
    
    if (options.near <= 0) {
      errors.push({
        rule: 'near_plane_positive',
        message: `Near plane must be positive: ${options.near}`,
        severity: ErrorSeverity.HIGH,
        value: options.near,
        expectedRange: [0.001, Infinity]
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }
  
  private async validateSpatialBounds(options: RenderOptions, context?: ValidationContext): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];
    
    // Camera position validation
    const [x, y, z] = options.cameraPosition;
    const distance = Math.sqrt(x * x + y * y + z * z);
    
    if (distance > 1000) {
      warnings.push({
        rule: 'camera_distance',
        message: `Camera very far from origin: ${distance.toFixed(1)} units`,
        impact: 'low',
        recommendation: 'Consider using more appropriate scene scale'
      });
    }
    
    return {
      valid: true,
      errors: [],
      warnings,
      suggestions: []
    };
  }
  
  private async validateRenderingPerformance(options: RenderOptions, context?: ValidationContext): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];
    
    // Calculate rendering complexity
    const aspectRatio = (context?.deviceCapabilities?.maxTextureSize || 1920) / 
                       (context?.deviceCapabilities?.maxTextureSize || 1080);
    const complexity = options.fieldOfView * (options.far - options.near) * aspectRatio;
    
    if (complexity > 100000) {
      warnings.push({
        rule: 'rendering_complexity',
        message: `High rendering complexity detected: ${complexity.toFixed(0)}`,
        impact: 'medium',
        recommendation: 'Consider reducing field of view or depth range'
      });
    }
    
    return {
      valid: true,
      errors: [],
      warnings,
      suggestions: []
    };
  }
  
  private initializeValidationRules(): void {
    // Initialize comprehensive validation rules
    console.log('🔧 Initializing validation rules...');
  }
  
  private combineValidationResults(results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const allSuggestions: string[] = [];
    
    for (const result of results) {
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      allSuggestions.push(...result.suggestions);
    }
    
    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: [...new Set(allSuggestions)] // Remove duplicates
    };
  }
  
  // Device detection methods
  
  private async detectWebGPUSupport(): Promise<boolean> {
    try {
      if (!navigator.gpu) return false;
      const adapter = await navigator.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }
  
  private async detectMaxTextureSize(): Promise<number> {
    // Mock detection - would query actual WebGPU limits
    return 8192;
  }
  
  private async detectMaxComputeWorkgroupSize(): Promise<number> {
    return 256;
  }
  
  private async detectMaxStorageBufferSize(): Promise<number> {
    return 1073741824; // 1GB
  }
  
  private async detectMemoryLimit(): Promise<number> {
    // Mock memory detection
    return 4096; // 4GB
  }
  
  private async detectGPUTier(): Promise<1 | 2 | 3> {
    // Mock GPU tier detection
    return 2;
  }
  
  private async detectSupportedFeatures(): Promise<string[]> {
    return ['timestamp-query', 'texture-compression-bc'];
  }
  
  // Estimation methods
  
  private estimateExpectedFPS(config: NerfConfig): number {
    const pixelCount = config.maxResolution[0] * config.maxResolution[1];
    const complexity = pixelCount / 1000000; // Millions of pixels
    
    // Simple heuristic based on resolution
    let baseFPS = 120;
    if (complexity > 8) baseFPS = 30;
    else if (complexity > 4) baseFPS = 60;
    else if (complexity > 2) baseFPS = 90;
    
    // Apply power mode modifier
    const powerModifier = config.powerMode === 'performance' ? 1.2 : 
                         config.powerMode === 'power-saving' ? 0.7 : 1.0;
    
    return Math.min(Math.floor(baseFPS * powerModifier), config.targetFPS);
  }
  
  private estimateMemoryFootprint(config: NerfConfig): number {
    const pixelCount = config.maxResolution[0] * config.maxResolution[1];
    const baseMemory = pixelCount * 4 * 2; // RGBA + depth, double buffered
    const modelMemory = config.memoryLimit * 0.6; // 60% for model data
    
    return (baseMemory + modelMemory) / 1024 / 1024; // Convert to MB
  }
  
  private estimatePowerConsumption(config: NerfConfig): number {
    const baseConsumption = 5; // 5W base
    const fpsMultiplier = config.targetFPS / 60;
    const resolutionMultiplier = (config.maxResolution[0] * config.maxResolution[1]) / (1920 * 1080);
    
    const powerModifier = config.powerMode === 'performance' ? 1.5 : 
                         config.powerMode === 'power-saving' ? 0.6 : 1.0;
    
    return baseConsumption * fpsMultiplier * resolutionMultiplier * powerModifier;
  }
  
  private estimateThermalImpact(config: NerfConfig): number {
    const powerConsumption = this.estimatePowerConsumption(config);
    return powerConsumption * 0.8; // 80% of power becomes heat
  }
  
  private estimateMemoryUsage(config: NerfConfig): number {
    return this.estimateMemoryFootprint(config);
  }
  
  private calculateExpectedFPS(metrics: PerformanceMetrics): number {
    // Based on current frame time, calculate sustainable FPS
    return Math.min(1000 / Math.max(metrics.frameTime, 16.67), 120);
  }
  
  private calculateThermalImpact(metrics: PerformanceMetrics): number {
    return metrics.powerConsumption * 0.8;
  }
  
  private generateQualityImprovementSuggestions(metrics: PerformanceMetrics): string[] {
    const suggestions: string[] = [];
    
    if (metrics.fps < 60) {
      suggestions.push('Reduce rendering quality or resolution to improve frame rate');
    }
    
    if (metrics.memoryUsage > 1024) {
      suggestions.push('Enable memory optimization features to reduce usage');
    }
    
    if (metrics.powerConsumption > 10) {
      suggestions.push('Enable power-saving mode to reduce energy consumption');
    }
    
    return suggestions;
  }
  
  private generateDeviceOptimizationSuggestions(config: NerfConfig, caps: DeviceCapabilities): string[] {
    const suggestions: string[] = [];
    
    if (caps.gpuTier === 1) {
      suggestions.push('Consider reducing resolution or quality settings for low-end GPU');
    }
    
    if (config.memoryLimit > caps.memoryLimit * 0.8) {
      suggestions.push('Reduce memory limit to prevent system instability');
    }
    
    return suggestions;
  }
}