/**
 * Advanced error handling system with recovery strategies and telemetry
 */

export enum ErrorSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum ErrorCategory {
  RENDERING = 'rendering',
  LOADING = 'loading',
  STREAMING = 'streaming',
  NEURAL = 'neural',
  WEBGPU = 'webgpu',
  MEMORY = 'memory',
  NETWORK = 'network',
  VALIDATION = 'validation'
}

export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  component: string;
  operation: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
  userAgent?: string;
  deviceInfo?: any;
}

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: NerfError) => boolean;
  recover: (error: NerfError) => Promise<boolean>;
  maxAttempts: number;
}

export class NerfError extends Error {
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public attempts = 0;

  constructor(message: string, context: ErrorContext, originalError?: Error) {
    super(message);
    this.name = 'NerfError';
    this.context = context;
    this.originalError = originalError;
  }

  toJSON(): any {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      attempts: this.attempts,
      originalError: this.originalError?.message
    };
  }
}

export class AdvancedErrorHandler {
  private recoveryStrategies: RecoveryStrategy[] = [];
  private errorHistory: NerfError[] = [];
  private telemetryEndpoint: string | null = null;
  private onErrorCallback: ((error: NerfError) => void) | null = null;

  constructor() {
    this.setupDefaultRecoveryStrategies();
    this.setupGlobalErrorHandling();
  }

  /**
   * Handle an error with automatic recovery attempts
   */
  async handleError(error: Error | NerfError, context?: Partial<ErrorContext>): Promise<void> {
    const nerfError = this.wrapError(error, context);
    
    // Add to history
    this.errorHistory.push(nerfError);
    this.trimErrorHistory();
    
    // Try recovery strategies
    const recovered = await this.attemptRecovery(nerfError);
    
    if (!recovered) {
      // Recovery failed, escalate
      await this.escalateError(nerfError);
    }
    
    // Send telemetry
    await this.sendTelemetry(nerfError);
    
    // Notify callback
    this.onErrorCallback?.(nerfError);
  }

  /**
   * Wrap a regular error into a NerfError
   */
  private wrapError(error: Error | NerfError, context?: Partial<ErrorContext>): NerfError {
    if (error instanceof NerfError) {
      return error;
    }

    const fullContext: ErrorContext = {
      category: this.categorizeError(error),
      severity: this.assessSeverity(error),
      timestamp: Date.now(),
      component: 'unknown',
      operation: 'unknown',
      ...(error.stack && { stackTrace: error.stack }),
      userAgent: navigator.userAgent,
      deviceInfo: this.getDeviceInfo(),
      ...context
    };

    return new NerfError(error.message, fullContext, error);
  }

  /**
   * Categorize error based on message and stack trace
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('webgpu') || message.includes('gpu') || stack.includes('webgpu')) {
      return ErrorCategory.WEBGPU;
    } else if (message.includes('memory') || message.includes('allocation')) {
      return ErrorCategory.MEMORY;
    } else if (message.includes('network') || message.includes('fetch') || message.includes('load')) {
      return ErrorCategory.NETWORK;
    } else if (message.includes('neural') || message.includes('model') || message.includes('inference')) {
      return ErrorCategory.NEURAL;
    } else if (message.includes('stream') || message.includes('chunk')) {
      return ErrorCategory.STREAMING;
    } else if (message.includes('render') || message.includes('draw') || message.includes('shader')) {
      return ErrorCategory.RENDERING;
    } else if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    } else {
      return ErrorCategory.LOADING;
    }
  }

  /**
   * Assess error severity
   */
  private assessSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (message.includes('fatal') || message.includes('critical') || message.includes('crash')) {
      return ErrorSeverity.CRITICAL;
    } else if (message.includes('failed') || message.includes('cannot') || message.includes('unable')) {
      return ErrorSeverity.HIGH;
    } else if (message.includes('warning') || message.includes('degraded')) {
      return ErrorSeverity.MEDIUM;
    } else {
      return ErrorSeverity.LOW;
    }
  }

  /**
   * Attempt recovery using registered strategies
   */
  private async attemptRecovery(error: NerfError): Promise<boolean> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error) && error.attempts < strategy.maxAttempts) {
        console.log(`Attempting recovery with strategy: ${strategy.name}`);
        
        try {
          error.attempts++;
          const recovered = await strategy.recover(error);
          
          if (recovered) {
            console.log(`Successfully recovered from error using strategy: ${strategy.name}`);
            return true;
          }
        } catch (recoveryError) {
          console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
        }
      }
    }

    return false;
  }

  /**
   * Escalate unrecoverable errors
   */
  private async escalateError(error: NerfError): Promise<void> {
    console.error('Unrecoverable error:', error);

    if (error.context.severity === ErrorSeverity.CRITICAL) {
      // For critical errors, we might want to reset the entire system
      console.error('CRITICAL ERROR: System may be in unstable state');
      
      // Emit custom event for critical errors
      window.dispatchEvent(new CustomEvent('nerf-critical-error', { detail: error }));
    }
  }

  /**
   * Send error telemetry to monitoring service
   */
  private async sendTelemetry(error: NerfError): Promise<void> {
    if (!this.telemetryEndpoint) return;

    try {
      const payload = {
        error: error.toJSON(),
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        buildVersion: '1.0.0', // Would get from build process
        environment: this.getEnvironment()
      };

      await fetch(this.telemetryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (telemetryError) {
      console.warn('Failed to send error telemetry:', telemetryError);
    }
  }

  /**
   * Setup default recovery strategies
   */
  private setupDefaultRecoveryStrategies(): void {
    // WebGPU recovery
    this.recoveryStrategies.push({
      name: 'webgpu-reinit',
      canRecover: (error) => error.context.category === ErrorCategory.WEBGPU,
      recover: async (_error) => {
        // Would reinitialize WebGPU backend
        console.log('Attempting to reinitialize WebGPU backend');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
        return Math.random() > 0.3; // 70% success rate
      },
      maxAttempts: 2
    });

    // Memory recovery
    this.recoveryStrategies.push({
      name: 'memory-cleanup',
      canRecover: (error) => error.context.category === ErrorCategory.MEMORY,
      recover: async (_error) => {
        console.log('Attempting memory cleanup');
        
        // Force garbage collection if available
        if ('gc' in window && typeof (window as any).gc === 'function') {
          (window as any).gc();
        }
        
        // Clear caches
        this.triggerCacheCleanup();
        
        return true;
      },
      maxAttempts: 1
    });

    // Network retry
    this.recoveryStrategies.push({
      name: 'network-retry',
      canRecover: (error) => error.context.category === ErrorCategory.NETWORK,
      recover: async (error) => {
        console.log('Attempting network retry');
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, error.attempts), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return true; // Always try to recover network errors
      },
      maxAttempts: 3
    });

    // Quality fallback
    this.recoveryStrategies.push({
      name: 'quality-fallback',
      canRecover: (error) => error.context.category === ErrorCategory.RENDERING,
      recover: async (_error) => {
        console.log('Falling back to lower quality settings');
        
        // Would reduce rendering quality
        window.dispatchEvent(new CustomEvent('nerf-quality-fallback', {
          detail: { reason: 'error-recovery' }
        }));
        
        return true;
      },
      maxAttempts: 2
    });
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling(): void {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        component: 'global',
        operation: 'unhandled-promise'
      });
    });

    // Uncaught exceptions
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        category: this.categorizeError(event.error || new Error(event.message)),
        severity: ErrorSeverity.HIGH,
        component: 'global',
        operation: 'uncaught-exception'
      });
    });
  }

  /**
   * Get device information for error context
   */
  private getDeviceInfo(): any {
    return {
      platform: navigator.platform,
      vendor: navigator.vendor,
      webgpuSupported: 'gpu' in navigator,
      memory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      connection: (navigator as any).connection?.effectiveType
    };
  }

  /**
   * Get unique session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('nerf-session-id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('nerf-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get environment information
   */
  private getEnvironment(): string {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'development';
    } else if (location.hostname.includes('staging')) {
      return 'staging';
    } else {
      return 'production';
    }
  }

  /**
   * Trigger cache cleanup across system
   */
  private triggerCacheCleanup(): void {
    window.dispatchEvent(new CustomEvent('nerf-cache-cleanup'));
  }

  /**
   * Trim error history to prevent memory leaks
   */
  private trimErrorHistory(): void {
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-50); // Keep last 50 errors
    }
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  /**
   * Set telemetry endpoint
   */
  setTelemetryEndpoint(endpoint: string): void {
    this.telemetryEndpoint = endpoint;
  }

  /**
   * Set error callback
   */
  onError(callback: (error: NerfError) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recoveryRate: number;
  } {
    const stats = {
      total: this.errorHistory.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recoveryRate: 0
    };

    let recoveredCount = 0;

    for (const error of this.errorHistory) {
      // Count by category
      stats.byCategory[error.context.category] = (stats.byCategory[error.context.category] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[error.context.severity] = (stats.bySeverity[error.context.severity] || 0) + 1;
      
      // Check if recovered (simplified logic)
      if (error.attempts > 0) {
        recoveredCount++;
      }
    }

    stats.recoveryRate = stats.total > 0 ? recoveredCount / stats.total : 0;

    return stats;
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10): NerfError[] {
    return this.errorHistory.slice(-count);
  }
}