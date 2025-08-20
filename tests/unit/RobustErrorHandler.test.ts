import { RobustErrorHandler, ErrorCategory, ErrorSeverity } from '../../src/core/RobustErrorHandler';

describe('RobustErrorHandler', () => {
  let errorHandler: RobustErrorHandler;

  beforeEach(() => {
    errorHandler = new RobustErrorHandler({ enableDelays: false });
  });

  afterEach(() => {
    errorHandler.clearErrors();
  });

  describe('error handling', () => {
    it('should handle low severity errors with recovery', async () => {
      const result = await errorHandler.handleError(
        ErrorCategory.RENDERING,
        ErrorSeverity.LOW,
        'Minor rendering issue',
        { frameSkipped: true }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('quality reduced');
    });

    it('should handle memory errors with cleanup', async () => {
      const result = await errorHandler.handleError(
        ErrorCategory.MEMORY,
        ErrorSeverity.MEDIUM,
        'Memory usage high',
        { memoryUsage: '90%' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Memory cleanup performed');
    });

    it('should not recover from critical errors', async () => {
      const result = await errorHandler.handleError(
        ErrorCategory.INITIALIZATION,
        ErrorSeverity.CRITICAL,
        'System initialization failed',
        { error: 'WebGPU not supported' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Critical error cannot be recovered');
    });

    it('should handle network errors with exponential backoff', async () => {
      const result = await errorHandler.handleError(
        ErrorCategory.NETWORK,
        ErrorSeverity.MEDIUM,
        'Network request failed',
        { retryCount: 1 }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Network retry scheduled');
      expect(result.newContext?.retryCount).toBe(2);
    });
  });

  describe('error statistics', () => {
    it('should track error statistics', async () => {
      await errorHandler.handleError(ErrorCategory.RENDERING, ErrorSeverity.LOW, 'Test error 1');
      await errorHandler.handleError(ErrorCategory.MEMORY, ErrorSeverity.MEDIUM, 'Test error 2');
      await errorHandler.handleError(ErrorCategory.RENDERING, ErrorSeverity.HIGH, 'Test error 3');

      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCategory[ErrorCategory.RENDERING]).toBe(2);
      expect(stats.errorsByCategory[ErrorCategory.MEMORY]).toBe(1);
      expect(stats.recentErrors).toHaveLength(3);
      expect(stats.systemHealth).toBe('healthy');
    });

    it('should assess system health correctly', async () => {
      // Generate many errors to trigger warning state
      for (let i = 0; i < 6; i++) {
        await errorHandler.handleError(ErrorCategory.PERFORMANCE, ErrorSeverity.MEDIUM, `Error ${i}`);
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.systemHealth).toBe('warning');
    });

    it('should clear error history', async () => {
      await errorHandler.handleError(ErrorCategory.RENDERING, ErrorSeverity.LOW, 'Test error');
      
      let stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);

      errorHandler.clearErrors();
      
      stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.systemHealth).toBe('healthy');
    });
  });

  describe('custom recovery strategies', () => {
    it('should allow adding custom recovery strategies', async () => {
      let customStrategyExecuted = false;

      errorHandler.addRecoveryStrategy(ErrorCategory.VALIDATION, async (error) => {
        customStrategyExecuted = true;
        return {
          success: true,
          message: 'Custom validation recovery applied',
          appliedStrategy: 'custom_validation_fix'
        };
      });

      const result = await errorHandler.handleError(
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        'Validation failed'
      );

      expect(customStrategyExecuted).toBe(true);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Custom validation recovery applied');
    });

    it('should try multiple strategies if first ones fail', async () => {
      const executionOrder: number[] = [];

      // Add failing strategy first
      errorHandler.addRecoveryStrategy(ErrorCategory.QUANTUM, async () => {
        executionOrder.push(1);
        return { success: false, message: 'First strategy failed' };
      });

      // Add succeeding strategy second
      errorHandler.addRecoveryStrategy(ErrorCategory.QUANTUM, async () => {
        executionOrder.push(2);
        return { success: true, message: 'Second strategy succeeded' };
      });

      const result = await errorHandler.handleError(
        ErrorCategory.QUANTUM,
        ErrorSeverity.HIGH,
        'Quantum decoherence detected'
      );

      expect(executionOrder).toEqual([1, 2]);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Second strategy succeeded');
    });
  });
});