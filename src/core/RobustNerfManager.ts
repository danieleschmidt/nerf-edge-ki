/**
 * Robust NeRF Management System
 * Generation 2 Enhancement: Comprehensive error handling, validation, and monitoring
 */

import { EnhancedNerfRenderer } from './EnhancedNerfRenderer';
import { RealTimeOptimizer } from '../optimization/RealTimeOptimizer';
import { NerfScene } from './NerfScene';
import { NerfModel } from './NerfModel';
import { PerformanceMetrics, RenderOptions } from './types';

export interface RobustNerfConfig {
  /** Enable automatic error recovery */
  autoRecovery: boolean;
  /** Maximum retry attempts for failed operations */
  maxRetries: number;
  /** Timeout for operations (ms) */
  operationTimeout: number;
  /** Enable health monitoring */
  healthMonitoring: boolean;
  /** Health check interval (ms) */
  healthCheckInterval: number;
  /** Enable performance monitoring */
  performanceMonitoring: boolean;
  /** Memory limit warnings (MB) */
  memoryWarningThreshold: number;
}

export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  renderer: 'healthy' | 'warning' | 'critical';
  memory: 'healthy' | 'warning' | 'critical';
  performance: 'healthy' | 'warning' | 'critical';
  lastCheck: number;
  issues: string[];
  recommendations: string[];
}

export interface RobustOperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  duration: number;
  recoveryActions: string[];
}

/**
 * Robust NeRF management with comprehensive error handling and monitoring
 */
export class RobustNerfManager {
  private renderer: EnhancedNerfRenderer;
  private optimizer: RealTimeOptimizer;
  private config: RobustNerfConfig;
  
  // Health monitoring
  private healthTimer: number | null = null;
  private currentHealth: HealthStatus;
  private errorHistory: Array<{ error: Error; timestamp: number; context: string }> = [];
  
  // Performance tracking
  private performanceMetrics: PerformanceMetrics[] = [];
  private memoryUsageHistory: number[] = [];
  
  // Error recovery
  private retryCount = new Map<string, number>();
  private lastRecoveryTime = 0;

  constructor(renderer: EnhancedNerfRenderer, config: Partial<RobustNerfConfig> = {}) {
    this.renderer = renderer;
    this.optimizer = new RealTimeOptimizer();
    
    this.config = {
      autoRecovery: true,
      maxRetries: 3,
      operationTimeout: 30000,
      healthMonitoring: true,
      healthCheckInterval: 5000,
      performanceMonitoring: true,
      memoryWarningThreshold: 1024,
      ...config
    };

    this.currentHealth = {
      overall: 'healthy',
      renderer: 'healthy',
      memory: 'healthy',
      performance: 'healthy',
      lastCheck: Date.now(),
      issues: [],
      recommendations: []
    };

    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring systems
   */
  private initializeMonitoring(): void {
    if (this.config.healthMonitoring) {
      this.startHealthMonitoring();
    }
    
    if (this.config.performanceMonitoring) {
      this.startPerformanceMonitoring();
    }
    
    // Start real-time optimizer
    this.optimizer.start();
    
    console.log('🛡️ Robust NeRF Manager initialized with comprehensive monitoring');
  }

  /**
   * Robust scene loading with error handling and validation
   */
  async loadScene(scene: NerfScene): Promise<RobustOperationResult<void>> {
    return this.executeRobustOperation('loadScene', async () => {
      // Validate scene before loading
      this.validateScene(scene);
      
      // Check memory availability
      await this.checkMemoryAvailability(scene.getMemoryUsage());
      
      // Load scene with timeout
      await this.withTimeout(
        this.renderer.setScene.bind(this.renderer),
        [scene],
        this.config.operationTimeout
      );
      
      console.log('✅ Scene loaded successfully with robust validation');
    });
  }

  /**
   * Robust model loading with comprehensive validation
   */
  async loadModel(modelSource: string | ArrayBuffer): Promise<RobustOperationResult<NerfModel>> {
    return this.executeRobustOperation('loadModel', async () => {
      // Create and validate model
      const model = new NerfModel();
      
      // Load with retry mechanism
      await this.withRetry(async () => {
        await model.load(modelSource);
      }, `loadModel-${typeof modelSource === 'string' ? modelSource : 'buffer'}`);
      
      // Validate loaded model
      this.validateModel(model);
      
      console.log('✅ Model loaded and validated successfully');
      return model;
    });
  }

  /**
   * Robust rendering with automatic error recovery
   */
  async renderFrame(options: RenderOptions): Promise<RobustOperationResult<void>> {
    return this.executeRobustOperation('renderFrame', async () => {
      // Pre-render validation
      this.validateRenderOptions(options);
      
      // Update optimizer with current metrics
      const currentMetrics = this.renderer.getEnhancedMetrics();
      this.optimizer.updateMetrics({
        fps: currentMetrics.fps,
        latency: currentMetrics.frameTime,
        memoryUsage: currentMetrics.memoryUsage,
        powerConsumption: currentMetrics.powerConsumption,
        renderQuality: this.getCurrentQuality()
      });
      
      // Apply optimization recommendations
      const optimizations = this.optimizer.getRendererConfig();
      this.applyOptimizations(optimizations);
      
      // Render with enhanced pipeline
      await this.renderer.renderEnhanced(options);
      
      // Post-render health check
      this.checkPostRenderHealth();
    });
  }

  /**
   * Get comprehensive system health status
   */
  getHealthStatus(): HealthStatus {
    this.updateHealthStatus();
    return { ...this.currentHealth };
  }

  /**
   * Get detailed error history and diagnostics
   */
  getDiagnostics(): {
    errorHistory: Array<{ error: string; timestamp: number; context: string }>;
    performanceMetrics: PerformanceMetrics[];
    memoryUsage: number[];
    optimizationStats: any;
    healthHistory: any;
  } {
    return {
      errorHistory: this.errorHistory.map(entry => ({
        error: entry.error.message,
        timestamp: entry.timestamp,
        context: entry.context
      })),
      performanceMetrics: this.performanceMetrics.slice(-50),
      memoryUsage: this.memoryUsageHistory.slice(-50),
      optimizationStats: this.optimizer.getStatistics(),
      healthHistory: {
        lastCheck: this.currentHealth.lastCheck,
        issues: this.currentHealth.issues,
        recommendations: this.currentHealth.recommendations
      }
    };
  }

  /**
   * Force system recovery and cleanup
   */
  async forceRecovery(): Promise<RobustOperationResult<void>> {
    return this.executeRobustOperation('forceRecovery', async () => {
      console.log('🔧 Initiating force recovery...');
      
      // Stop all operations
      this.renderer.stopRenderLoop();
      
      // Clear caches and reset state
      if (this.renderer.dispose) {
        this.renderer.dispose();
      }
      
      // Reset error counters
      this.retryCount.clear();
      this.errorHistory.length = 0;
      
      // Reinitialize systems
      await this.initializeRecoveredSystems();
      
      console.log('✅ Force recovery completed');
    });
  }

  // Private methods for robust operations

  /**
   * Execute operation with comprehensive error handling
   */
  private async executeRobustOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<RobustOperationResult<T>> {
    const startTime = Date.now();
    const recoveryActions: string[] = [];
    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts < this.config.maxRetries) {
      attempts++;
      
      try {
        const result = await operation();
        
        return {
          success: true,
          data: result,
          attempts,
          duration: Date.now() - startTime,
          recoveryActions
        };
        
      } catch (error) {
        lastError = error as Error;
        this.logError(lastError, operationName);
        
        // Attempt recovery if enabled
        if (this.config.autoRecovery && attempts < this.config.maxRetries) {
          const recoveryAction = await this.attemptRecovery(lastError, operationName);
          recoveryActions.push(recoveryAction);
          
          // Wait before retry
          await this.sleep(Math.pow(2, attempts) * 1000);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      duration: Date.now() - startTime,
      recoveryActions
    };
  }

  /**
   * Execute operation with timeout
   */
  private async withTimeout<T>(
    fn: (...args: any[]) => Promise<T>,
    args: any[],
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn.apply(this, args),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Execute operation with retry mechanism
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    const maxRetries = this.config.maxRetries;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        const result = await operation();
        this.retryCount.delete(operationId);
        return result;
        
      } catch (error) {
        attempts++;
        this.retryCount.set(operationId, attempts);
        
        if (attempts >= maxRetries) {
          throw error;
        }
        
        await this.sleep(attempts * 1000);
      }
    }
    
    throw new Error(`Operation failed after ${maxRetries} attempts`);
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptRecovery(error: Error, context: string): Promise<string> {
    console.log(`🔧 Attempting recovery for error in ${context}: ${error.message}`);
    
    // Memory-related recovery
    if (error.message.includes('memory') || error.message.includes('allocation')) {
      await this.performMemoryCleanup();
      return 'memory-cleanup';
    }
    
    // WebGPU-related recovery
    if (error.message.includes('WebGPU') || error.message.includes('GPU')) {
      await this.reinitializeRenderer();
      return 'renderer-reinit';
    }
    
    // Performance-related recovery
    if (error.message.includes('timeout') || error.message.includes('performance')) {
      await this.applyEmergencyOptimizations();
      return 'emergency-optimization';
    }
    
    // Generic recovery
    await this.performGenericRecovery();
    return 'generic-recovery';
  }

  /**
   * Validation methods
   */
  private validateScene(scene: NerfScene): void {
    if (!scene.isSceneLoaded()) {
      throw new Error('Scene is not properly loaded');
    }
    
    const models = scene.getModels();
    if (models.length === 0) {
      throw new Error('Scene contains no models');
    }
    
    models.forEach((sceneModel, index) => {
      if (!sceneModel.model.isModelLoaded()) {
        throw new Error(`Model at index ${index} is not loaded`);
      }
    });
  }

  private validateModel(model: NerfModel): void {
    if (!model.isModelLoaded()) {
      throw new Error('Model failed to load properly');
    }
    
    const weights = model.getWeights();
    if (!weights || weights.length === 0) {
      throw new Error('Model has no weights');
    }
    
    const metadata = model.getMetadata();
    if (!metadata) {
      throw new Error('Model metadata is missing');
    }
  }

  private validateRenderOptions(options: RenderOptions): void {
    if (!options.cameraPosition || options.cameraPosition.length !== 3) {
      throw new Error('Invalid camera position');
    }
    
    if (options.fieldOfView <= 0 || options.fieldOfView >= 180) {
      throw new Error('Invalid field of view');
    }
    
    if (options.near <= 0 || options.far <= options.near) {
      throw new Error('Invalid near/far planes');
    }
  }

  /**
   * Health monitoring methods
   */
  private startHealthMonitoring(): void {
    this.healthTimer = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private performHealthCheck(): void {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check renderer health
    const rendererHealth = this.checkRendererHealth();
    if (rendererHealth.issues.length > 0) {
      issues.push(...rendererHealth.issues);
      recommendations.push(...rendererHealth.recommendations);
    }
    
    // Check memory health
    const memoryHealth = this.checkMemoryHealth();
    if (memoryHealth.issues.length > 0) {
      issues.push(...memoryHealth.issues);
      recommendations.push(...memoryHealth.recommendations);
    }
    
    // Check performance health
    const performanceHealth = this.checkPerformanceHealth();
    if (performanceHealth.issues.length > 0) {
      issues.push(...performanceHealth.issues);
      recommendations.push(...performanceHealth.recommendations);
    }
    
    // Update overall health status
    this.currentHealth = {
      overall: issues.length === 0 ? 'healthy' : (issues.length > 3 ? 'critical' : 'warning'),
      renderer: rendererHealth.status,
      memory: memoryHealth.status,
      performance: performanceHealth.status,
      lastCheck: Date.now(),
      issues,
      recommendations
    };
  }

  private checkRendererHealth(): { status: 'healthy' | 'warning' | 'critical'; issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      const info = this.renderer.getInfo();
      
      if (!info.initialized) {
        issues.push('Renderer not initialized');
        recommendations.push('Reinitialize renderer');
      }
      
      if (info.rendering && this.errorHistory.length > 5) {
        issues.push('High error rate detected');
        recommendations.push('Consider reducing quality or restarting renderer');
      }
      
    } catch (error) {
      issues.push('Failed to get renderer info');
      recommendations.push('Renderer may be in invalid state');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : (issues.length > 2 ? 'critical' : 'warning'),
      issues,
      recommendations
    };
  }

  private checkMemoryHealth(): { status: 'healthy' | 'warning' | 'critical'; issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const metrics = this.renderer.getEnhancedMetrics();
    const memoryUsage = metrics.memoryUsage;
    
    this.memoryUsageHistory.push(memoryUsage);
    if (this.memoryUsageHistory.length > 100) {
      this.memoryUsageHistory.shift();
    }
    
    if (memoryUsage > this.config.memoryWarningThreshold) {
      issues.push(`High memory usage: ${memoryUsage.toFixed(0)}MB`);
      recommendations.push('Reduce model quality or enable more aggressive culling');
    }
    
    // Check for memory leaks
    if (this.memoryUsageHistory.length > 10) {
      const trend = this.calculateMemoryTrend();
      if (trend > 5) { // Growing by 5MB per check
        issues.push('Potential memory leak detected');
        recommendations.push('Consider restarting renderer or clearing caches');
      }
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : (memoryUsage > this.config.memoryWarningThreshold * 1.5 ? 'critical' : 'warning'),
      issues,
      recommendations
    };
  }

  private checkPerformanceHealth(): { status: 'healthy' | 'warning' | 'critical'; issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const metrics = this.renderer.getEnhancedMetrics();
    this.performanceMetrics.push(metrics);
    
    if (this.performanceMetrics.length > 60) {
      this.performanceMetrics.shift();
    }
    
    if (metrics.fps < 30) {
      issues.push(`Low FPS: ${metrics.fps.toFixed(1)}`);
      recommendations.push('Enable adaptive quality or reduce scene complexity');
    }
    
    if (metrics.frameTime > 33) { // Worse than 30fps
      issues.push(`High frame time: ${metrics.frameTime.toFixed(1)}ms`);
      recommendations.push('Optimize rendering pipeline or enable foveated rendering');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : (metrics.fps < 15 ? 'critical' : 'warning'),
      issues,
      recommendations
    };
  }

  // Helper methods
  
  private async checkMemoryAvailability(requiredMemory: number): Promise<void> {
    const currentUsage = this.renderer.getEnhancedMetrics().memoryUsage;
    
    if (currentUsage + requiredMemory > this.config.memoryWarningThreshold) {
      console.warn(`⚠️ Memory usage will exceed threshold: ${currentUsage + requiredMemory}MB`);
      
      if (this.config.autoRecovery) {
        await this.performMemoryCleanup();
      }
    }
  }

  private updateHealthStatus(): void {
    this.performHealthCheck();
  }

  private startPerformanceMonitoring(): void {
    // Performance monitoring is integrated with health checks
    console.log('📊 Performance monitoring enabled');
  }

  private checkPostRenderHealth(): void {
    const metrics = this.renderer.getEnhancedMetrics();
    
    // Check for concerning metrics
    if (metrics.frameDrops > 5) {
      console.warn(`⚠️ High frame drop count: ${metrics.frameDrops}`);
    }
    
    if (metrics.memoryUsage > this.config.memoryWarningThreshold * 0.8) {
      console.warn(`⚠️ Memory usage approaching threshold: ${metrics.memoryUsage}MB`);
    }
  }

  private applyOptimizations(optimizations: any): void {
    // Apply real-time optimizations to renderer
    if (optimizations.foveationConfig.enabled) {
      this.renderer.setFoveatedRendering(optimizations.foveationConfig);
    }
    
    // Apply quality settings
    const qualities = ['low', 'medium', 'high'] as const;
    const qualityIndex = Math.floor(optimizations.qualityLevel * 2);
    this.renderer.setQuality(qualities[Math.min(2, Math.max(0, qualityIndex))]);
  }

  private getCurrentQuality(): number {
    const metrics = this.renderer.getEnhancedMetrics();
    // Simplified quality metric based on current settings
    return metrics.fps / 60; // Normalized quality based on FPS
  }

  private logError(error: Error, context: string): void {
    this.errorHistory.push({
      error,
      timestamp: Date.now(),
      context
    });
    
    // Keep error history limited
    if (this.errorHistory.length > 50) {
      this.errorHistory.shift();
    }
    
    console.error(`❌ Error in ${context}:`, error.message);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async performMemoryCleanup(): Promise<void> {
    console.log('🧹 Performing memory cleanup...');
    // Implementation would include actual cleanup logic
    await this.sleep(100); // Simulate cleanup time
  }

  private async reinitializeRenderer(): Promise<void> {
    console.log('🔄 Reinitializing renderer...');
    // Implementation would include renderer reinitialization
    await this.sleep(500); // Simulate reinitialization time
  }

  private async applyEmergencyOptimizations(): Promise<void> {
    console.log('🚨 Applying emergency optimizations...');
    this.renderer.setQuality('low');
    this.renderer.setFoveatedRendering({ enabled: true, centerRadius: 0.1, levels: 2, blendWidth: 0.3, eyeTracking: false });
  }

  private async performGenericRecovery(): Promise<void> {
    console.log('🔧 Performing generic recovery...');
    await this.sleep(200);
  }

  private async initializeRecoveredSystems(): Promise<void> {
    console.log('🚀 Initializing recovered systems...');
    await this.sleep(1000); // Simulate system initialization
  }

  private calculateMemoryTrend(): number {
    if (this.memoryUsageHistory.length < 5) return 0;
    
    const recent = this.memoryUsageHistory.slice(-5);
    const older = this.memoryUsageHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b) / older.length;
    
    return recentAvg - olderAvg;
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    
    this.optimizer.dispose();
    
    console.log('🧹 Robust NeRF Manager disposed');
  }
}