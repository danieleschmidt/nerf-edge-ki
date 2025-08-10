/**
 * Progressive NeRF streaming system for large-scale scenes
 */

export interface StreamChunk {
  id: string;
  bounds: [[number, number, number], [number, number, number]];
  data: ArrayBuffer;
  lod: number;
  priority: number;
}

export interface StreamingConfig {
  baseUrl: string;
  cacheSize: number; // MB
  maxConcurrentDownloads: number;
  preloadDistance: number; // World units
  lodBias: number; // LOD selection bias
  predictivePrefetch: boolean;
}

export interface ViewerState {
  position: [number, number, number];
  direction: [number, number, number];
  velocity: [number, number, number];
  fov: number;
}

export class NerfStreamer {
  private config: StreamingConfig;
  private cache: Map<string, StreamChunk> = new Map();
  private loadingChunks: Set<string> = new Set();
  private priorityQueue: StreamChunk[] = [];
  private viewerState: ViewerState | null = null;
  
  // Memory management
  private currentCacheSize = 0; // bytes
  private maxCacheSize: number;
  
  // Predictive loading
  private velocityHistory: [number, number, number][] = [];
  private lastUpdateTime = 0;

  constructor(config: StreamingConfig) {
    this.config = config;
    this.maxCacheSize = config.cacheSize * 1024 * 1024; // Convert MB to bytes
    
    // Start background cache management
    this.startCacheManagement();
  }

  /**
   * Update viewer state for predictive streaming
   */
  updateViewerState(state: ViewerState): void {
    const currentTime = performance.now();
    
    if (this.viewerState) {
      // Calculate velocity if we have previous state
      const dt = (currentTime - this.lastUpdateTime) / 1000;
      if (dt > 0) {
        const velocity: [number, number, number] = [
          (state.position[0] - this.viewerState.position[0]) / dt,
          (state.position[1] - this.viewerState.position[1]) / dt,
          (state.position[2] - this.viewerState.position[2]) / dt
        ];
        
        this.updateVelocityHistory(velocity);
      }
    }
    
    this.viewerState = state;
    this.lastUpdateTime = currentTime;
    
    // Trigger streaming updates
    this.updateStreamingPriorities();
  }

  /**
   * Request and prioritize chunks based on viewer state
   */
  private updateStreamingPriorities(): void {
    if (!this.viewerState) return;
    
    // Calculate required chunks based on current view
    const requiredChunks = this.calculateRequiredChunks();
    
    // Update priority queue
    this.priorityQueue = requiredChunks
      .map(chunkId => this.createChunkRequest(chunkId))
      .sort((a, b) => b.priority - a.priority);
    
    // Start downloads for high priority chunks
    this.processDownloadQueue();
  }

  /**
   * Calculate which chunks are needed for current view
   */
  private calculateRequiredChunks(): string[] {
    if (!this.viewerState) return [];
    
    const chunks: string[] = [];
    const [vx, vy, vz] = this.viewerState.position;
    const viewDistance = this.config.preloadDistance;
    
    // Get frustum bounds (simplified as sphere for now)
    const minBounds = [vx - viewDistance, vy - viewDistance, vz - viewDistance];
    const maxBounds = [vx + viewDistance, vy + viewDistance, vz + viewDistance];
    
    // Generate chunk IDs within view bounds
    const chunkSize = 10; // 10 world units per chunk
    for (let x = Math.floor(minBounds[0] / chunkSize); x <= Math.floor(maxBounds[0] / chunkSize); x++) {
      for (let y = Math.floor(minBounds[1] / chunkSize); y <= Math.floor(maxBounds[1] / chunkSize); y++) {
        for (let z = Math.floor(minBounds[2] / chunkSize); z <= Math.floor(maxBounds[2] / chunkSize); z++) {
          const chunkId = `${x}_${y}_${z}`;
          chunks.push(chunkId);
        }
      }
    }
    
    // Add predictive chunks if enabled
    if (this.config.predictivePrefetch) {
      chunks.push(...this.getPredictiveChunks());
    }
    
    return chunks;
  }

  /**
   * Get chunks that viewer is likely to need soon
   */
  private getPredictiveChunks(): string[] {
    if (!this.viewerState || this.velocityHistory.length < 2) return [];
    
    // Predict future position based on velocity
    const avgVelocity = this.getAverageVelocity();
    const lookAheadTime = 2.0; // seconds
    
    const futurePosition: [number, number, number] = [
      this.viewerState.position[0] + avgVelocity[0] * lookAheadTime,
      this.viewerState.position[1] + avgVelocity[1] * lookAheadTime,
      this.viewerState.position[2] + avgVelocity[2] * lookAheadTime
    ];
    
    // Get chunks around predicted position
    const chunkSize = 10;
    const preloadRadius = this.config.preloadDistance * 0.5;
    
    const chunks: string[] = [];
    const [fx, fy, fz] = futurePosition;
    
    for (let x = Math.floor((fx - preloadRadius) / chunkSize); x <= Math.floor((fx + preloadRadius) / chunkSize); x++) {
      for (let y = Math.floor((fy - preloadRadius) / chunkSize); y <= Math.floor((fy + preloadRadius) / chunkSize); y++) {
        for (let z = Math.floor((fz - preloadRadius) / chunkSize); z <= Math.floor((fz + preloadRadius) / chunkSize); z++) {
          chunks.push(`${x}_${y}_${z}`);
        }
      }
    }
    
    return chunks;
  }

  /**
   * Create chunk request with priority calculation
   */
  private createChunkRequest(chunkId: string): StreamChunk {
    const [x, y, z] = chunkId.split('_').map(Number);
    const chunkSize = 10;
    
    const bounds: [[number, number, number], [number, number, number]] = [
      [x * chunkSize, y * chunkSize, z * chunkSize],
      [(x + 1) * chunkSize, (y + 1) * chunkSize, (z + 1) * chunkSize]
    ];
    
    const priority = this.calculateChunkPriority(bounds);
    const lod = this.calculateLOD(bounds);
    
    return {
      id: chunkId,
      bounds,
      data: new ArrayBuffer(0), // Will be filled on download
      lod,
      priority
    };
  }

  /**
   * Calculate chunk priority based on distance and view direction
   */
  private calculateChunkPriority(bounds: [[number, number, number], [number, number, number]]): number {
    if (!this.viewerState) return 0;
    
    // Calculate chunk center
    const center = [
      (bounds[0][0] + bounds[1][0]) * 0.5,
      (bounds[0][1] + bounds[1][1]) * 0.5,
      (bounds[0][2] + bounds[1][2]) * 0.5
    ];
    
    // Distance to viewer
    const [vx, vy, vz] = this.viewerState.position;
    const distance = Math.sqrt(
      Math.pow(center[0] - vx, 2) +
      Math.pow(center[1] - vy, 2) +
      Math.pow(center[2] - vz, 2)
    );
    
    // Direction alignment (dot product with view direction)
    const toChunk = [center[0] - vx, center[1] - vy, center[2] - vz];
    const toChunkLength = Math.sqrt(toChunk[0] * toChunk[0] + toChunk[1] * toChunk[1] + toChunk[2] * toChunk[2]);
    
    if (toChunkLength === 0) return 1000; // Max priority for chunks at viewer position
    
    const normalizedToChunk = [toChunk[0] / toChunkLength, toChunk[1] / toChunkLength, toChunk[2] / toChunkLength];
    const alignment = Math.max(0,
      normalizedToChunk[0] * this.viewerState.direction[0] +
      normalizedToChunk[1] * this.viewerState.direction[1] +
      normalizedToChunk[2] * this.viewerState.direction[2]
    );
    
    // Priority decreases with distance, increases with alignment
    const distancePriority = 1 / (1 + distance * 0.1);
    const alignmentPriority = alignment * 2;
    
    return distancePriority + alignmentPriority;
  }

  /**
   * Calculate appropriate LOD for chunk based on distance
   */
  private calculateLOD(bounds: [[number, number, number], [number, number, number]]): number {
    if (!this.viewerState) return 0;
    
    const center = [
      (bounds[0][0] + bounds[1][0]) * 0.5,
      (bounds[0][1] + bounds[1][1]) * 0.5,
      (bounds[0][2] + bounds[1][2]) * 0.5
    ];
    
    const [vx, vy, vz] = this.viewerState.position;
    const distance = Math.sqrt(
      Math.pow(center[0] - vx, 2) +
      Math.pow(center[1] - vy, 2) +
      Math.pow(center[2] - vz, 2)
    );
    
    // LOD 0 = highest quality, LOD 3 = lowest quality
    const baseLOD = Math.floor(distance / 20) + this.config.lodBias;
    return Math.max(0, Math.min(3, baseLOD));
  }

  /**
   * Process download queue with concurrency limits
   */
  private async processDownloadQueue(): Promise<void> {
    const maxConcurrent = this.config.maxConcurrentDownloads;
    const currentDownloads = this.loadingChunks.size;
    
    if (currentDownloads >= maxConcurrent) return;
    
    // Start downloads for highest priority chunks
    const toDownload = this.priorityQueue
      .filter(chunk => !this.cache.has(chunk.id) && !this.loadingChunks.has(chunk.id))
      .slice(0, maxConcurrent - currentDownloads);
    
    for (const chunk of toDownload) {
      this.downloadChunk(chunk);
    }
  }

  /**
   * Download individual chunk
   */
  private async downloadChunk(chunk: StreamChunk): Promise<void> {
    this.loadingChunks.add(chunk.id);
    
    try {
      const url = `${this.config.baseUrl}/chunks/${chunk.id}_lod${chunk.lod}.nerf`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download chunk ${chunk.id}: ${response.statusText}`);
      }
      
      const data = await response.arrayBuffer();
      chunk.data = data;
      
      // Add to cache if we have space
      if (this.currentCacheSize + data.byteLength <= this.maxCacheSize) {
        this.cache.set(chunk.id, chunk);
        this.currentCacheSize += data.byteLength;
        
        console.log(`Loaded chunk ${chunk.id} (LOD ${chunk.lod}, ${data.byteLength} bytes)`);
      }
      
    } catch (error) {
      console.error(`Failed to download chunk ${chunk.id}:`, error);
    } finally {
      this.loadingChunks.delete(chunk.id);
    }
  }

  /**
   * Get loaded chunk data
   */
  getChunk(chunkId: string): StreamChunk | null {
    return this.cache.get(chunkId) || null;
  }

  /**
   * Get all loaded chunks within view frustum
   */
  getVisibleChunks(): StreamChunk[] {
    if (!this.viewerState) return [];
    
    const visibleChunks: StreamChunk[] = [];
    const viewDistance = this.config.preloadDistance;
    
    for (const chunk of this.cache.values()) {
      if (this.isChunkVisible(chunk, viewDistance)) {
        visibleChunks.push(chunk);
      }
    }
    
    return visibleChunks;
  }

  /**
   * Check if chunk is within view distance
   */
  private isChunkVisible(chunk: StreamChunk, viewDistance: number): boolean {
    if (!this.viewerState) return false;
    
    const center = [
      (chunk.bounds[0][0] + chunk.bounds[1][0]) * 0.5,
      (chunk.bounds[0][1] + chunk.bounds[1][1]) * 0.5,
      (chunk.bounds[0][2] + chunk.bounds[1][2]) * 0.5
    ];
    
    const [vx, vy, vz] = this.viewerState.position;
    const distance = Math.sqrt(
      Math.pow(center[0] - vx, 2) +
      Math.pow(center[1] - vy, 2) +
      Math.pow(center[2] - vz, 2)
    );
    
    return distance <= viewDistance;
  }

  /**
   * Update velocity history for predictive loading
   */
  private updateVelocityHistory(velocity: [number, number, number]): void {
    this.velocityHistory.push(velocity);
    
    // Keep only recent history
    if (this.velocityHistory.length > 10) {
      this.velocityHistory.shift();
    }
  }

  /**
   * Get average velocity from history
   */
  private getAverageVelocity(): [number, number, number] {
    if (this.velocityHistory.length === 0) return [0, 0, 0];
    
    const sum = this.velocityHistory.reduce((acc, vel) => [
      acc[0] + vel[0],
      acc[1] + vel[1], 
      acc[2] + vel[2]
    ], [0, 0, 0]);
    
    const count = this.velocityHistory.length;
    return [sum[0] / count, sum[1] / count, sum[2] / count];
  }

  /**
   * Start background cache management
   */
  private startCacheManagement(): void {
    setInterval(() => {
      this.evictLRUChunks();
      this.updateStreamingPriorities();
    }, 5000); // Every 5 seconds
  }

  /**
   * Remove least recently used chunks when cache is full
   */
  private evictLRUChunks(): void {
    if (this.currentCacheSize <= this.maxCacheSize * 0.8) return; // Only evict when 80% full
    
    // Simple LRU: remove chunks farthest from viewer
    const chunks = Array.from(this.cache.values());
    chunks.sort((a, b) => {
      const distanceA = this.calculateDistanceToViewer(a.bounds);
      const distanceB = this.calculateDistanceToViewer(b.bounds);
      return distanceB - distanceA; // Sort by distance descending
    });
    
    // Remove farthest chunks until under limit
    while (this.currentCacheSize > this.maxCacheSize * 0.7 && chunks.length > 0) {
      const chunk = chunks.pop()!;
      this.cache.delete(chunk.id);
      this.currentCacheSize -= chunk.data.byteLength;
      console.log(`Evicted chunk ${chunk.id} from cache`);
    }
  }

  /**
   * Calculate distance from chunk to viewer
   */
  private calculateDistanceToViewer(bounds: [[number, number, number], [number, number, number]]): number {
    if (!this.viewerState) return Infinity;
    
    const center = [
      (bounds[0][0] + bounds[1][0]) * 0.5,
      (bounds[0][1] + bounds[1][1]) * 0.5,
      (bounds[0][2] + bounds[1][2]) * 0.5
    ];
    
    const [vx, vy, vz] = this.viewerState.position;
    return Math.sqrt(
      Math.pow(center[0] - vx, 2) +
      Math.pow(center[1] - vy, 2) +
      Math.pow(center[2] - vz, 2)
    );
  }

  /**
   * Get streaming statistics
   */
  getStats(): {
    cachedChunks: number;
    cacheSize: number;
    loadingChunks: number;
    cacheHitRate: number;
  } {
    return {
      cachedChunks: this.cache.size,
      cacheSize: this.currentCacheSize,
      loadingChunks: this.loadingChunks.size,
      cacheHitRate: 0.85 // Would track this in real implementation
    };
  }

  /**
   * Dispose of streamer resources
   */
  dispose(): void {
    this.cache.clear();
    this.loadingChunks.clear();
    this.priorityQueue = [];
    this.velocityHistory = [];
    this.currentCacheSize = 0;
  }
}