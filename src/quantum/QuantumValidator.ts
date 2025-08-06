/**
 * Quantum Validator - Comprehensive validation for quantum task planning
 * Ensures quantum states, tasks, and resources maintain consistency and validity
 */

import { QuantumTask, ResourceRequirements, QuantumState, Complex } from './QuantumTaskPlanner';
import { NerfRenderTask } from './QuantumNerfScheduler';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-1, overall validity score
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'critical';
  field?: string;
  context?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface QuantumConstraints {
  minCoherence: number;
  maxSuperposition: number;
  maxEntanglements: number;
  minAmplitudeMagnitude: number;
  maxDecoherenceRate: number;
}

export interface ResourceConstraints {
  maxCpuUtilization: number;
  maxMemoryMb: number;
  maxGpuUtilization: number;
  maxBandwidthMbps: number;
  availableResources: ResourceRequirements;
}

export class QuantumValidator {
  private constraints: QuantumConstraints;
  private resourceConstraints: ResourceConstraints;
  private validationRules: Map<string, ValidationRule> = new Map();
  private validationHistory: ValidationResult[] = [];

  constructor(
    constraints: Partial<QuantumConstraints> = {},
    resourceConstraints: Partial<ResourceConstraints> = {}
  ) {
    this.constraints = {
      minCoherence: 0.01,
      maxSuperposition: 1.0,
      maxEntanglements: 10,
      minAmplitudeMagnitude: 0.001,
      maxDecoherenceRate: 0.1,
      ...constraints
    };

    this.resourceConstraints = {
      maxCpuUtilization: 0.95,
      maxMemoryMb: 2048,
      maxGpuUtilization: 0.98,
      maxBandwidthMbps: 1000,
      availableResources: {
        cpu: 1.0,
        memory: 1024,
        gpu: 1.0,
        bandwidth: 500
      },
      ...resourceConstraints
    };

    this.initializeValidationRules();
  }

  /**
   * Validate a quantum task comprehensively
   */
  validateTask(task: QuantumTask): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic task validation
    this.validateBasicTask(task, errors, warnings);
    
    // Quantum state validation
    this.validateQuantumState(task.quantumState, errors, warnings);
    
    // Resource requirements validation
    this.validateResourceRequirements(task.resourceRequirements, errors, warnings);
    
    // Dependency validation
    this.validateDependencies(task, errors, warnings);
    
    // Apply custom validation rules
    this.applyCustomValidationRules(task, errors, warnings);

    const score = this.calculateValidationScore(errors, warnings);
    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      score
    };

    this.recordValidationResult(result);
    return result;
  }

  /**
   * Validate multiple tasks and their interactions
   */
  validateTaskSet(tasks: QuantumTask[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate individual tasks
    for (const task of tasks) {
      const taskResult = this.validateTask(task);
      errors.push(...taskResult.errors);
      warnings.push(...taskResult.warnings);
    }

    // Validate task interactions
    this.validateTaskInteractions(tasks, errors, warnings);
    
    // Validate resource aggregation
    this.validateAggregatedResources(tasks, errors, warnings);
    
    // Validate quantum entanglements
    this.validateQuantumEntanglements(tasks, errors, warnings);

    const score = this.calculateValidationScore(errors, warnings);
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Validate NeRF-specific rendering task
   */
  validateNerfRenderTask(task: NerfRenderTask): ValidationResult {
    const baseResult = this.validateTask(task);
    const errors = [...baseResult.errors];
    const warnings = [...baseResult.warnings];

    // NeRF-specific validations
    this.validateNerfRenderType(task, errors, warnings);
    this.validateNerfQualityLevel(task, errors, warnings);
    this.validateNerfFoveation(task, errors, warnings);
    this.validateNerfDeviceTarget(task, errors, warnings);
    this.validateNerfRenderOptions(task, errors, warnings);

    const score = this.calculateValidationScore(errors, warnings);
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Validate quantum schedule optimization result
   */
  validateScheduleResult(
    tasks: QuantumTask[],
    scheduledTasks: QuantumTask[],
    totalTime: number,
    efficiency: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate schedule completeness
    if (scheduledTasks.length !== tasks.length) {
      errors.push({
        code: 'INCOMPLETE_SCHEDULE',
        message: `Schedule incomplete: ${scheduledTasks.length}/${tasks.length} tasks`,
        severity: 'error',
        context: { 
          expected: tasks.length, 
          actual: scheduledTasks.length 
        }
      });
    }

    // Validate task order respects dependencies
    this.validateScheduleOrder(scheduledTasks, errors, warnings);

    // Validate timing constraints
    if (totalTime <= 0) {
      errors.push({
        code: 'INVALID_TOTAL_TIME',
        message: 'Total execution time must be positive',
        severity: 'error',
        field: 'totalTime',
        context: { totalTime }
      });
    }

    // Validate efficiency bounds
    if (efficiency < 0 || efficiency > 2.0) {
      errors.push({
        code: 'INVALID_EFFICIENCY',
        message: 'Efficiency must be between 0 and 2.0',
        severity: 'error',
        field: 'efficiency',
        context: { efficiency }
      });
    } else if (efficiency < 0.5) {
      warnings.push({
        code: 'LOW_EFFICIENCY',
        message: 'Schedule efficiency is below recommended threshold',
        field: 'efficiency',
        suggestion: 'Consider adjusting quantum parameters or task priorities'
      });
    }

    const score = this.calculateValidationScore(errors, warnings);
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
    console.log(`✅ Added validation rule: ${rule.id}`);
  }

  /**
   * Update constraints
   */
  updateConstraints(
    quantumConstraints?: Partial<QuantumConstraints>,
    resourceConstraints?: Partial<ResourceConstraints>
  ): void {
    if (quantumConstraints) {
      this.constraints = { ...this.constraints, ...quantumConstraints };
    }
    
    if (resourceConstraints) {
      this.resourceConstraints = { ...this.resourceConstraints, ...resourceConstraints };
    }
    
    console.log('🔄 Validation constraints updated');
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    averageScore: number;
    errorRate: number;
    commonErrors: Array<{ code: string; count: number }>;
    recentTrend: 'improving' | 'stable' | 'declining';
  } {
    const history = this.validationHistory.slice(-100); // Last 100 validations
    
    if (history.length === 0) {
      return {
        totalValidations: 0,
        averageScore: 0,
        errorRate: 0,
        commonErrors: [],
        recentTrend: 'stable'
      };
    }

    const totalValidations = this.validationHistory.length;
    const averageScore = history.reduce((sum, r) => sum + r.score, 0) / history.length;
    const errorRate = history.filter(r => !r.valid).length / history.length;

    // Count common errors
    const errorCounts = new Map<string, number>();
    for (const result of history) {
      for (const error of result.errors) {
        errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + 1);
      }
    }

    const commonErrors = Array.from(errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Determine trend
    const recentHalf = history.slice(-50);
    const olderHalf = history.slice(-100, -50);
    
    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentHalf.length > 0 && olderHalf.length > 0) {
      const recentAvg = recentHalf.reduce((sum, r) => sum + r.score, 0) / recentHalf.length;
      const olderAvg = olderHalf.reduce((sum, r) => sum + r.score, 0) / olderHalf.length;
      const diff = recentAvg - olderAvg;
      
      if (diff > 0.05) recentTrend = 'improving';
      else if (diff < -0.05) recentTrend = 'declining';
    }

    return {
      totalValidations,
      averageScore,
      errorRate,
      commonErrors,
      recentTrend
    };
  }

  // Private validation methods

  private validateBasicTask(task: QuantumTask, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!task.id || task.id.trim() === '') {
      errors.push({
        code: 'MISSING_TASK_ID',
        message: 'Task ID is required',
        severity: 'critical',
        field: 'id'
      });
    }

    if (!task.name || task.name.trim() === '') {
      errors.push({
        code: 'MISSING_TASK_NAME',
        message: 'Task name is required',
        severity: 'error',
        field: 'name'
      });
    }

    if (task.priority < 0 || task.priority > 1) {
      errors.push({
        code: 'INVALID_PRIORITY',
        message: 'Task priority must be between 0 and 1',
        severity: 'error',
        field: 'priority',
        context: { priority: task.priority }
      });
    }

    if (task.estimatedDuration <= 0) {
      errors.push({
        code: 'INVALID_DURATION',
        message: 'Estimated duration must be positive',
        severity: 'error',
        field: 'estimatedDuration',
        context: { duration: task.estimatedDuration }
      });
    } else if (task.estimatedDuration > 10000) {
      warnings.push({
        code: 'LONG_DURATION',
        message: 'Task duration is unusually long',
        field: 'estimatedDuration',
        suggestion: 'Consider breaking into smaller tasks'
      });
    }
  }

  private validateQuantumState(state: QuantumState, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate coherence
    if (state.coherence < this.constraints.minCoherence) {
      errors.push({
        code: 'LOW_COHERENCE',
        message: `Coherence ${state.coherence.toFixed(3)} below minimum ${this.constraints.minCoherence}`,
        severity: 'error',
        field: 'quantumState.coherence'
      });
    } else if (state.coherence < 0.3) {
      warnings.push({
        code: 'DEGRADED_COHERENCE',
        message: 'Quantum coherence is degraded',
        field: 'quantumState.coherence',
        suggestion: 'Consider quantum error correction'
      });
    }

    // Validate superposition
    if (state.superposition < 0 || state.superposition > this.constraints.maxSuperposition) {
      errors.push({
        code: 'INVALID_SUPERPOSITION',
        message: `Superposition ${state.superposition.toFixed(3)} out of valid range`,
        severity: 'error',
        field: 'quantumState.superposition'
      });
    }

    // Validate entanglements
    if (state.entanglement.length > this.constraints.maxEntanglements) {
      warnings.push({
        code: 'EXCESSIVE_ENTANGLEMENT',
        message: `Too many entanglements: ${state.entanglement.length}`,
        field: 'quantumState.entanglement',
        suggestion: 'Excessive entanglement may cause decoherence'
      });
    }

    // Validate amplitude
    this.validateComplexAmplitude(state.amplitude, errors, warnings);
  }

  private validateComplexAmplitude(amplitude: Complex, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const magnitude = Math.sqrt(amplitude.real * amplitude.real + amplitude.imaginary * amplitude.imaginary);
    
    if (magnitude < this.constraints.minAmplitudeMagnitude) {
      errors.push({
        code: 'LOW_AMPLITUDE',
        message: `Amplitude magnitude ${magnitude.toFixed(6)} too low`,
        severity: 'error',
        field: 'quantumState.amplitude'
      });
    }

    if (magnitude > 1.1) {
      errors.push({
        code: 'AMPLITUDE_NOT_NORMALIZED',
        message: `Amplitude magnitude ${magnitude.toFixed(3)} exceeds normalized bounds`,
        severity: 'error',
        field: 'quantumState.amplitude'
      });
    }

    if (Math.abs(amplitude.real) > 10 || Math.abs(amplitude.imaginary) > 10) {
      warnings.push({
        code: 'EXTREME_AMPLITUDE_VALUES',
        message: 'Amplitude components have extreme values',
        field: 'quantumState.amplitude',
        suggestion: 'Consider normalizing amplitude'
      });
    }
  }

  private validateResourceRequirements(
    resources: ResourceRequirements,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate CPU
    if (resources.cpu < 0 || resources.cpu > this.resourceConstraints.maxCpuUtilization) {
      errors.push({
        code: 'INVALID_CPU_REQUIREMENT',
        message: `CPU requirement ${resources.cpu.toFixed(3)} out of valid range`,
        severity: 'error',
        field: 'resourceRequirements.cpu'
      });
    }

    // Validate memory
    if (resources.memory <= 0) {
      errors.push({
        code: 'INVALID_MEMORY_REQUIREMENT',
        message: 'Memory requirement must be positive',
        severity: 'error',
        field: 'resourceRequirements.memory'
      });
    } else if (resources.memory > this.resourceConstraints.maxMemoryMb) {
      warnings.push({
        code: 'HIGH_MEMORY_REQUIREMENT',
        message: `Memory requirement ${resources.memory}MB is high`,
        field: 'resourceRequirements.memory',
        suggestion: 'Consider memory optimization'
      });
    }

    // Validate GPU
    if (resources.gpu < 0 || resources.gpu > this.resourceConstraints.maxGpuUtilization) {
      errors.push({
        code: 'INVALID_GPU_REQUIREMENT',
        message: `GPU requirement ${resources.gpu.toFixed(3)} out of valid range`,
        severity: 'error',
        field: 'resourceRequirements.gpu'
      });
    }

    // Validate bandwidth
    if (resources.bandwidth < 0) {
      errors.push({
        code: 'INVALID_BANDWIDTH_REQUIREMENT',
        message: 'Bandwidth requirement must be non-negative',
        severity: 'error',
        field: 'resourceRequirements.bandwidth'
      });
    }
  }

  private validateDependencies(task: QuantumTask, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check for self-dependency
    if (task.dependencies.includes(task.id)) {
      errors.push({
        code: 'SELF_DEPENDENCY',
        message: 'Task cannot depend on itself',
        severity: 'critical',
        field: 'dependencies'
      });
    }

    // Check for duplicate dependencies
    const uniqueDeps = new Set(task.dependencies);
    if (uniqueDeps.size !== task.dependencies.length) {
      warnings.push({
        code: 'DUPLICATE_DEPENDENCIES',
        message: 'Task has duplicate dependencies',
        field: 'dependencies',
        suggestion: 'Remove duplicate dependencies'
      });
    }
  }

  private validateTaskInteractions(tasks: QuantumTask[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    const taskIds = new Set(tasks.map(t => t.id));
    
    // Validate dependency references
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          errors.push({
            code: 'MISSING_DEPENDENCY',
            message: `Task ${task.id} depends on non-existent task ${depId}`,
            severity: 'critical',
            context: { taskId: task.id, dependencyId: depId }
          });
        }
      }
    }

    // Check for dependency cycles
    const cycles = this.findDependencyCycles(tasks);
    for (const cycle of cycles) {
      errors.push({
        code: 'DEPENDENCY_CYCLE',
        message: `Dependency cycle detected: ${cycle.join(' → ')}`,
        severity: 'critical',
        context: { cycle }
      });
    }
  }

  private validateAggregatedResources(tasks: QuantumTask[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    const totalResources = tasks.reduce(
      (sum, task) => ({
        cpu: sum.cpu + task.resourceRequirements.cpu,
        memory: sum.memory + task.resourceRequirements.memory,
        gpu: sum.gpu + task.resourceRequirements.gpu,
        bandwidth: sum.bandwidth + task.resourceRequirements.bandwidth
      }),
      { cpu: 0, memory: 0, gpu: 0, bandwidth: 0 }
    );

    const available = this.resourceConstraints.availableResources;

    if (totalResources.cpu > available.cpu) {
      errors.push({
        code: 'INSUFFICIENT_CPU',
        message: `Total CPU requirement (${totalResources.cpu.toFixed(2)}) exceeds available (${available.cpu})`,
        severity: 'error',
        context: { required: totalResources.cpu, available: available.cpu }
      });
    }

    if (totalResources.memory > available.memory) {
      errors.push({
        code: 'INSUFFICIENT_MEMORY',
        message: `Total memory requirement (${totalResources.memory}MB) exceeds available (${available.memory}MB)`,
        severity: 'error',
        context: { required: totalResources.memory, available: available.memory }
      });
    }

    if (totalResources.gpu > available.gpu) {
      errors.push({
        code: 'INSUFFICIENT_GPU',
        message: `Total GPU requirement (${totalResources.gpu.toFixed(2)}) exceeds available (${available.gpu})`,
        severity: 'error',
        context: { required: totalResources.gpu, available: available.gpu }
      });
    }
  }

  private validateQuantumEntanglements(tasks: QuantumTask[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    const taskIds = new Set(tasks.map(t => t.id));
    
    for (const task of tasks) {
      for (const entangledId of task.quantumState.entanglement) {
        if (!taskIds.has(entangledId)) {
          errors.push({
            code: 'INVALID_ENTANGLEMENT',
            message: `Task ${task.id} entangled with non-existent task ${entangledId}`,
            severity: 'error',
            context: { taskId: task.id, entangledId }
          });
        }
      }
    }

    // Check for asymmetric entanglements
    const entanglementMap = new Map<string, Set<string>>();
    for (const task of tasks) {
      entanglementMap.set(task.id, new Set(task.quantumState.entanglement));
    }

    for (const task of tasks) {
      for (const entangledId of task.quantumState.entanglement) {
        const entangledSet = entanglementMap.get(entangledId);
        if (entangledSet && !entangledSet.has(task.id)) {
          warnings.push({
            code: 'ASYMMETRIC_ENTANGLEMENT',
            message: `Asymmetric entanglement between ${task.id} and ${entangledId}`,
            suggestion: 'Quantum entanglement should be symmetric'
          });
        }
      }
    }
  }

  private validateNerfRenderType(task: NerfRenderTask, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const validTypes = ['rayMarching', 'neuralInference', 'volumeRendering', 'postProcessing'];
    if (!validTypes.includes(task.renderType)) {
      errors.push({
        code: 'INVALID_RENDER_TYPE',
        message: `Invalid render type: ${task.renderType}`,
        severity: 'error',
        field: 'renderType'
      });
    }
  }

  private validateNerfQualityLevel(task: NerfRenderTask, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const validLevels = ['ultra', 'high', 'medium', 'low'];
    if (!validLevels.includes(task.qualityLevel)) {
      errors.push({
        code: 'INVALID_QUALITY_LEVEL',
        message: `Invalid quality level: ${task.qualityLevel}`,
        severity: 'error',
        field: 'qualityLevel'
      });
    }
  }

  private validateNerfFoveation(task: NerfRenderTask, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (task.foveationLevel < 0 || task.foveationLevel > 1) {
      errors.push({
        code: 'INVALID_FOVEATION_LEVEL',
        message: `Foveation level must be between 0 and 1, got ${task.foveationLevel}`,
        severity: 'error',
        field: 'foveationLevel'
      });
    }
  }

  private validateNerfDeviceTarget(task: NerfRenderTask, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const validTargets = ['visionPro', 'iphone', 'web', 'generic'];
    if (!validTargets.includes(task.deviceTarget)) {
      errors.push({
        code: 'INVALID_DEVICE_TARGET',
        message: `Invalid device target: ${task.deviceTarget}`,
        severity: 'error',
        field: 'deviceTarget'
      });
    }
  }

  private validateNerfRenderOptions(task: NerfRenderTask, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const options = task.renderOptions;
    
    if (options.fieldOfView <= 0 || options.fieldOfView >= 180) {
      errors.push({
        code: 'INVALID_FOV',
        message: `Field of view must be between 0 and 180 degrees, got ${options.fieldOfView}`,
        severity: 'error',
        field: 'renderOptions.fieldOfView'
      });
    }

    if (options.near >= options.far) {
      errors.push({
        code: 'INVALID_CLIPPING_PLANES',
        message: 'Near clipping plane must be less than far clipping plane',
        severity: 'error',
        field: 'renderOptions'
      });
    }

    if (options.near <= 0) {
      errors.push({
        code: 'INVALID_NEAR_PLANE',
        message: 'Near clipping plane must be positive',
        severity: 'error',
        field: 'renderOptions.near'
      });
    }
  }

  private validateScheduleOrder(tasks: QuantumTask[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    const executedTasks = new Set<string>();
    
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        if (!executedTasks.has(depId)) {
          errors.push({
            code: 'DEPENDENCY_ORDER_VIOLATION',
            message: `Task ${task.id} scheduled before its dependency ${depId}`,
            severity: 'critical',
            context: { taskId: task.id, dependencyId: depId }
          });
        }
      }
      
      executedTasks.add(task.id);
    }
  }

  private applyCustomValidationRules(task: QuantumTask, errors: ValidationError[], warnings: ValidationWarning[]): void {
    for (const rule of this.validationRules.values()) {
      try {
        rule.validate(task, errors, warnings, this.constraints, this.resourceConstraints);
      } catch (error) {
        console.warn(`⚠️ Validation rule ${rule.id} failed:`, error);
      }
    }
  }

  private findDependencyCycles(tasks: QuantumTask[]): string[][] {
    const cycles: string[][] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (taskId: string): boolean => {
      if (recursionStack.has(taskId)) {
        // Found cycle
        const cycleStart = path.indexOf(taskId);
        cycles.push([...path.slice(cycleStart), taskId]);
        return true;
      }

      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (dfs(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(taskId);
      path.pop();
      return false;
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id);
      }
    }

    return cycles;
  }

  private calculateValidationScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const regularErrors = errors.filter(e => e.severity === 'error').length;
    const warningCount = warnings.length;

    // Score starts at 1.0 and decreases based on issues
    let score = 1.0;
    score -= criticalErrors * 0.5; // Critical errors severely impact score
    score -= regularErrors * 0.2;  // Regular errors moderately impact score
    score -= warningCount * 0.05;  // Warnings slightly impact score

    return Math.max(0, score);
  }

  private recordValidationResult(result: ValidationResult): void {
    this.validationHistory.push(result);
    
    // Keep only last 1000 results to prevent memory bloat
    if (this.validationHistory.length > 1000) {
      this.validationHistory.splice(0, this.validationHistory.length - 1000);
    }
  }

  private initializeValidationRules(): void {
    // Add built-in validation rules
    this.addValidationRule({
      id: 'quantum_physics_consistency',
      description: 'Ensures quantum states follow basic quantum mechanics principles',
      validate: (task, errors, warnings) => {
        const { coherence, superposition } = task.quantumState;
        
        // Higher superposition should generally correlate with higher coherence
        if (superposition > 0.8 && coherence < 0.5) {
          warnings.push({
            code: 'SUPERPOSITION_COHERENCE_MISMATCH',
            message: 'High superposition with low coherence is physically unusual',
            suggestion: 'Consider adjusting quantum parameters for consistency'
          });
        }
      }
    });

    this.addValidationRule({
      id: 'performance_optimization',
      description: 'Validates performance-related task parameters',
      validate: (task, errors, warnings) => {
        const { cpu, gpu, memory } = task.resourceRequirements;
        
        // Warn about resource imbalances
        if (gpu > 0.9 && cpu < 0.1) {
          warnings.push({
            code: 'GPU_CPU_IMBALANCE',
            message: 'High GPU usage with very low CPU usage',
            field: 'resourceRequirements',
            suggestion: 'Consider CPU-side optimizations'
          });
        }
        
        if (memory > 1000 && task.estimatedDuration < 10) {
          warnings.push({
            code: 'MEMORY_DURATION_MISMATCH',
            message: 'High memory requirement for short task',
            suggestion: 'Verify memory requirements are correct'
          });
        }
      }
    });

    console.log('✅ Built-in validation rules initialized');
  }
}

// Supporting interfaces
interface ValidationRule {
  id: string;
  description: string;
  validate: (
    task: QuantumTask,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    quantumConstraints?: QuantumConstraints,
    resourceConstraints?: ResourceConstraints
  ) => void;
}

export default QuantumValidator;