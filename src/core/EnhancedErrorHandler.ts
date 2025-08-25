/**
 * Enhanced Error Handler for NeRF Edge Kit
 * Provides comprehensive error handling, recovery, and reporting
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high', 
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  WEBGPU = 'webgpu',
  NERF_MODEL = 'nerf_model',
  RENDERING = 'rendering',
  MEMORY = 'memory',
  NETWORK = 'network',
  VALIDATION = 'validation',
  SYSTEM = 'system'
}

export interface ErrorContext {
  component: string;
  operation: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  deviceInfo?: {
    userAgent: string;
    gpu?: string;
    memory?: number;
  };
  additionalData?: Record<string, any>;
}

export interface NerfError {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  stack?: string;
  cause?: Error;
  recoveryAttempts: number;
  recovered: boolean;
  reportedToTelemetry: boolean;
}

export interface RecoveryStrategy {
  category: ErrorCategory;
  maxAttempts: number;
  backoffMs: number;
  strategy: (error: NerfError) => Promise<boolean>;
}

export class EnhancedErrorHandler {
  private errors: Map<string, NerfError> = new Map();
  private recoveryStrategies: Map<ErrorCategory, RecoveryStrategy> = new Map();
  private sessionId: string;
  private errorCount = 0;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Handle an error with full context and recovery attempts
   */
  async handleError(
    error: Error | string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: Partial<ErrorContext>
  ): Promise<NerfError> {
    const nerfError = this.createNerfError(error, category, severity, context);
    
    // Store error
    this.errors.set(nerfError.id, nerfError);
    
    // Log error based on severity
    this.logError(nerfError);
    
    // Attempt recovery if strategy exists
    await this.attemptRecovery(nerfError);
    
    // Report to telemetry (if configured)
    await this.reportToTelemetry(nerfError);
    
    // Emit error event
    this.emitErrorEvent(nerfError);
    
    return nerfError;
  }

  /**
   * Create a structured NerfError from an error
   */
  private createNerfError(
    error: Error | string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: Partial<ErrorContext>
  ): NerfError {
    const errorId = this.generateErrorId();
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' ? error.stack : undefined;
    
    const fullContext: ErrorContext = {
      component: context.component || 'unknown',
      operation: context.operation || 'unknown',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      deviceInfo: this.getDeviceInfo(),
      ...context
    };

    return {
      id: errorId,
      message,
      category,
      severity,
      context: fullContext,
      stack,
      cause: typeof error === 'object' ? error : undefined,
      recoveryAttempts: 0,
      recovered: false,
      reportedToTelemetry: false
    };
  }

  /**
   * Attempt recovery using registered strategies
   */
  private async attemptRecovery(nerfError: NerfError): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(nerfError.category);
    if (!strategy || nerfError.recoveryAttempts >= strategy.maxAttempts) {
      return false;
    }

    nerfError.recoveryAttempts++;
    
    try {
      // Wait with exponential backoff
      const backoffTime = strategy.backoffMs * Math.pow(2, nerfError.recoveryAttempts - 1);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      
      console.log(`🔄 Recovery attempt ${nerfError.recoveryAttempts}/${strategy.maxAttempts} for error: ${nerfError.message}`);
      
      const recovered = await strategy.strategy(nerfError);
      
      if (recovered) {
        nerfError.recovered = true;
        console.log(`✅ Successfully recovered from error: ${nerfError.id}`);
        this.emitRecoveryEvent(nerfError);
        return true;
      }
      
    } catch (recoveryError) {
      console.error(`❌ Recovery attempt failed for error ${nerfError.id}:`, recoveryError);
    }
    
    return false;
  }

  /**
   * Initialize recovery strategies for different error categories
   */
  private initializeRecoveryStrategies(): void {
    // WebGPU recovery strategy
    this.recoveryStrategies.set(ErrorCategory.WEBGPU, {
      category: ErrorCategory.WEBGPU,
      maxAttempts: 3,
      backoffMs: 1000,
      strategy: async () => {
        try {
          // Test WebGPU availability
          if (navigator.gpu) {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
              return true;
            }
          }
          return false;
        } catch {
          return false;
        }
      }
    });

    // Memory recovery strategy
    this.recoveryStrategies.set(ErrorCategory.MEMORY, {
      category: ErrorCategory.MEMORY,
      maxAttempts: 2,
      backoffMs: 2000,
      strategy: async () => {
        try {
          // Force garbage collection if available
          if (typeof window !== 'undefined' && (window as any).gc) {
            (window as any).gc();
          }
          return true;
        } catch {
          return false;
        }
      }
    });

    // Network recovery strategy
    this.recoveryStrategies.set(ErrorCategory.NETWORK, {
      category: ErrorCategory.NETWORK,
      maxAttempts: 3,
      backoffMs: 2000,
      strategy: async () => {
        try {
          // Test connectivity
          await fetch('/favicon.ico', { method: 'HEAD' });
          return true;
        } catch {
          return false;
        }
      }
    });
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason || 'Unhandled promise rejection',
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        {
          component: 'global',
          operation: 'promise_rejection'
        }
      );
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(
        event.error || event.message,
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        {
          component: 'global',
          operation: 'uncaught_error'
        }
      );
    });
  }

  /**
   * Log error with appropriate severity
   */
  private logError(error: NerfError): void {
    const logMessage = `[${error.severity.toUpperCase()}] ${error.category}: ${error.message} (${error.id})`;
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨', logMessage);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌', logMessage);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️', logMessage);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️', logMessage);
        break;
    }

    if (error.stack) {
      console.debug('Stack trace:', error.stack);
    }
  }

  /**
   * Report error to telemetry service
   */
  private async reportToTelemetry(error: NerfError): Promise<void> {
    if (error.reportedToTelemetry) return;
    
    try {
      // Only report medium+ severity errors to reduce noise
      if (error.severity === ErrorSeverity.LOW) {
        return;
      }

      const telemetryData = {
        errorId: error.id,
        message: error.message,
        category: error.category,
        severity: error.severity,
        context: error.context,
        stack: error.stack?.substring(0, 1000), // Limit stack trace size
        userAgent: navigator.userAgent,
        timestamp: error.context.timestamp
      };

      // In a real implementation, you'd send this to your telemetry service
      console.debug('📊 Telemetry data:', telemetryData);
      
      error.reportedToTelemetry = true;
    } catch (telemetryError) {
      console.error('Failed to report error to telemetry:', telemetryError);
    }
  }

  /**
   * Emit custom error event for UI integration
   */
  private emitErrorEvent(error: NerfError): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nerf-error', { detail: error }));
    }
  }

  /**
   * Emit recovery success event
   */
  private emitRecoveryEvent(error: NerfError): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nerf-error-recovered', { detail: error }));
    }
  }

  /**
   * Get device information for context
   */
  private getDeviceInfo(): ErrorContext['deviceInfo'] {
    if (typeof navigator === 'undefined') return undefined;

    return {
      userAgent: navigator.userAgent,
      memory: (navigator as any).deviceMemory || undefined
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `nerf_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    this.errorCount++;
    return `error_${this.sessionId}_${this.errorCount}_${Date.now()}`;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recoveryRate: number;
  } {
    const errors = Array.from(this.errors.values());
    
    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory[category] = 0;
    });

    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    let recoveredCount = 0;

    errors.forEach(error => {
      errorsByCategory[error.category]++;
      errorsBySeverity[error.severity]++;
      if (error.recovered) recoveredCount++;
    });

    const recoveryRate = errors.length > 0 ? recoveredCount / errors.length : 0;

    return {
      totalErrors: errors.length,
      errorsByCategory,
      errorsBySeverity,
      recoveryRate
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(minutes: number = 10): NerfError[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return Array.from(this.errors.values())
      .filter(error => error.context.timestamp >= cutoffTime)
      .sort((a, b) => b.context.timestamp - a.context.timestamp);
  }

  /**
   * Cleanup old errors
   */
  cleanup(olderThanMinutes: number = 60): void {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);
    
    for (const [id, error] of this.errors.entries()) {
      if (error.context.timestamp < cutoffTime) {
        this.errors.delete(id);
      }
    }
  }

  /**
   * Dispose of error handler
   */
  dispose(): void {
    this.errors.clear();
    this.recoveryStrategies.clear();
    console.log('🧹 Enhanced Error Handler disposed');
  }
}

// Global error handler instance
export const enhancedErrorHandler = new EnhancedErrorHandler();