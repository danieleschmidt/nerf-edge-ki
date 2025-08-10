/**
 * Advanced caching system with intelligent eviction and preloading
 */

export interface CacheEntry<T> {
  key: string;
  data: T;
  size: number;
  accessTime: number;
  accessCount: number;
  priority: number;
  expiryTime?: number;
  metadata?: Record<string, any>;
}

export interface CacheConfig {
  maxSize: number; // bytes
  maxEntries: number;
  defaultTTL: number; // ms
  evictionStrategy: 'lru' | 'lfu' | 'arc' | 'smart';
  preloadingEnabled: boolean;
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageAccessTime: number;
  memoryUsage: number;
  entryCount: number;
  compressionRatio: number;
}

export class AdvancedCacheManager<T> {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessLog: Array<{ key: string; timestamp: number }> = [];
  private stats: CacheStats = {
    hitRate: 0,
    missRate: 0,
    evictionRate: 0,
    averageAccessTime: 0,
    memoryUsage: 0,
    entryCount: 0,
    compressionRatio: 1.0
  };
  
  // ARC (Adaptive Replacement Cache) specific data structures
  private t1: Set<string> = new Set(); // Recent items
  private t2: Set<string> = new Set(); // Frequent items  
  private b1: Set<string> = new Set(); // Ghost list for t1
  private b2: Set<string> = new Set(); // Ghost list for t2
  private p = 0; // Adaptive parameter

  // Statistics tracking
  private totalAccesses = 0;
  private totalHits = 0;
  private totalMisses = 0;
  private totalEvictions = 0;

  constructor(config: CacheConfig) {
    this.config = config;
    this.setupPeriodicMaintenance();
  }

  /**
   * Get item from cache with intelligent tracking
   */
  async get(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.totalAccesses++;
    
    const entry = this.cache.get(key);
    
    if (entry) {
      // Cache hit
      this.totalHits++;
      entry.accessTime = Date.now();
      entry.accessCount++;
      entry.priority = this.calculatePriority(entry);
      
      // Update ARC lists
      this.updateARCOnHit(key);
      
      // Record access
      this.recordAccess(key, startTime);
      
      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.totalMisses++;
        return null;
      }
      
      return entry.data;
    } else {
      // Cache miss
      this.totalMisses++;
      this.updateARCOnMiss(key);
      this.recordAccess(key, startTime);
      return null;
    }
  }

  /**
   * Set item in cache with intelligent insertion
   */
  async set(key: string, data: T, options: {
    ttl?: number;
    priority?: number;
    compress?: boolean;
    metadata?: Record<string, any>;
  } = {}): Promise<boolean> {
    const size = this.calculateSize(data);
    
    // Check if we can fit this entry
    if (size > this.config.maxSize) {
      console.warn(`Cache entry too large: ${size} > ${this.config.maxSize}`);
      return false;
    }

    // Compress data if enabled
    let actualData = data;
    let actualSize = size;
    
    if (this.config.compressionEnabled && (options.compress !== false)) {
      try {
        const compressed = await this.compressData(data);
        if (compressed.size < size * 0.8) { // Only use if 20%+ compression
          actualData = compressed.data;
          actualSize = compressed.size;
        }
      } catch (error) {
        console.warn('Compression failed, using uncompressed data:', error);
      }
    }

    // Make room if needed
    await this.makeRoom(actualSize);

    // Create entry
    const entry: CacheEntry<T> = {
      key,
      data: actualData,
      size: actualSize,
      accessTime: Date.now(),
      accessCount: 1,
      priority: options.priority || 1,
      expiryTime: options.ttl ? Date.now() + options.ttl : 
                   (this.config.defaultTTL ? Date.now() + this.config.defaultTTL : undefined),
      metadata: options.metadata
    };

    this.cache.set(key, entry);
    this.updateARCOnInsert(key);
    
    // Persist if enabled
    if (this.config.persistenceEnabled) {
      await this.persistEntry(entry);
    }

    this.updateStats();
    return true;
  }

  /**
   * Remove item from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.removeFromARCLists(key);
      this.updateStats();
      return true;
    }
    return false;
  }

  /**
   * Check if cache contains key
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.t1.clear();
    this.t2.clear();
    this.b1.clear();
    this.b2.clear();
    this.accessLog = [];
    this.resetStats();
  }

  /**
   * Preload data based on access patterns
   */
  async preload(keys: string[], loader: (key: string) => Promise<T | null>): Promise<void> {
    if (!this.config.preloadingEnabled) return;

    const predictions = this.predictNextAccess(keys);
    
    for (const { key, probability } of predictions) {
      if (probability > 0.7 && !this.has(key)) {
        try {
          const data = await loader(key);
          if (data !== null) {
            await this.set(key, data, { priority: probability });
          }
        } catch (error) {
          console.warn(`Preload failed for key ${key}:`, error);
        }
      }
    }
  }

  /**
   * Predict next access based on patterns
   */
  private predictNextAccess(candidateKeys: string[]): Array<{ key: string; probability: number }> {
    const recentAccesses = this.accessLog.slice(-100); // Last 100 accesses
    const patterns: Map<string, number> = new Map();
    
    // Analyze sequential patterns
    for (let i = 0; i < recentAccesses.length - 1; i++) {
      const current = recentAccesses[i].key;
      const next = recentAccesses[i + 1].key;
      const pattern = `${current}->${next}`;
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }

    // Calculate probabilities for candidate keys
    const lastAccess = recentAccesses[recentAccesses.length - 1]?.key;
    const results: Array<{ key: string; probability: number }> = [];

    for (const key of candidateKeys) {
      if (lastAccess) {
        const pattern = `${lastAccess}->${key}`;
        const count = patterns.get(pattern) || 0;
        const probability = count / Math.max(1, recentAccesses.length);
        results.push({ key, probability });
      } else {
        results.push({ key, probability: 0.1 }); // Default low probability
      }
    }

    return results.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Make room in cache by evicting entries
   */
  private async makeRoom(requiredSize: number): Promise<void> {
    while (this.getCurrentSize() + requiredSize > this.config.maxSize ||
           this.cache.size >= this.config.maxEntries) {
      
      const evicted = await this.evictEntry();
      if (!evicted) break; // No more entries to evict
    }
  }

  /**
   * Evict entry based on configured strategy
   */
  private async evictEntry(): Promise<boolean> {
    if (this.cache.size === 0) return false;

    let keyToEvict: string;

    switch (this.config.evictionStrategy) {
      case 'lru':
        keyToEvict = this.findLRU();
        break;
      case 'lfu':
        keyToEvict = this.findLFU();
        break;
      case 'arc':
        keyToEvict = this.evictARC();
        break;
      case 'smart':
        keyToEvict = this.smartEviction();
        break;
      default:
        keyToEvict = this.findLRU();
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.removeFromARCLists(keyToEvict);
      this.totalEvictions++;
      return true;
    }

    return false;
  }

  /**
   * Find least recently used entry
   */
  private findLRU(): string {
    let oldestTime = Date.now();
    let oldestKey = '';

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessTime < oldestTime) {
        oldestTime = entry.accessTime;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Find least frequently used entry
   */
  private findLFU(): string {
    let lowestCount = Infinity;
    let lfuKey = '';

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < lowestCount) {
        lowestCount = entry.accessCount;
        lfuKey = key;
      }
    }

    return lfuKey;
  }

  /**
   * ARC eviction strategy
   */
  private evictARC(): string {
    // Prefer evicting from t1 when p is small
    if (this.t1.size > 0 && (this.t1.size > this.p || this.t2.size === 0)) {
      const key = this.t1.values().next().value;
      return key;
    } else if (this.t2.size > 0) {
      const key = this.t2.values().next().value;
      return key;
    }

    // Fallback to LRU if ARC lists are empty
    return this.findLRU();
  }

  /**
   * Smart eviction based on multiple factors
   */
  private smartEviction(): string {
    let bestScore = -1;
    let bestKey = '';

    for (const [key, entry] of this.cache.entries()) {
      const score = this.calculateEvictionScore(entry);
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    return bestKey;
  }

  /**
   * Calculate eviction score (higher = more likely to evict)
   */
  private calculateEvictionScore(entry: CacheEntry<T>): number {
    const now = Date.now();
    const timeSinceAccess = now - entry.accessTime;
    const sizeWeight = entry.size / (1024 * 1024); // Size in MB
    
    // Base score from recency and frequency
    let score = timeSinceAccess / (entry.accessCount + 1);
    
    // Large entries are more likely to be evicted
    score *= (1 + sizeWeight * 0.1);
    
    // Lower priority entries more likely to be evicted
    score *= (2 - entry.priority);
    
    // Expired entries get maximum score
    if (this.isExpired(entry)) {
      score *= 10;
    }

    return score;
  }

  /**
   * Update ARC lists on cache hit
   */
  private updateARCOnHit(key: string): void {
    if (this.t1.has(key)) {
      this.t1.delete(key);
      this.t2.add(key);
    }
    // If already in t2, just update timestamp (handled in get method)
  }

  /**
   * Update ARC lists on cache miss
   */
  private updateARCOnMiss(key: string): void {
    if (this.b1.has(key)) {
      // Increase p
      this.p = Math.min(this.p + Math.max(1, this.b2.size / this.b1.size), this.config.maxSize);
      this.b1.delete(key);
    } else if (this.b2.has(key)) {
      // Decrease p
      this.p = Math.max(this.p - Math.max(1, this.b1.size / this.b2.size), 0);
      this.b2.delete(key);
    }
  }

  /**
   * Update ARC lists on new insertion
   */
  private updateARCOnInsert(key: string): void {
    this.t1.add(key);
  }

  /**
   * Remove key from all ARC lists
   */
  private removeFromARCLists(key: string): void {
    this.t1.delete(key);
    this.t2.delete(key);
    this.b1.delete(key);
    this.b2.delete(key);
  }

  /**
   * Calculate size of data
   */
  private calculateSize(data: T): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (data instanceof Float32Array || data instanceof Uint8Array) {
      return data.byteLength;
    } else if (typeof data === 'string') {
      return new Blob([data]).size;
    } else {
      // Estimate object size
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  /**
   * Compress data using available compression APIs
   */
  private async compressData(data: T): Promise<{ data: T; size: number }> {
    // Mock compression - in real implementation would use CompressionStream
    // or other compression libraries
    
    if (typeof data === 'string') {
      // Simple string compression simulation
      const compressed = data.replace(/(.)\1+/g, '$1'); // Remove consecutive duplicates
      return {
        data: compressed as T,
        size: compressed.length * 2
      };
    }
    
    // For other data types, return as-is for now
    return {
      data,
      size: this.calculateSize(data)
    };
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return entry.expiryTime !== undefined && Date.now() > entry.expiryTime;
  }

  /**
   * Calculate priority based on access patterns
   */
  private calculatePriority(entry: CacheEntry<T>): number {
    const now = Date.now();
    const age = now - entry.accessTime;
    const frequency = entry.accessCount;
    const recency = Math.max(1, 86400000 - age) / 86400000; // Recency factor (24 hours max)
    
    return Math.min(10, frequency * 0.1 + recency * 5);
  }

  /**
   * Record access for pattern analysis
   */
  private recordAccess(key: string, startTime: number): void {
    const accessTime = performance.now() - startTime;
    
    this.accessLog.push({
      key,
      timestamp: Date.now()
    });

    // Trim access log
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500);
    }

    // Update average access time
    this.stats.averageAccessTime = (this.stats.averageAccessTime * 0.9) + (accessTime * 0.1);
  }

  /**
   * Get current cache size in bytes
   */
  private getCurrentSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    const totalRequests = this.totalHits + this.totalMisses;
    
    this.stats = {
      hitRate: totalRequests > 0 ? this.totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.totalMisses / totalRequests : 0,
      evictionRate: this.totalAccesses > 0 ? this.totalEvictions / this.totalAccesses : 0,
      averageAccessTime: this.stats.averageAccessTime,
      memoryUsage: this.getCurrentSize(),
      entryCount: this.cache.size,
      compressionRatio: 1.0 // Would calculate actual ratio if compression is used
    };
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.totalAccesses = 0;
    this.totalHits = 0;
    this.totalMisses = 0;
    this.totalEvictions = 0;
    this.stats = {
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      entryCount: 0,
      compressionRatio: 1.0
    };
  }

  /**
   * Persist cache entry to storage
   */
  private async persistEntry(entry: CacheEntry<T>): Promise<void> {
    try {
      // Would implement persistence to IndexedDB or other storage
      localStorage.setItem(`nerf-cache-${entry.key}`, JSON.stringify({
        data: entry.data,
        timestamp: entry.accessTime,
        expiry: entry.expiryTime
      }));
    } catch (error) {
      console.warn('Failed to persist cache entry:', error);
    }
  }

  /**
   * Setup periodic maintenance tasks
   */
  private setupPeriodicMaintenance(): void {
    setInterval(() => {
      this.cleanupExpired();
      this.optimizeARCParameters();
      this.updateStats();
    }, 30000); // Every 30 seconds
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Optimize ARC parameters based on performance
   */
  private optimizeARCParameters(): void {
    // Adjust p parameter based on recent hit rates
    const recentHitRate = this.stats.hitRate;
    
    if (recentHitRate < 0.5) {
      // Poor hit rate, adjust parameters
      this.p = Math.max(0, this.p - 1);
    } else if (recentHitRate > 0.8) {
      // Good hit rate, maintain current parameters
      this.p = Math.min(this.config.maxSize, this.p + 0.5);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
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
  }

  /**
   * Export cache state for debugging
   */
  exportState(): any {
    return {
      config: this.config,
      stats: this.stats,
      entryCount: this.cache.size,
      memoryUsage: this.getCurrentSize(),
      arcLists: {
        t1: Array.from(this.t1),
        t2: Array.from(this.t2),
        b1: Array.from(this.b1),
        b2: Array.from(this.b2),
        p: this.p
      }
    };
  }

  /**
   * Dispose of cache manager
   */
  dispose(): void {
    this.clear();
    // Clear any intervals or listeners
  }
}