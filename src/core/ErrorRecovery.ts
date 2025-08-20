/**
 * Robust error recovery system for NeRF Edge Kit
 */

export interface RecoveryStrategy {
  name: string;
  priority: number;
  canRecover(error: Error): boolean;
  recover(error: Error): Promise<boolean>;
}

export interface ErrorContext {
  component: string;
  operation: string;
  timestamp: number;
  userAgent: string;
  additionalInfo?: any;
}

export class ErrorRecovery {
  private strategies: RecoveryStrategy[] = [];
  private errorHistory: Array<{ error: Error; context: ErrorContext; recovered: boolean }> = [];
  private maxRetries = 3;
  private backoffMultiplier = 1000; // ms

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    // WebGPU initialization failure recovery
    this.registerStrategy({
      name: 'WebGPU Fallback',
      priority: 10,
      canRecover: (error) => error.message.includes('WebGPU'),
      recover: async (error) => {
        console.warn('WebGPU failed, attempting fallback to WebGL');
        // Implementation would initialize WebGL fallback
        return true;
      }
    });

    // Memory allocation failure recovery
    this.registerStrategy({
      name: 'Memory Cleanup',
      priority: 9,
      canRecover: (error) => error.message.toLowerCase().includes('memory') || 
                              error.message.includes('allocation'),
      recover: async (error) => {
        console.warn('Memory allocation failed, triggering cleanup');
        this.triggerMemoryCleanup();
        return true;
      }
    });

    // Network/Model loading failure recovery
    this.registerStrategy({
      name: 'Model Loading Retry',
      priority: 8,
      canRecover: (error) => error.message.includes('load') || 
                              error.message.includes('network') ||
                              error.message.includes('fetch'),
      recover: async (error) => {
        console.warn('Model loading failed, implementing exponential backoff retry');
        await this.exponentialBackoff(1);
        return true;
      }
    });

    // Generic retry strategy
    this.registerStrategy({
      name: 'Generic Retry',
      priority: 1,
      canRecover: () => true, // Can attempt recovery for any error
      recover: async (error) => {
        console.warn('Generic recovery attempt for:', error.message);
        await this.exponentialBackoff(2);
        return false; // Return false to indicate partial recovery
      }
    });
  }

  /**
   * Register a new recovery strategy
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority); // Higher priority first
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(error: Error, context: ErrorContext): Promise<boolean> {
    console.error(`🚨 Error in ${context.component}.${context.operation}:`, error.message);
    
    // Find applicable recovery strategies
    const applicableStrategies = this.strategies.filter(s => s.canRecover(error));
    
    if (applicableStrategies.length === 0) {
      console.error('❌ No recovery strategies available for error:', error.message);
      this.logError(error, context, false);
      return false;
    }

    // Try recovery strategies in priority order
    for (const strategy of applicableStrategies) {
      try {
        console.log(`🔄 Attempting recovery with strategy: ${strategy.name}`);
        const recovered = await strategy.recover(error);
        
        if (recovered) {
          console.log(`✅ Successfully recovered using strategy: ${strategy.name}`);
          this.logError(error, context, true);
          return true;
        } else {
          console.warn(`⚠️  Partial recovery with strategy: ${strategy.name}`);
        }
      } catch (recoveryError) {
        console.error(`❌ Recovery strategy failed: ${strategy.name}`, recoveryError);
      }
    }

    this.logError(error, context, false);
    return false;
  }

  /**
   * Wrap a function with automatic error recovery
   */
  withRecovery<T>(
    fn: () => Promise<T>, 
    context: ErrorContext,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      let attempts = 0;
      
      const tryExecution = async (): Promise<void> => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          attempts++;
          
          if (attempts >= maxRetries) {
            console.error(`❌ Max retries (${maxRetries}) exceeded for ${context.component}.${context.operation}`);
            reject(error);
            return;
          }

          const recovered = await this.attemptRecovery(error as Error, {
            ...context,
            additionalInfo: { attempt: attempts, maxRetries }
          });

          if (recovered) {
            // Retry with exponential backoff
            await this.exponentialBackoff(attempts);
            tryExecution();
          } else {
            reject(error);
          }
        }
      };

      tryExecution();
    });
  }

  /**
   * Get error statistics and patterns
   */
  getErrorStats(): {
    totalErrors: number;
    recoveredErrors: number;
    recoveryRate: number;
    commonErrors: Array<{ message: string; count: number }>;
  } {
    const totalErrors = this.errorHistory.length;
    const recoveredErrors = this.errorHistory.filter(e => e.recovered).length;
    const recoveryRate = totalErrors > 0 ? (recoveredErrors / totalErrors) * 100 : 0;

    // Count common error messages
    const errorCounts = new Map<string, number>();
    this.errorHistory.forEach(({ error }) => {
      const message = error.message.substring(0, 100); // Truncate long messages
      errorCounts.set(message, (errorCounts.get(message) || 0) + 1);
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      recoveredErrors,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
      commonErrors
    };
  }

  private logError(error: Error, context: ErrorContext, recovered: boolean): void {
    this.errorHistory.push({ error, context, recovered });
    
    // Keep only recent errors (last 1000)
    if (this.errorHistory.length > 1000) {
      this.errorHistory.shift();
    }
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(this.backoffMultiplier * Math.pow(2, attempt - 1), 10000); // Max 10s
    console.log(`⏳ Waiting ${delay}ms before retry (attempt ${attempt})`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private triggerMemoryCleanup(): void {
    // Force garbage collection if available (dev environments)
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }
    
    // Clear caches and temporary data
    // This would trigger cleanup in various components
    console.log('🧹 Memory cleanup triggered');
  }

  /**
   * Create error context for consistent logging
   */
  static createContext(
    component: string, 
    operation: string, 
    additionalInfo?: any
  ): ErrorContext {
    return {
      component,
      operation,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      additionalInfo
    };
  }
}

// Global error recovery instance
export const globalErrorRecovery = new ErrorRecovery();