/**
 * Advanced Resilience Manager
 * Comprehensive error handling and system resilience for NeRF Edge Kit
 */

import { PerformanceMetrics } from './types';

export interface ResilienceConfig {
  maxRetries: number;
  retryBackoffMs: number;
  circuitBreakerThreshold: number;
  healthCheckInterval: number;
  fallbackQuality: number; // 0-1
  gracefulDegradation: boolean;
  errorReporting: boolean;
  autoRecovery: boolean;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical' | 'failed';
  components: {
    renderer: ComponentHealth;
    neural: ComponentHealth;
    quantum: ComponentHealth;
    memory: ComponentHealth;
    gpu: ComponentHealth;
    network: ComponentHealth;
  };
  timestamp: number;
  uptime: number;
}

export interface ComponentHealth {
  status: 'healthy' | 'warning' | 'error' | 'offline';
  lastError?: Error;
  errorCount: number;
  lastCheck: number;
  responseTime: number;
  memoryUsage: number;
  isCircuitOpen: boolean;
}

export interface ErrorContext {
  component: string;
  operation: string;
  parameters?: any;
  stackTrace: string;
  userAgent?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'restart' | 'isolate' | 'scale_down';
  component: string;
  priority: number;
  estimatedTime: number; // ms
  successProbability: number; // 0-1
}

/**
 * Advanced Resilience Manager for system reliability
 */
export class AdvancedResilienceManager {
  private config: ResilienceConfig;
  private systemHealth: SystemHealth;
  private errorHistory: ErrorContext[] = [];
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private recoveryQueue: RecoveryAction[] = [];
  private healthCheckTimer: number = 0;
  private errorAnalyzer: ErrorAnalyzer;
  private adaptiveThresholds: AdaptiveThresholds;

  constructor(config: ResilienceConfig) {
    this.config = config;
    this.systemHealth = this.initializeSystemHealth();
    this.errorAnalyzer = new ErrorAnalyzer();
    this.adaptiveThresholds = new AdaptiveThresholds();
    this.initializeCircuitBreakers();
  }

  /**
   * Initialize resilience monitoring
   */
  async initialize(): Promise<void> {
    console.log('Initializing Advanced Resilience Manager...');
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Initialize error collection
    this.setupErrorHandlers();
    
    // Configure auto-recovery
    if (this.config.autoRecovery) {
      this.startAutoRecovery();
    }

    console.log('Advanced Resilience Manager initialized');
  }

  /**
   * Handle errors with intelligent recovery strategies
   */
  async handleError(error: Error, context: Partial<ErrorContext>): Promise<boolean> {
    const errorContext: ErrorContext = {
      component: context.component || 'unknown',
      operation: context.operation || 'unknown',
      parameters: context.parameters,
      stackTrace: error.stack || '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      timestamp: Date.now(),
      severity: this.assessErrorSeverity(error, context)
    };

    // Record error
    this.recordError(errorContext);
    
    // Update component health
    this.updateComponentHealth(errorContext.component, 'error', error);
    
    // Analyze error pattern
    const analysis = this.errorAnalyzer.analyzeError(errorContext, this.errorHistory);
    
    // Determine recovery strategy
    const recoveryActions = this.determineRecoveryActions(errorContext, analysis);
    
    // Execute recovery
    const recovered = await this.executeRecovery(recoveryActions);
    
    // Report if configured
    if (this.config.errorReporting) {
      await this.reportError(errorContext, analysis, recoveryActions);
    }

    return recovered;
  }

  /**
   * Execute operation with resilience wrapper
   */
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    component: string,
    operationName: string,
    options?: {
      timeout?: number;
      retries?: number;
      fallback?: () => Promise<T>;
    }
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(component);
    
    if (circuitBreaker.isOpen()) {
      if (options?.fallback) {
        console.warn(`Circuit breaker open for ${component}, using fallback`);
        return options.fallback();
      }
      throw new Error(`Circuit breaker open for ${component}`);
    }

    const maxRetries = options?.retries ?? this.config.maxRetries;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = performance.now();
        
        // Add timeout wrapper
        const result = options?.timeout 
          ? await this.withTimeout(operation(), options.timeout)
          : await operation();
        
        const responseTime = performance.now() - startTime;
        
        // Record success
        circuitBreaker.recordSuccess();
        this.updateComponentHealth(component, 'healthy', undefined, responseTime);
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // Record failure
        circuitBreaker.recordFailure();
        
        const shouldRetry = attempt < maxRetries && this.shouldRetryError(error as Error);
        
        if (!shouldRetry) {
          break;
        }

        // Exponential backoff
        const backoffTime = this.config.retryBackoffMs * Math.pow(2, attempt);
        await this.sleep(backoffTime);
      }
    }

    // All retries failed
    const errorHandled = await this.handleError(lastError!, {
      component,
      operation: operationName,
      severity: 'high'
    });

    if (options?.fallback && !errorHandled) {
      console.warn(`Operation failed for ${component}, using fallback`);
      return options.fallback();
    }

    throw lastError!;
  }

  /**
   * Graceful degradation based on system health
   */
  async gracefulDegradation(): Promise<{
    qualityLevel: number;
    disabledFeatures: string[];
    estimatedRecoveryTime: number;
  }> {
    if (!this.config.gracefulDegradation) {
      return {
        qualityLevel: 1.0,
        disabledFeatures: [],
        estimatedRecoveryTime: 0
      };
    }

    const health = this.getSystemHealth();
    const degradationLevel = this.calculateDegradationLevel(health);
    
    const qualityLevel = Math.max(this.config.fallbackQuality, 1 - degradationLevel);
    const disabledFeatures = this.determineFeaturesToDisable(health, degradationLevel);
    const estimatedRecoveryTime = this.estimateRecoveryTime(health);

    // Apply degradation
    await this.applyDegradation(qualityLevel, disabledFeatures);

    return {
      qualityLevel,
      disabledFeatures,
      estimatedRecoveryTime
    };
  }

  /**
   * Predictive failure detection
   */
  async predictiveFailureDetection(): Promise<{
    riskLevel: number; // 0-1
    predictedFailures: string[];
    recommendedActions: string[];
    timeToFailure: number; // ms
  }> {
    const currentHealth = this.getSystemHealth();
    const recentErrors = this.errorHistory.slice(-50);
    
    const riskAssessment = this.errorAnalyzer.assessFailureRisk(currentHealth, recentErrors);
    
    return {
      riskLevel: riskAssessment.riskLevel,
      predictedFailures: riskAssessment.likelyFailures,
      recommendedActions: riskAssessment.recommendations,
      timeToFailure: riskAssessment.estimatedTimeToFailure
    };
  }

  /**
   * Get comprehensive system health
   */
  getSystemHealth(): SystemHealth {
    return { ...this.systemHealth };
  }

  /**
   * Get resilience metrics
   */
  getResilienceMetrics(): PerformanceMetrics & {
    errorRate: number;
    recoverySuccessRate: number;
    meanTimeToRecovery: number;
    circuitBreakerTrips: number;
    systemReliability: number;
  } {
    const recentErrors = this.errorHistory.slice(-100);
    const recentTime = Date.now() - 60000; // Last minute
    const recentErrorCount = recentErrors.filter(e => e.timestamp > recentTime).length;
    
    const totalRecoveries = this.recoveryQueue.length;
    const successfulRecoveries = this.recoveryQueue.filter(r => r.successProbability > 0.8).length;
    
    const circuitBreakerTrips = Array.from(this.circuitBreakers.values())
      .reduce((sum, cb) => sum + cb.getFailureCount(), 0);

    return {
      fps: this.calculateSystemFPS(),
      frameTime: this.calculateAverageFrameTime(),
      gpuUtilization: this.systemHealth.components.gpu.responseTime,
      memoryUsage: this.calculateTotalMemoryUsage(),
      powerConsumption: this.estimatePowerConsumption(),
      errorRate: recentErrorCount / 60, // Errors per second
      recoverySuccessRate: totalRecoveries > 0 ? successfulRecoveries / totalRecoveries : 1,
      meanTimeToRecovery: this.calculateMeanTimeToRecovery(),
      circuitBreakerTrips,
      systemReliability: this.calculateSystemReliability()
    };
  }

  private initializeSystemHealth(): SystemHealth {
    const now = Date.now();
    return {
      overall: 'healthy',
      components: {
        renderer: this.createHealthyComponent(),
        neural: this.createHealthyComponent(),
        quantum: this.createHealthyComponent(),
        memory: this.createHealthyComponent(),
        gpu: this.createHealthyComponent(),
        network: this.createHealthyComponent()
      },
      timestamp: now,
      uptime: 0
    };
  }

  private createHealthyComponent(): ComponentHealth {
    return {
      status: 'healthy',
      errorCount: 0,
      lastCheck: Date.now(),
      responseTime: 0,
      memoryUsage: 0,
      isCircuitOpen: false
    };
  }

  private initializeCircuitBreakers(): void {
    const components = ['renderer', 'neural', 'quantum', 'memory', 'gpu', 'network'];
    
    for (const component of components) {
      this.circuitBreakers.set(component, new CircuitBreaker({
        failureThreshold: this.config.circuitBreakerThreshold,
        resetTimeout: 30000, // 30 seconds
        monitoringPeriod: 60000 // 1 minute
      }));
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval) as unknown as number;
  }

  private async performHealthCheck(): Promise<void> {
    const components = Object.keys(this.systemHealth.components) as Array<keyof SystemHealth['components']>;
    
    for (const component of components) {
      try {
        const health = await this.checkComponentHealth(component);
        this.systemHealth.components[component] = health;
      } catch (error) {
        this.updateComponentHealth(component, 'error', error as Error);
      }
    }

    // Update overall health
    this.systemHealth.overall = this.calculateOverallHealth();
    this.systemHealth.timestamp = Date.now();
    this.systemHealth.uptime = Date.now() - (this.systemHealth.timestamp - this.systemHealth.uptime);
  }

  private async checkComponentHealth(component: keyof SystemHealth['components']): Promise<ComponentHealth> {
    const startTime = performance.now();
    
    // Component-specific health checks
    switch (component) {
      case 'renderer':
        return this.checkRendererHealth();
      case 'neural':
        return this.checkNeuralHealth();
      case 'quantum':
        return this.checkQuantumHealth();
      case 'memory':
        return this.checkMemoryHealth();
      case 'gpu':
        return this.checkGPUHealth();
      case 'network':
        return this.checkNetworkHealth();
      default:
        return this.createHealthyComponent();
    }
  }

  private async checkRendererHealth(): Promise<ComponentHealth> {
    // Mock renderer health check
    const responseTime = Math.random() * 10;
    const memoryUsage = Math.random() * 100;
    
    return {
      status: responseTime < 16.67 ? 'healthy' : 'warning',
      errorCount: 0,
      lastCheck: Date.now(),
      responseTime,
      memoryUsage,
      isCircuitOpen: false
    };
  }

  private async checkNeuralHealth(): Promise<ComponentHealth> {
    // Mock neural network health check
    const responseTime = Math.random() * 50;
    const memoryUsage = Math.random() * 200;
    
    return {
      status: responseTime < 100 ? 'healthy' : 'warning',
      errorCount: 0,
      lastCheck: Date.now(),
      responseTime,
      memoryUsage,
      isCircuitOpen: false
    };
  }

  private async checkQuantumHealth(): Promise<ComponentHealth> {
    // Mock quantum optimizer health check
    const responseTime = Math.random() * 20;
    const memoryUsage = Math.random() * 50;
    
    return {
      status: 'healthy',
      errorCount: 0,
      lastCheck: Date.now(),
      responseTime,
      memoryUsage,
      isCircuitOpen: false
    };
  }

  private async checkMemoryHealth(): Promise<ComponentHealth> {
    // Mock memory health check
    const memoryUsage = Math.random() * 1000;
    
    return {
      status: memoryUsage < 800 ? 'healthy' : 'warning',
      errorCount: 0,
      lastCheck: Date.now(),
      responseTime: 1,
      memoryUsage,
      isCircuitOpen: false
    };
  }

  private async checkGPUHealth(): Promise<ComponentHealth> {
    // Mock GPU health check
    const utilization = Math.random() * 100;
    const temperature = 60 + Math.random() * 30;
    
    return {
      status: temperature < 85 ? 'healthy' : 'warning',
      errorCount: 0,
      lastCheck: Date.now(),
      responseTime: utilization,
      memoryUsage: Math.random() * 500,
      isCircuitOpen: false
    };
  }

  private async checkNetworkHealth(): Promise<ComponentHealth> {
    // Mock network health check
    const latency = Math.random() * 100;
    
    return {
      status: latency < 50 ? 'healthy' : 'warning',
      errorCount: 0,
      lastCheck: Date.now(),
      responseTime: latency,
      memoryUsage: 0,
      isCircuitOpen: false
    };
  }

  private calculateOverallHealth(): SystemHealth['overall'] {
    const components = Object.values(this.systemHealth.components);
    const errorCount = components.filter(c => c.status === 'error').length;
    const warningCount = components.filter(c => c.status === 'warning').length;
    
    if (errorCount > 2) return 'failed';
    if (errorCount > 0) return 'critical';
    if (warningCount > 2) return 'degraded';
    return 'healthy';
  }

  private setupErrorHandlers(): void {
    // Global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError(new Error(event.message), {
          component: 'global',
          operation: 'window_error',
          severity: 'medium'
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(new Error(event.reason), {
          component: 'global',
          operation: 'unhandled_promise',
          severity: 'high'
        });
      });
    }
  }

  private startAutoRecovery(): void {
    setInterval(async () => {
      if (this.recoveryQueue.length > 0) {
        await this.processRecoveryQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  private recordError(errorContext: ErrorContext): void {
    this.errorHistory.push(errorContext);
    
    // Keep only recent errors (last 1000)
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-1000);
    }
  }

  private updateComponentHealth(
    component: string,
    status: ComponentHealth['status'],
    error?: Error,
    responseTime?: number
  ): void {
    const comp = this.systemHealth.components[component as keyof SystemHealth['components']];
    if (comp) {
      comp.status = status;
      comp.lastCheck = Date.now();
      if (error) {
        comp.lastError = error;
        comp.errorCount++;
      }
      if (responseTime !== undefined) {
        comp.responseTime = responseTime;
      }
    }
  }

  private assessErrorSeverity(error: Error, context: Partial<ErrorContext>): ErrorContext['severity'] {
    // Basic severity assessment
    if (error.message.includes('OutOfMemory') || error.message.includes('GPU')) {
      return 'critical';
    }
    if (error.message.includes('Network') || error.message.includes('Timeout')) {
      return 'medium';
    }
    if (context.component === 'renderer') {
      return 'high';
    }
    return 'low';
  }

  private determineRecoveryActions(errorContext: ErrorContext, analysis: any): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    
    // Basic recovery strategy
    switch (errorContext.severity) {
      case 'critical':
        actions.push({
          type: 'restart',
          component: errorContext.component,
          priority: 1,
          estimatedTime: 5000,
          successProbability: 0.8
        });
        break;
      case 'high':
        actions.push({
          type: 'fallback',
          component: errorContext.component,
          priority: 2,
          estimatedTime: 1000,
          successProbability: 0.9
        });
        break;
      default:
        actions.push({
          type: 'retry',
          component: errorContext.component,
          priority: 3,
          estimatedTime: 500,
          successProbability: 0.7
        });
    }

    return actions;
  }

  private async executeRecovery(actions: RecoveryAction[]): Promise<boolean> {
    // Sort by priority
    actions.sort((a, b) => a.priority - b.priority);
    
    for (const action of actions) {
      try {
        const success = await this.executeRecoveryAction(action);
        if (success) {
          return true;
        }
      } catch (error) {
        console.error(`Recovery action ${action.type} failed:`, error);
      }
    }
    
    return false;
  }

  private async executeRecoveryAction(action: RecoveryAction): Promise<boolean> {
    console.log(`Executing recovery action: ${action.type} for ${action.component}`);
    
    switch (action.type) {
      case 'retry':
        // Just wait and hope for the best
        await this.sleep(100);
        return Math.random() > 0.3;
      
      case 'fallback':
        // Reduce quality or disable features
        await this.applyFallback(action.component);
        return true;
      
      case 'restart':
        // Restart component
        await this.restartComponent(action.component);
        return true;
      
      case 'isolate':
        // Isolate failing component
        await this.isolateComponent(action.component);
        return true;
      
      default:
        return false;
    }
  }

  private async reportError(errorContext: ErrorContext, analysis: any, actions: RecoveryAction[]): Promise<void> {
    // Mock error reporting
    console.log('Error Report:', {
      error: errorContext,
      analysis,
      recovery: actions
    });
  }

  private getCircuitBreaker(component: string): CircuitBreaker {
    return this.circuitBreakers.get(component) || this.circuitBreakers.values().next().value;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ]);
  }

  private shouldRetryError(error: Error): boolean {
    // Don't retry certain types of errors
    if (error.message.includes('Auth') || error.message.includes('Permission')) {
      return false;
    }
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDegradationLevel(health: SystemHealth): number {
    const components = Object.values(health.components);
    const errorCount = components.filter(c => c.status === 'error').length;
    const warningCount = components.filter(c => c.status === 'warning').length;
    
    return (errorCount * 0.3 + warningCount * 0.1) / components.length;
  }

  private determineFeaturesToDisable(health: SystemHealth, degradationLevel: number): string[] {
    const features: string[] = [];
    
    if (degradationLevel > 0.3) {
      features.push('advanced_lighting', 'high_resolution');
    }
    if (degradationLevel > 0.5) {
      features.push('neural_enhancement', 'quantum_optimization');
    }
    if (degradationLevel > 0.7) {
      features.push('real_time_rendering');
    }
    
    return features;
  }

  private estimateRecoveryTime(health: SystemHealth): number {
    const components = Object.values(health.components);
    const errorCount = components.filter(c => c.status === 'error').length;
    
    return errorCount * 10000; // 10 seconds per error
  }

  private async applyDegradation(qualityLevel: number, disabledFeatures: string[]): Promise<void> {
    console.log(`Applying graceful degradation: quality=${qualityLevel}, disabled=${disabledFeatures.join(',')}`);
  }

  private async applyFallback(component: string): Promise<void> {
    console.log(`Applying fallback for component: ${component}`);
  }

  private async restartComponent(component: string): Promise<void> {
    console.log(`Restarting component: ${component}`);
    await this.sleep(1000);
  }

  private async isolateComponent(component: string): Promise<void> {
    console.log(`Isolating component: ${component}`);
  }

  private async processRecoveryQueue(): Promise<void> {
    const action = this.recoveryQueue.shift();
    if (action) {
      await this.executeRecoveryAction(action);
    }
  }

  private calculateSystemFPS(): number {
    const renderHealth = this.systemHealth.components.renderer;
    return renderHealth.responseTime > 0 ? 1000 / renderHealth.responseTime : 60;
  }

  private calculateAverageFrameTime(): number {
    const renderHealth = this.systemHealth.components.renderer;
    return renderHealth.responseTime || 16.67;
  }

  private calculateTotalMemoryUsage(): number {
    return Object.values(this.systemHealth.components)
      .reduce((sum, comp) => sum + comp.memoryUsage, 0);
  }

  private estimatePowerConsumption(): number {
    const gpuUtil = this.systemHealth.components.gpu.responseTime;
    return 5 + (gpuUtil / 100) * 10; // Base 5W + GPU scaling
  }

  private calculateMeanTimeToRecovery(): number {
    if (this.recoveryQueue.length === 0) return 0;
    return this.recoveryQueue.reduce((sum, action) => sum + action.estimatedTime, 0) / this.recoveryQueue.length;
  }

  private calculateSystemReliability(): number {
    const uptime = this.systemHealth.uptime;
    const errorCount = this.errorHistory.length;
    
    if (uptime === 0) return 1;
    return Math.max(0, 1 - (errorCount / (uptime / 60000))); // Errors per minute
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = 0;
    }
    
    this.circuitBreakers.clear();
    this.errorHistory = [];
    this.recoveryQueue = [];
    
    console.log('Advanced Resilience Manager disposed');
  }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(private config: {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
  }) {}

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * Error Analysis Engine
 */
class ErrorAnalyzer {
  analyzeError(error: ErrorContext, history: ErrorContext[]): any {
    const similarErrors = history.filter(e => 
      e.component === error.component && 
      e.operation === error.operation
    );

    return {
      frequency: similarErrors.length,
      pattern: this.detectPattern(similarErrors),
      recommendation: this.generateRecommendation(error, similarErrors)
    };
  }

  assessFailureRisk(health: SystemHealth, errors: ErrorContext[]): {
    riskLevel: number;
    likelyFailures: string[];
    recommendations: string[];
    estimatedTimeToFailure: number;
  } {
    const recentErrorCount = errors.filter(e => Date.now() - e.timestamp < 300000).length; // Last 5 minutes
    const componentErrors = this.groupErrorsByComponent(errors);
    
    const riskLevel = Math.min(1, recentErrorCount / 10);
    const likelyFailures = Object.keys(componentErrors)
      .filter(comp => componentErrors[comp].length > 3)
      .slice(0, 3);

    return {
      riskLevel,
      likelyFailures,
      recommendations: this.generateRiskRecommendations(riskLevel, likelyFailures),
      estimatedTimeToFailure: riskLevel > 0.7 ? 300000 : Infinity // 5 minutes if high risk
    };
  }

  private detectPattern(errors: ErrorContext[]): string {
    if (errors.length < 2) return 'none';
    
    const timeIntervals = errors.slice(1).map((e, i) => e.timestamp - errors[i].timestamp);
    const avgInterval = timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length;
    
    if (avgInterval < 60000) return 'frequent';
    if (avgInterval < 300000) return 'periodic';
    return 'sporadic';
  }

  private generateRecommendation(error: ErrorContext, similar: ErrorContext[]): string {
    if (similar.length > 5) {
      return 'Consider component isolation or replacement';
    }
    if (error.severity === 'critical') {
      return 'Immediate intervention required';
    }
    return 'Monitor and retry';
  }

  private groupErrorsByComponent(errors: ErrorContext[]): Record<string, ErrorContext[]> {
    return errors.reduce((groups, error) => {
      if (!groups[error.component]) {
        groups[error.component] = [];
      }
      groups[error.component].push(error);
      return groups;
    }, {} as Record<string, ErrorContext[]>);
  }

  private generateRiskRecommendations(riskLevel: number, likelyFailures: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel > 0.7) {
      recommendations.push('Enable graceful degradation immediately');
      recommendations.push('Prepare for emergency fallback');
    }
    
    if (likelyFailures.length > 0) {
      recommendations.push(`Focus monitoring on: ${likelyFailures.join(', ')}`);
    }
    
    return recommendations;
  }
}

/**
 * Adaptive Thresholds Manager
 */
class AdaptiveThresholds {
  private thresholds: Map<string, number> = new Map();
  
  updateThreshold(metric: string, value: number, performance: number): void {
    const current = this.thresholds.get(metric) || value;
    
    // Adapt threshold based on performance
    if (performance > 0.9) {
      // Good performance, can be more aggressive
      this.thresholds.set(metric, current * 0.95);
    } else if (performance < 0.7) {
      // Poor performance, be more conservative
      this.thresholds.set(metric, current * 1.05);
    }
  }

  getThreshold(metric: string, defaultValue: number): number {
    return this.thresholds.get(metric) || defaultValue;
  }
}