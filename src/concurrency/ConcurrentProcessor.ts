/**
 * Concurrent processing system for parallel NeRF operations
 * Enhanced for Generation 3: MAKE IT SCALE
 */

export interface ProcessingTask<T, R> {
  id: string;
  data: T;
  priority: number;
  timeout?: number;
  retries?: number;
  processor: (data: T) => Promise<R>;
  onProgress?: (progress: number) => void;
  onComplete?: (result: R) => void;
  onError?: (error: Error) => void;
}

export interface WorkerPool {
  size: number;
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
}

export interface ConcurrencyConfig {
  maxWorkers: number;
  minWorkers: number;
  taskQueueLimit: number;
  workerTimeout: number;
  adaptiveScaling: boolean;
  batchProcessing: boolean;
  batchSize: number;
}

export class ConcurrentProcessor {
  private config: ConcurrencyConfig;
  private workers: Worker[] = [];
  private taskQueue: ProcessingTask<any, any>[] = [];
  private activeTasks: Map<string, ProcessingTask<any, any>> = new Map();
  private completedTasks: Map<string, any> = new Map();
  private workerPool: WorkerPool;
  private performanceMonitor: ProcessingMonitor;
  private isProcessing = false;
  private lastScalingCheck = 0;

  constructor(config?: Partial<ConcurrencyConfig>) {
    this.config = {
      maxWorkers: navigator.hardwareConcurrency || 4,
      minWorkers: Math.max(1, Math.floor((navigator.hardwareConcurrency || 4) / 2)),
      taskQueueLimit: 1000,
      workerTimeout: 30000,
      adaptiveScaling: true,
      batchProcessing: true,
      batchSize: 10,
      ...config
    };

    this.workerPool = {
      size: 0,
      activeWorkers: 0,
      queuedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskTime: 0
    };

    this.performanceMonitor = new ProcessingMonitor();
    this.initializeWorkerPool();
    this.startProcessingLoop();
  }

  /**
   * Submit a task for concurrent processing
   */
  async submitTask<T, R>(task: ProcessingTask<T, R>): Promise<R> {
    return new Promise((resolve, reject) => {
      // Add completion callbacks
      const enhancedTask = {
        ...task,
        onComplete: (result: R) => {
          if (task.onComplete) task.onComplete(result);
          resolve(result);
        },
        onError: (error: Error) => {
          if (task.onError) task.onError(error);
          reject(error);
        }
      };

      // Check queue limit
      if (this.taskQueue.length >= this.config.taskQueueLimit) {
        reject(new Error('Task queue limit exceeded'));
        return;
      }

      // Add to queue with priority sorting
      this.taskQueue.push(enhancedTask);
      this.taskQueue.sort((a, b) => b.priority - a.priority);
      this.workerPool.queuedTasks = this.taskQueue.length;

      // Trigger adaptive scaling check
      if (this.config.adaptiveScaling) {
        this.checkScaling();
      }
    });
  }

  /**
   * Submit multiple tasks for batch processing
   */
  async submitBatch<T, R>(tasks: ProcessingTask<T, R>[]): Promise<R[]> {
    if (this.config.batchProcessing) {
      return this.processBatch(tasks);
    } else {
      return Promise.all(tasks.map(task => this.submitTask(task)));
    }
  }

  /**
   * Process NeRF inference batch with optimized GPU utilization
   */
  async processNerfBatch(
    positions: Float32Array[],
    directions: Float32Array[],
    modelId: string
  ): Promise<Float32Array[]> {
    const batchTasks: ProcessingTask<any, Float32Array>[] = positions.map((pos, index) => ({
      id: `nerf_inference_${index}`,
      data: { position: pos, direction: directions[index], modelId },
      priority: 10,
      processor: async (data) => {
        return this.processNerfInference(data.position, data.direction, data.modelId);
      }
    }));

    return this.submitBatch(batchTasks);
  }

  /**
   * Process ray marching in parallel chunks
   */
  async processRayMarchingParallel(
    rays: { origin: Float32Array; direction: Float32Array }[],
    config: { samples: number; bounds: [number, number] }
  ): Promise<Float32Array[]> {
    const chunkSize = Math.ceil(rays.length / this.workers.length);
    const chunks: any[] = [];

    for (let i = 0; i < rays.length; i += chunkSize) {
      chunks.push(rays.slice(i, i + chunkSize));
    }

    const chunkTasks: ProcessingTask<any, Float32Array[]>[] = chunks.map((chunk, index) => ({
      id: `ray_marching_chunk_${index}`,
      data: { rays: chunk, config },
      priority: 8,
      processor: async (data) => {
        return this.processRayMarchingChunk(data.rays, data.config);
      }
    }));

    const results = await this.submitBatch(chunkTasks);
    return results.flat();
  }

  /**
   * Parallel neural network weight optimization
   */
  async optimizeNeuralNetworkWeights(
    layers: Float32Array[],
    optimizationParams: any
  ): Promise<Float32Array[]> {
    const layerTasks: ProcessingTask<any, Float32Array>[] = layers.map((layer, index) => ({
      id: `weight_optimization_${index}`,
      data: { weights: layer, params: optimizationParams, layerIndex: index },
      priority: 6,
      processor: async (data) => {
        return this.optimizeLayerWeights(data.weights, data.params);
      }
    }));

    return this.submitBatch(layerTasks);
  }

  /**
   * Get current processing statistics
   */
  getStats(): {
    workerPool: WorkerPool;
    performance: any;
    systemLoad: number;
  } {
    return {
      workerPool: { ...this.workerPool },
      performance: this.performanceMonitor.getMetrics(),
      systemLoad: this.calculateSystemLoad()
    };
  }

  /**
   * Manually scale worker pool
   */
  async scaleWorkers(targetSize: number): Promise<void> {
    const clampedSize = Math.max(
      this.config.minWorkers,
      Math.min(this.config.maxWorkers, targetSize)
    );

    if (clampedSize > this.workers.length) {
      await this.addWorkers(clampedSize - this.workers.length);
    } else if (clampedSize < this.workers.length) {
      await this.removeWorkers(this.workers.length - clampedSize);
    }

    console.log(`Worker pool scaled to ${this.workers.length} workers`);
  }

  // Private implementation methods

  private initializeWorkerPool(): void {
    // Start with minimum number of workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.createWorker();
    }
    console.log(`Initialized worker pool with ${this.workers.length} workers`);
  }

  private createWorker(): Worker {
    const workerCode = `
      self.onmessage = async function(e) {
        const { taskId, data, processorCode } = e.data;
        
        try {
          // Execute the processor function
          const processor = new Function('return (' + processorCode + ')')();
          const result = await processor(data);
          
          self.postMessage({
            type: 'task_complete',
            taskId: taskId,
            result: result
          });
        } catch (error) {
          self.postMessage({
            type: 'task_error',
            taskId: taskId,
            error: {
              message: error.message,
              stack: error.stack
            }
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      this.handleWorkerMessage(e.data);
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };

    this.workers.push(worker);
    this.workerPool.size = this.workers.length;
    return worker;
  }

  private async addWorkers(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      this.createWorker();
    }
  }

  private async removeWorkers(count: number): Promise<void> {
    for (let i = 0; i < count && this.workers.length > this.config.minWorkers; i++) {
      const worker = this.workers.pop();
      if (worker) {
        worker.terminate();
      }
    }
    this.workerPool.size = this.workers.length;
  }

  private startProcessingLoop(): void {
    this.isProcessing = true;
    this.processNextTask();
  }

  private async processNextTask(): Promise<void> {
    if (!this.isProcessing) return;

    // Process batch if enabled and we have enough tasks
    if (this.config.batchProcessing && this.taskQueue.length >= this.config.batchSize) {
      const batch = this.taskQueue.splice(0, this.config.batchSize);
      await this.processBatchInternal(batch);
    }
    // Process single task if workers are available
    else if (this.taskQueue.length > 0 && this.getAvailableWorker()) {
      const task = this.taskQueue.shift()!;
      await this.processTask(task);
    }

    // Continue processing
    setTimeout(() => this.processNextTask(), 10);
  }

  private async processTask<T, R>(task: ProcessingTask<T, R>): Promise<void> {
    const worker = this.getAvailableWorker();
    if (!worker) return;

    performance.now();
    this.activeTasks.set(task.id, task);
    this.workerPool.activeWorkers++;
    this.workerPool.queuedTasks = this.taskQueue.length;

    try {
      // Serialize the processor function for the worker
      const processorCode = task.processor.toString();

      worker.postMessage({
        taskId: task.id,
        data: task.data,
        processorCode: processorCode
      });

      // Set timeout if specified
      if (task.timeout) {
        setTimeout(() => {
          if (this.activeTasks.has(task.id)) {
            this.handleTaskTimeout(task.id);
          }
        }, task.timeout);
      }

    } catch (error) {
      this.handleTaskError(task.id, error as Error);
    }
  }

  private async processBatch<T, R>(tasks: ProcessingTask<T, R>[]): Promise<R[]> {
    return new Promise((resolve, reject) => {
      const results: R[] = new Array(tasks.length);
      let completedCount = 0;
      let hasError = false;

      const batchCompleteHandler = (taskIndex: number, result: R) => {
        results[taskIndex] = result;
        completedCount++;
        
        if (completedCount === tasks.length && !hasError) {
          resolve(results);
        }
      };

      const batchErrorHandler = (error: Error) => {
        if (!hasError) {
          hasError = true;
          reject(error);
        }
      };

      tasks.forEach((task, index) => {
        const enhancedTask = {
          ...task,
          onComplete: (result: R) => {
            if (task.onComplete) task.onComplete(result);
            batchCompleteHandler(index, result);
          },
          onError: (error: Error) => {
            if (task.onError) task.onError(error);
            batchErrorHandler(error);
          }
        };

        this.processTask(enhancedTask);
      });
    });
  }

  private async processBatchInternal(tasks: ProcessingTask<any, any>[]): Promise<void> {
    await Promise.all(tasks.map(task => this.processTask(task)));
  }

  private getAvailableWorker(): Worker | null {
    // Simple round-robin for now
    return this.workers.find(() => true) || null;
  }

  private handleWorkerMessage(message: any): void {
    const { type, taskId, result, error } = message;

    if (type === 'task_complete') {
      this.handleTaskComplete(taskId, result);
    } else if (type === 'task_error') {
      this.handleTaskError(taskId, new Error(error.message));
    }
  }

  private handleTaskComplete(taskId: string, result: any): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    this.activeTasks.delete(taskId);
    this.completedTasks.set(taskId, result);
    this.workerPool.activeWorkers--;
    this.workerPool.completedTasks++;

    this.performanceMonitor.recordTaskCompletion(taskId, performance.now());

    if (task.onComplete) {
      task.onComplete(result);
    }
  }

  private handleTaskError(taskId: string, error: Error): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    this.activeTasks.delete(taskId);
    this.workerPool.activeWorkers--;
    this.workerPool.failedTasks++;

    this.performanceMonitor.recordTaskError(taskId, error);

    if (task.onError) {
      task.onError(error);
    }
  }

  private handleTaskTimeout(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    this.handleTaskError(taskId, new Error('Task timeout'));
  }

  private checkScaling(): void {
    const now = performance.now();
    if (now - this.lastScalingCheck < 5000) return; // Check every 5 seconds

    this.lastScalingCheck = now;

    const queueRatio = this.taskQueue.length / this.config.taskQueueLimit;
    const utilizationRatio = this.workerPool.activeWorkers / this.workers.length;

    // Scale up if queue is building up or workers are fully utilized
    if (queueRatio > 0.7 || utilizationRatio > 0.8) {
      if (this.workers.length < this.config.maxWorkers) {
        this.addWorkers(1);
      }
    }
    // Scale down if queue is low and workers are underutilized
    else if (queueRatio < 0.2 && utilizationRatio < 0.3) {
      if (this.workers.length > this.config.minWorkers) {
        this.removeWorkers(1);
      }
    }
  }

  private calculateSystemLoad(): number {
    const cpuLoad = this.workerPool.activeWorkers / this.workers.length;
    const queueLoad = this.taskQueue.length / this.config.taskQueueLimit;
    return Math.max(cpuLoad, queueLoad);
  }

  // Mock NeRF processing functions (would be replaced with actual implementations)

  private async processNerfInference(
    _position: Float32Array,
    _direction: Float32Array,
    _modelId: string
  ): Promise<Float32Array> {
    // Mock NeRF inference
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    return new Float32Array([Math.random(), Math.random(), Math.random(), 1.0]);
  }

  private async processRayMarchingChunk(
    rays: { origin: Float32Array; direction: Float32Array }[],
    _config: { samples: number; bounds: [number, number] }
  ): Promise<Float32Array[]> {
    // Mock ray marching
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    return rays.map(() => new Float32Array([Math.random(), Math.random(), Math.random(), 1.0]));
  }

  private async optimizeLayerWeights(
    weights: Float32Array,
    _params: any
  ): Promise<Float32Array> {
    // Mock weight optimization
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    return new Float32Array(weights.map(w => w * (0.9 + Math.random() * 0.2)));
  }

  /**
   * Dispose of all workers and cleanup resources
   */
  dispose(): void {
    this.isProcessing = false;

    for (const worker of this.workers) {
      worker.terminate();
    }

    this.workers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
    this.completedTasks.clear();

    console.log('Concurrent processor disposed');
  }
}

class ProcessingMonitor {
  private taskStartTimes: Map<string, number> = new Map();
  private taskCompletionTimes: number[] = [];
  private taskErrors: Error[] = [];

  recordTaskStart(taskId: string): void {
    this.taskStartTimes.set(taskId, performance.now());
  }

  recordTaskCompletion(taskId: string, endTime: number): void {
    const startTime = this.taskStartTimes.get(taskId);
    if (startTime) {
      const duration = endTime - startTime;
      this.taskCompletionTimes.push(duration);
      this.taskStartTimes.delete(taskId);

      // Keep only recent samples
      if (this.taskCompletionTimes.length > 1000) {
        this.taskCompletionTimes = this.taskCompletionTimes.slice(-500);
      }
    }
  }

  recordTaskError(taskId: string, error: Error): void {
    this.taskErrors.push(error);
    this.taskStartTimes.delete(taskId);

    // Keep only recent errors
    if (this.taskErrors.length > 100) {
      this.taskErrors = this.taskErrors.slice(-50);
    }
  }

  getMetrics(): any {
    const avgCompletionTime = this.taskCompletionTimes.length > 0
      ? this.taskCompletionTimes.reduce((a, b) => a + b, 0) / this.taskCompletionTimes.length
      : 0;

    const errorRate = this.taskErrors.length / 
      (this.taskCompletionTimes.length + this.taskErrors.length);

    return {
      averageTaskTime: avgCompletionTime,
      errorRate: errorRate,
      recentErrors: this.taskErrors.slice(-10),
      tasksInProgress: this.taskStartTimes.size
    };
  }
}