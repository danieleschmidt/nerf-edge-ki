/**
 * Advanced multi-layer caching system for NeRF rendering optimization
 * Enhanced for Generation 3: MAKE IT SCALE
 */

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  priority: number;
  metadata?: Record<string, any>;
}

export interface CacheLayerConfig {
  name: string;
  maxSize: number; // bytes
  maxEntries: number;
  ttl: number; // milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'adaptive';
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalRequests: number;
  memoryUsage: number;
  entryCount: number;
  layerStats: Map<string, LayerStats>;
}

export interface LayerStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
  currentEntries: number;
  averageAccessTime: number;
}

export class AdvancedCache {
  private layers: Map<string, CacheLayer> = new Map();
  private globalStats: CacheStats;
  private compressionWorker: Worker | null = null;
  private cleanupInterval: number | null = null;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.globalStats = this.initializeStats();
    this.performanceMonitor = new PerformanceMonitor();
    this.setupDefaultLayers();
    this.setupWorkers();
    this.startMaintenanceTasks();
  }

  /**
   * Setup default cache layers for NeRF rendering
   */
  private setupDefaultLayers(): void {
    // L1: GPU memory cache for immediate render data
    this.addLayer('gpu', {
      name: 'GPU Memory',
      maxSize: 256 * 1024 * 1024, // 256MB
      maxEntries: 1000,
      ttl: 5000, // 5 seconds
      evictionPolicy: 'lru',
      compressionEnabled: false,
      persistToDisk: false
    });

    // L2: RAM cache for neural network weights and activations
    this.addLayer('memory', {
      name: 'System Memory',
      maxSize: 1024 * 1024 * 1024, // 1GB
      maxEntries: 5000,
      ttl: 30000, // 30 seconds
      evictionPolicy: 'adaptive',
      compressionEnabled: true,
      persistToDisk: false
    });

    // L3: Disk cache for model weights and scene data
    this.addLayer('disk', {
      name: 'Disk Storage',
      maxSize: 8 * 1024 * 1024 * 1024, // 8GB
      maxEntries: 50000,
      ttl: 3600000, // 1 hour
      evictionPolicy: 'lfu',
      compressionEnabled: true,
      persistToDisk: true
    });

    // L4: Network cache for remote model downloads
    this.addLayer('network', {
      name: 'Network Cache',
      maxSize: 2 * 1024 * 1024 * 1024, // 2GB
      maxEntries: 10000,
      ttl: 86400000, // 24 hours
      evictionPolicy: 'fifo',
      compressionEnabled: true,
      persistToDisk: true
    });
  }

  /**
   * Add a new cache layer
   */
  addLayer(id: string, config: CacheLayerConfig): void {
    const layer = new CacheLayer(config);
    this.layers.set(id, layer);
    this.globalStats.layerStats.set(id, layer.getStats());
    console.log(`Added cache layer: ${config.name} (${config.maxSize / 1024 / 1024}MB)`);
  }

  /**
   * Get data from cache with automatic tier fallback
   */
  async get<T>(key: string, layerHint?: string): Promise<T | null> {
    const startTime = performance.now();
    this.globalStats.totalRequests++;

    // Try specified layer first if hint provided
    if (layerHint && this.layers.has(layerHint)) {
      const result = await this.getFromLayer<T>(layerHint, key);
      if (result !== null) {
        this.recordHit(startTime);
        return result;
      }
    }

    // Try all layers in order of priority (fastest first)
    const layerOrder = ['gpu', 'memory', 'disk', 'network'];
    
    for (const layerId of layerOrder) {
      const layer = this.layers.get(layerId);
      if (layer) {
        const result = await this.getFromLayer<T>(layerId, key);
        if (result !== null) {
          // Promote to faster layers for next access
          await this.promoteToFasterLayers(key, result, layerId);
          this.recordHit(startTime);
          return result;
        }
      }
    }

    this.recordMiss(startTime);
    return null;
  }

  /**
   * Store data in appropriate cache layer
   */
  async set<T>(key: string, data: T, options?: {
    layerHint?: string;
    priority?: number;
    ttl?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const dataSize = this.estimateSize(data);
    const targetLayer = this.selectOptimalLayer(dataSize, options?.layerHint);
    
    if (targetLayer) {
      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        size: dataSize,
        priority: options?.priority || 1,
        metadata: options?.metadata
      };

      await targetLayer.set(key, entry, options?.ttl);
      this.updateGlobalStats();
    }
  }

  /**
   * Invalidate cache entries by key pattern
   */
  async invalidate(pattern: string | RegExp): Promise<number> {
    let invalidatedCount = 0;

    for (const [layerId, layer] of this.layers) {
      const count = await layer.invalidate(pattern);
      invalidatedCount += count;
    }

    this.updateGlobalStats();
    console.log(`Invalidated ${invalidatedCount} cache entries matching pattern: ${pattern}`);
    return invalidatedCount;
  }

  /**
   * Preload data into cache based on usage patterns
   */
  async preload(keys: string[], priority: number = 5): Promise<void> {
    const preloadTasks = keys.map(async (key) => {
      // Check if already cached
      const cached = await this.get(key);
      if (cached) return;

      // Trigger background preload
      this.schedulePreload(key, priority);
    });

    await Promise.all(preloadTasks);
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    this.updateGlobalStats();
    return { ...this.globalStats };
  }

  /**
   * Optimize cache based on current usage patterns
   */
  async optimize(): Promise<void> {
    const startTime = performance.now();

    // Analyze access patterns
    const patterns = await this.analyzeAccessPatterns();
    
    // Adjust layer configurations
    await this.adjustLayerConfigurations(patterns);
    
    // Preemptive eviction of low-value entries
    await this.performIntelligentEviction();
    
    // Defragmentation and compression
    await this.performMaintenance();

    const optimizationTime = performance.now() - startTime;
    console.log(`Cache optimization completed in ${optimizationTime.toFixed(2)}ms`);
  }

  /**
   * Get cache layer information
   */
  getLayerInfo(): Array<{ id: string; config: CacheLayerConfig; stats: LayerStats }> {
    return Array.from(this.layers.entries()).map(([id, layer]) => ({
      id,
      config: layer.getConfig(),
      stats: layer.getStats()
    }));
  }

  // Private helper methods

  private async getFromLayer<T>(layerId: string, key: string): Promise<T | null> {
    const layer = this.layers.get(layerId);
    if (!layer) return null;

    const entry = await layer.get(key);
    return entry ? entry.data : null;
  }

  private async promoteToFasterLayers<T>(key: string, data: T, sourceLayerId: string): Promise<void> {
    const layerPriority = { gpu: 0, memory: 1, disk: 2, network: 3 };
    const sourcePriority = layerPriority[sourceLayerId as keyof typeof layerPriority];

    // Promote to all faster layers
    for (const [layerId, layer] of this.layers) {
      const targetPriority = layerPriority[layerId as keyof typeof layerPriority];
      if (targetPriority < sourcePriority) {
        await this.set(key, data, { layerHint: layerId, priority: 10 });
      }
    }
  }

  private selectOptimalLayer(dataSize: number, hint?: string): CacheLayer | null {
    if (hint && this.layers.has(hint)) {
      const layer = this.layers.get(hint)!;
      if (layer.canAccommodate(dataSize)) {
        return layer;
      }
    }

    // Select based on data size and layer characteristics
    if (dataSize < 1024 * 1024) { // < 1MB
      return this.layers.get('gpu') || this.layers.get('memory');
    } else if (dataSize < 100 * 1024 * 1024) { // < 100MB
      return this.layers.get('memory') || this.layers.get('disk');
    } else {
      return this.layers.get('disk');
    }
  }

  private estimateSize(data: any): number {
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (data instanceof Uint8Array) return data.length;
    if (typeof data === 'string') return data.length * 2; // UTF-16
    
    // Rough estimation for objects
    try {
      return JSON.stringify(data).length * 2;
    } catch {
      return 1024; // Default 1KB
    }
  }

  private recordHit(startTime: number): void {
    this.globalStats.totalHits++;
    this.performanceMonitor.recordAccess(performance.now() - startTime, true);
    this.updateHitRate();
  }

  private recordMiss(startTime: number): void {
    this.globalStats.totalMisses++;
    this.performanceMonitor.recordAccess(performance.now() - startTime, false);
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.globalStats.totalHits + this.globalStats.totalMisses;
    this.globalStats.hitRate = total > 0 ? this.globalStats.totalHits / total : 0;
    this.globalStats.missRate = 1 - this.globalStats.hitRate;
  }

  private updateGlobalStats(): void {
    let totalMemory = 0;
    let totalEntries = 0;

    for (const [layerId, layer] of this.layers) {
      const stats = layer.getStats();
      this.globalStats.layerStats.set(layerId, stats);
      totalMemory += stats.currentSize;
      totalEntries += stats.currentEntries;
    }

    this.globalStats.memoryUsage = totalMemory;
    this.globalStats.entryCount = totalEntries;
  }

  private initializeStats(): CacheStats {
    return {
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      totalRequests: 0,
      memoryUsage: 0,
      entryCount: 0,
      layerStats: new Map()
    };
  }

  private setupWorkers(): void {
    // Setup compression worker for background tasks
    if (typeof Worker !== 'undefined') {
      const workerCode = `
        self.onmessage = function(e) {
          const { action, data } = e.data;
          if (action === 'compress') {
            // Mock compression - in real implementation would use proper compression
            const compressed = JSON.stringify(data);
            self.postMessage({ action: 'compressed', data: compressed });
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
    }
  }

  private startMaintenanceTasks(): void {
    // Regular cleanup every 30 seconds
    this.cleanupInterval = window.setInterval(() => {
      this.performMaintenance();
    }, 30000);
  }

  private async performMaintenance(): Promise<void> {
    for (const layer of this.layers.values()) {
      await layer.cleanup();
    }
    this.updateGlobalStats();
  }

  private schedulePreload(key: string, priority: number): void {
    // Mock preload scheduling
    setTimeout(() => {
      // Would trigger actual data loading here
      console.log(`Preloading cache entry: ${key} (priority: ${priority})`);
    }, 100);
  }

  private async analyzeAccessPatterns(): Promise<any> {
    // Analyze which cache entries are accessed most frequently
    const patterns = {
      hotKeys: [],
      coldKeys: [],
      temporalPatterns: {},
      sizeDistribution: {}
    };

    for (const layer of this.layers.values()) {
      const layerPatterns = await layer.analyzePatterns();
      // Merge patterns
    }

    return patterns;
  }

  private async adjustLayerConfigurations(patterns: any): Promise<void> {
    // Adjust cache sizes based on usage patterns
    // This would implement dynamic cache sizing
  }

  private async performIntelligentEviction(): Promise<void> {
    // Evict entries that are unlikely to be accessed again
    for (const layer of this.layers.values()) {
      await layer.intelligentEviction();
    }
  }

  /**
   * Dispose of cache and cleanup resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }

    for (const layer of this.layers.values()) {
      layer.dispose();
    }

    this.layers.clear();
    console.log('Advanced cache disposed');
  }
}

class CacheLayer {
  private entries: Map<string, CacheEntry<any>> = new Map();
  private config: CacheLayerConfig;
  private stats: LayerStats;
  private accessOrder: string[] = []; // For LRU
  private accessFrequency: Map<string, number> = new Map(); // For LFU

  constructor(config: CacheLayerConfig) {
    this.config = config;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      currentSize: 0,
      currentEntries: 0,
      averageAccessTime: 0
    };
  }

  async get(key: string): Promise<CacheEntry<any> | null> {
    const entry = this.entries.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.entries.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessTracking(key);
    this.stats.hits++;

    return entry;
  }

  async set(key: string, entry: CacheEntry<any>, ttl?: number): Promise<void> {
    // Ensure space is available
    while (!this.canAccommodate(entry.size)) {
      await this.evictOne();
    }

    // Update TTL if specified
    if (ttl) {
      entry.timestamp = Date.now();
    }

    this.entries.set(key, entry);
    this.stats.currentSize += entry.size;
    this.stats.currentEntries++;
    this.updateAccessTracking(key);
  }

  async invalidate(pattern: string | RegExp): Promise<number> {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const key of this.entries.keys()) {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      } else {
        if (pattern.test(key)) {
          keysToDelete.push(key);
        }
      }
    }

    for (const key of keysToDelete) {
      const entry = this.entries.get(key);
      if (entry) {
        this.stats.currentSize -= entry.size;
        this.stats.currentEntries--;
        this.entries.delete(key);
        count++;
      }
    }

    return count;
  }

  canAccommodate(size: number): boolean {
    return (this.stats.currentSize + size <= this.config.maxSize) &&
           (this.stats.currentEntries < this.config.maxEntries);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.entries) {
      if (now - entry.timestamp > this.config.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const entry = this.entries.get(key);
      if (entry) {
        this.stats.currentSize -= entry.size;
        this.stats.currentEntries--;
        this.entries.delete(key);
      }
    }
  }

  async analyzePatterns(): Promise<any> {
    return {
      totalEntries: this.entries.size,
      averageAccessCount: Array.from(this.entries.values())
        .reduce((sum, entry) => sum + entry.accessCount, 0) / this.entries.size,
      memoryEfficiency: this.stats.currentSize / this.config.maxSize
    };
  }

  async intelligentEviction(): Promise<void> {
    // Evict entries with low priority and access count
    const sortedEntries = Array.from(this.entries.entries())
      .sort(([, a], [, b]) => {
        const scoreA = a.priority * a.accessCount;
        const scoreB = b.priority * b.accessCount;
        return scoreA - scoreB;
      });

    const evictCount = Math.floor(this.entries.size * 0.1); // Evict 10%
    
    for (let i = 0; i < evictCount && i < sortedEntries.length; i++) {
      const [key, entry] = sortedEntries[i];
      this.stats.currentSize -= entry.size;
      this.stats.currentEntries--;
      this.stats.evictions++;
      this.entries.delete(key);
    }
  }

  getConfig(): CacheLayerConfig {
    return { ...this.config };
  }

  getStats(): LayerStats {
    return { ...this.stats };
  }

  private async evictOne(): Promise<void> {
    let keyToEvict: string;

    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder[0];
        this.accessOrder.shift();
        break;
      case 'lfu':
        keyToEvict = Array.from(this.accessFrequency.entries())
          .sort(([, a], [, b]) => a - b)[0][0];
        break;
      case 'fifo':
        keyToEvict = this.entries.keys().next().value;
        break;
      case 'adaptive':
        keyToEvict = this.selectAdaptiveEviction();
        break;
      default:
        keyToEvict = this.entries.keys().next().value;
    }

    const entry = this.entries.get(keyToEvict);
    if (entry) {
      this.stats.currentSize -= entry.size;
      this.stats.currentEntries--;
      this.stats.evictions++;
      this.entries.delete(keyToEvict);
    }
  }

  private updateAccessTracking(key: string): void {
    // Update LRU order
    const existingIndex = this.accessOrder.indexOf(key);
    if (existingIndex !== -1) {
      this.accessOrder.splice(existingIndex, 1);
    }
    this.accessOrder.push(key);

    // Update LFU frequency
    this.accessFrequency.set(key, (this.accessFrequency.get(key) || 0) + 1);
  }

  private selectAdaptiveEviction(): string {
    // Adaptive policy considers access frequency, recency, and size
    let bestKey = '';
    let bestScore = Infinity;

    for (const [key, entry] of this.entries) {
      const frequency = this.accessFrequency.get(key) || 1;
      const recency = Date.now() - entry.lastAccessed;
      const sizeWeight = entry.size / 1024; // Size in KB
      
      const score = (recency / frequency) + (sizeWeight * 0.1);
      
      if (score < bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    return bestKey;
  }

  dispose(): void {
    this.entries.clear();
    this.accessOrder = [];
    this.accessFrequency.clear();
  }
}

class PerformanceMonitor {
  private accessTimes: number[] = [];
  private hitTimes: number[] = [];
  private missTimes: number[] = [];

  recordAccess(time: number, hit: boolean): void {
    this.accessTimes.push(time);
    if (hit) {
      this.hitTimes.push(time);
    } else {
      this.missTimes.push(time);
    }

    // Keep only recent samples
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-500);
      this.hitTimes = this.hitTimes.slice(-500);
      this.missTimes = this.missTimes.slice(-500);
    }
  }

  getAverageAccessTime(): number {
    if (this.accessTimes.length === 0) return 0;
    return this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
  }

  getPerformanceMetrics(): any {
    return {
      averageAccessTime: this.getAverageAccessTime(),
      averageHitTime: this.hitTimes.length > 0 
        ? this.hitTimes.reduce((a, b) => a + b, 0) / this.hitTimes.length 
        : 0,
      averageMissTime: this.missTimes.length > 0
        ? this.missTimes.reduce((a, b) => a + b, 0) / this.missTimes.length
        : 0
    };
  }
}