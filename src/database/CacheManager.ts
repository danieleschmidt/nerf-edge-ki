/**
 * Advanced caching system for NeRF models and rendering data
 */

// Global timer functions for Node.js/Browser compatibility
declare const clearTimeout: (timeoutId: NodeJS.Timeout | number) => void;

export interface CacheEntry<T> {
  key: string;
  data: T;
  size: number; // Size in bytes
  lastAccessed: number;
  accessCount: number;
  priority: number; // 0-1, higher means more important
  tags: string[];
}

export interface CacheConfig {
  maxMemoryMB: number;
  maxEntries: number;
  defaultTTL: number; // Time to live in milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'priority' | 'hybrid';
  compressionEnabled: boolean;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number; // MB
  entryCount: number;
  evictions: number;
}

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private compressionWorker: Worker | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxMemoryMB: 256,
      maxEntries: 100,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      evictionPolicy: 'hybrid',
      compressionEnabled: false,
      ...config
    };

    this.metrics = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      memoryUsage: 0,
      entryCount: 0,
      evictions: 0
    };

    // Initialize compression worker if enabled
    if (this.config.compressionEnabled && typeof Worker !== 'undefined') {
      this.initializeCompressionWorker();
    }

    console.log(`CacheManager initialized: ${this.config.maxMemoryMB}MB, ${this.config.maxEntries} entries, ${this.config.evictionPolicy} policy`);
  }

  /**
   * Store data in cache
   */
  async set(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      priority?: number;
      tags?: string[];
      compress?: boolean;
    } = {}
  ): Promise<void> {
    const size = this.calculateSize(data);
    const now = Date.now();
    
    let processedData = data;
    
    // Apply compression if requested and available
    if (options.compress && this.config.compressionEnabled && this.compressionWorker) {
      try {
        processedData = await this.compressData(data);
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error);
      }
    }
    
    const entry: CacheEntry<T> = {
      key,
      data: processedData,
      size,
      lastAccessed: now,
      accessCount: 1,
      priority: options.priority ?? 0.5,
      tags: options.tags ?? []
    };

    // Check if we need to evict entries
    await this.ensureCapacity(size);
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.metrics.memoryUsage -= existing.size / 1024 / 1024;
    }

    // Add new entry
    this.cache.set(key, entry);
    this.metrics.memoryUsage += size / 1024 / 1024;
    this.metrics.entryCount = this.cache.size;

    console.log(`Cached '${key}': ${(size / 1024).toFixed(1)}KB, priority ${entry.priority}`);
  }

  /**
   * Retrieve data from cache
   */
  async get(key: string): Promise<T | null> {
    this.metrics.totalRequests++;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.totalMisses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.metrics.totalHits++;
    this.updateHitRate();

    // Decompress if needed
    if (this.config.compressionEnabled && this.compressionWorker) {
      try {
        const decompressed = await this.decompressData(entry.data);
        return decompressed;
      } catch (error) {
        console.warn('Decompression failed:', error);
      }
    }

    return entry.data;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.metrics.memoryUsage -= entry.size / 1024 / 1024;
      this.metrics.entryCount = this.cache.size - 1;
      console.log(`Removed '${key}' from cache`);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.metrics.memoryUsage = 0;
    this.metrics.entryCount = 0;
    console.log('Cache cleared');
  }

  /**
   * Clear entries by tags
   */
  clearByTags(tags: string[]): number {
    let cleared = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      const hasTag = tags.some(tag => entry.tags.includes(tag));
      if (hasTag) {
        this.delete(key);
        cleared++;
      }
    }
    
    console.log(`Cleared ${cleared} entries with tags: ${tags.join(', ')}`);
    return cleared;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply new limits if they're lower
    if (newConfig.maxMemoryMB || newConfig.maxEntries) {
      this.enforceCapacityLimits();
    }
    
    console.log('Cache configuration updated:', this.config);
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get entries sorted by various criteria
   */
  getEntries(sortBy: 'lastAccessed' | 'accessCount' | 'priority' | 'size' = 'lastAccessed'): CacheEntry<T>[] {
    const entries = Array.from(this.cache.values());
    
    entries.sort((a, b) => {
      switch (sortBy) {
        case 'lastAccessed':
          return b.lastAccessed - a.lastAccessed;
        case 'accessCount':
          return b.accessCount - a.accessCount;
        case 'priority':
          return b.priority - a.priority;
        case 'size':
          return b.size - a.size;
        default:
          return 0;
      }
    });
    
    return entries;
  }

  /**
   * Preload data into cache
   */
  async preload(entries: Array<{ key: string; data: T; priority?: number; tags?: string[] }>): Promise<void> {
    console.log(`Preloading ${entries.length} cache entries...`);
    
    for (const entry of entries) {
      await this.set(entry.key, entry.data, {
        priority: entry.priority || 1.0, // High priority for preloaded data
        tags: entry.tags
      });
    }
    
    console.log('Cache preloading complete');
  }

  /**
   * Warm up cache with predicted data
   */
  async warmUp(predictor: () => Promise<Array<{ key: string; data: T }>>): Promise<void> {
    try {
      console.log('Warming up cache...');
      const predictions = await predictor();
      
      await this.preload(predictions.map(p => ({
        ...p,
        priority: 0.8, // High but not maximum priority
        tags: ['warmup']
      })));
      
      console.log(`Cache warmed up with ${predictions.length} predictions`);
    } catch (error) {
      console.error('Cache warm-up failed:', error);
    }
  }

  // Private methods

  private async ensureCapacity(newEntrySize: number): Promise<void> {
    const newMemoryUsage = this.metrics.memoryUsage + (newEntrySize / 1024 / 1024);
    const maxMemory = this.config.maxMemoryMB;
    const maxEntries = this.config.maxEntries;
    
    // Check if we need to evict
    while (
      (newMemoryUsage > maxMemory || this.cache.size >= maxEntries) &&
      this.cache.size > 0
    ) {
      await this.evictEntry();
    }
  }

  private async evictEntry(): Promise<void> {
    if (this.cache.size === 0) return;
    
    let keyToEvict: string;
    
    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.findLRUKey();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      case 'priority':
        keyToEvict = this.findLowestPriorityKey();
        break;
      case 'hybrid':
      default:
        keyToEvict = this.findHybridEvictionKey();
        break;
    }
    
    this.delete(keyToEvict);
    this.metrics.evictions++;
  }

  private findLRUKey(): string {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  private findLFUKey(): string {
    let leastUsedKey = '';
    let leastCount = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    }
    
    return leastUsedKey;
  }

  private findLowestPriorityKey(): string {
    let lowestPriorityKey = '';
    let lowestPriority = 1;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.priority < lowestPriority) {
        lowestPriority = entry.priority;
        lowestPriorityKey = key;
      }
    }
    
    return lowestPriorityKey;
  }

  private findHybridEvictionKey(): string {
    // Hybrid approach: combine recency, frequency, and priority
    let bestKey = '';
    let bestScore = Infinity;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      const ageScore = (now - entry.lastAccessed) / 1000; // Seconds since last access
      const frequencyScore = 1 / Math.max(entry.accessCount, 1); // Inverse frequency
      const priorityScore = 1 - entry.priority; // Lower priority = higher score
      
      // Weighted hybrid score (age is most important, then priority, then frequency)
      const hybridScore = (ageScore * 0.5) + (priorityScore * 0.3) + (frequencyScore * 0.2);
      
      if (hybridScore < bestScore) {
        bestScore = hybridScore;
        bestKey = key;
      }
    }
    
    return bestKey;
  }

  private enforceCapacityLimits(): void {
    // Remove entries until we're within limits
    while (
      (this.metrics.memoryUsage > this.config.maxMemoryMB || 
       this.cache.size > this.config.maxEntries) &&
      this.cache.size > 0
    ) {
      this.evictEntry();
    }
  }

  private calculateSize(data: T): number {
    // Rough size estimation
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (data instanceof Uint8Array) {
      return data.byteLength;
    } else if (typeof data === 'string') {
      return data.length * 2; // Assume UTF-16
    } else if (typeof data === 'object') {
      // Rough JSON size estimation
      return JSON.stringify(data).length * 2;
    } else {
      return 64; // Default size for primitives
    }
  }

  private updateHitRate(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = this.metrics.totalHits / this.metrics.totalRequests;
      this.metrics.missRate = this.metrics.totalMisses / this.metrics.totalRequests;
    }
  }

  private initializeCompressionWorker(): void {
    // Create a simple compression worker
    const workerCode = `
      self.onmessage = function(e) {
        const { action, data, id } = e.data;
        
        try {
          if (action === 'compress') {
            // Simple compression simulation (in reality would use real compression)
            const compressed = JSON.stringify(data);
            self.postMessage({ id, result: compressed });
          } else if (action === 'decompress') {
            // Simple decompression
            const decompressed = JSON.parse(data);
            self.postMessage({ id, result: decompressed });
          }
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    `;
    
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
      console.log('Compression worker initialized');
    } catch (error) {
      console.warn('Failed to initialize compression worker:', error);
      this.config.compressionEnabled = false;
    }
  }

  private async compressData(data: T): Promise<T> {
    if (!this.compressionWorker) {
      return data;
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);
      
      const timeout = setTimeout(() => {
        reject(new Error('Compression timeout'));
      }, 5000);
      
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          clearTimeout(timeout);
          this.compressionWorker!.removeEventListener('message', handler);
          
          if (e.data.error) {
            reject(new Error(e.data.error));
          } else {
            resolve(e.data.result);
          }
        }
      };
      
      this.compressionWorker.addEventListener('message', handler);
      this.compressionWorker.postMessage({ action: 'compress', data, id });
    });
  }

  private async decompressData(data: T): Promise<T> {
    if (!this.compressionWorker) {
      return data;
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);
      
      const timeout = setTimeout(() => {
        reject(new Error('Decompression timeout'));
      }, 5000);
      
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          clearTimeout(timeout);
          this.compressionWorker!.removeEventListener('message', handler);
          
          if (e.data.error) {
            reject(new Error(e.data.error));
          } else {
            resolve(e.data.result);
          }
        }
      };
      
      this.compressionWorker.addEventListener('message', handler);
      this.compressionWorker.postMessage({ action: 'decompress', data, id });
    });
  }

  /**
   * Dispose of cache resources
   */
  dispose(): void {
    this.clear();
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
    
    console.log('Cache manager disposed');
  }
}