/**
 * NeRF model storage and caching system with IndexedDB backend
 */

export interface StoredModel {
  id: string;
  name: string;
  data: ArrayBuffer;
  metadata: {
    version: string;
    created: number;
    modified: number;
    size: number;
    resolution: [number, number, number];
    quality: 'low' | 'medium' | 'high';
    tags: string[];
  };
  performance: {
    avgFPS: number;
    avgFrameTime: number;
    memoryUsage: number;
    lastBenchmark: number;
  };
}

export interface StorageStats {
  totalModels: number;
  totalSize: number; // bytes
  usedQuota: number;
  availableQuota: number;
  cacheHitRate: number;
}

export class NeRFStorage {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'NeRFEdgeKit';
  private readonly dbVersion = 1;
  private readonly storeName = 'models';
  private isInitialized = false;
  
  // In-memory cache for frequently accessed models
  private memoryCache: Map<string, StoredModel> = new Map();
  private readonly maxCacheSize = 5; // Number of models to keep in memory
  private cacheHits = 0;
  private cacheRequests = 0;

  /**
   * Initialize the storage system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB: ' + request.error));
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('NeRF storage initialized successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create models object store
        const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
        
        // Create indexes for efficient queries
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('created', 'metadata.created', { unique: false });
        store.createIndex('quality', 'metadata.quality', { unique: false });
        store.createIndex('size', 'metadata.size', { unique: false });
        
        console.log('NeRF storage database schema created');
      };
    });
  }

  /**
   * Store a NeRF model
   */
  async storeModel(
    id: string,
    name: string,
    data: ArrayBuffer, 
    metadata: Partial<StoredModel['metadata']> = {},
    performance: Partial<StoredModel['performance']> = {}
  ): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error('Storage not initialized');
    }

    const now = Date.now();
    const storedModel: StoredModel = {
      id,
      name,
      data,
      metadata: {
        version: '1.0.0',
        created: now,
        modified: now,
        size: data.byteLength,
        resolution: [512, 512, 512],
        quality: 'medium',
        tags: [],
        ...metadata
      },
      performance: {
        avgFPS: 0,
        avgFrameTime: 0,
        memoryUsage: 0,
        lastBenchmark: 0,
        ...performance
      }
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(storedModel);
      
      request.onsuccess = () => {
        // Update memory cache
        this.updateMemoryCache(id, storedModel);
        console.log(`Model '${name}' stored successfully (${(data.byteLength / 1024 / 1024).toFixed(1)}MB)`);
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to store model: ' + request.error));
      };
    });
  }

  /**
   * Retrieve a NeRF model
   */
  async getModel(id: string): Promise<StoredModel | null> {
    this.cacheRequests++;
    
    // Check memory cache first
    if (this.memoryCache.has(id)) {
      this.cacheHits++;
      console.log(`Model '${id}' retrieved from memory cache`);
      return this.memoryCache.get(id)!;
    }

    if (!this.isInitialized || !this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const model = request.result as StoredModel | undefined;
        if (model) {
          this.updateMemoryCache(id, model);
          console.log(`Model '${id}' retrieved from IndexedDB`);
        }
        resolve(model || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to retrieve model: ' + request.error));
      };
    });
  }

  /**
   * List all stored models with optional filtering
   */
  async listModels(filter?: {
    quality?: 'low' | 'medium' | 'high';
    minSize?: number;
    maxSize?: number;
    tags?: string[];
  }): Promise<StoredModel[]> {
    if (!this.isInitialized || !this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let models = request.result as StoredModel[];
        
        // Apply filters
        if (filter) {
          models = models.filter(model => {
            if (filter.quality && model.metadata.quality !== filter.quality) {
              return false;
            }
            if (filter.minSize && model.metadata.size < filter.minSize) {
              return false;
            }
            if (filter.maxSize && model.metadata.size > filter.maxSize) {
              return false;
            }
            if (filter.tags && filter.tags.length > 0) {
              const hasTag = filter.tags.some(tag => model.metadata.tags.includes(tag));
              if (!hasTag) return false;
            }
            return true;
          });
        }
        
        // Sort by creation date (newest first)
        models.sort((a, b) => b.metadata.created - a.metadata.created);
        
        resolve(models);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to list models: ' + request.error));
      };
    });
  }

  /**
   * Update model metadata or performance data
   */
  async updateModel(
    id: string, 
    updates: {
      metadata?: Partial<StoredModel['metadata']>;
      performance?: Partial<StoredModel['performance']>;
    }
  ): Promise<void> {
    const model = await this.getModel(id);
    if (!model) {
      throw new Error(`Model '${id}' not found`);
    }

    // Apply updates
    if (updates.metadata) {
      model.metadata = { ...model.metadata, ...updates.metadata };
      model.metadata.modified = Date.now();
    }
    if (updates.performance) {
      model.performance = { ...model.performance, ...updates.performance };
    }

    // Store updated model
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(model);
      
      request.onsuccess = () => {
        this.updateMemoryCache(id, model);
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to update model: ' + request.error));
      };
    });
  }

  /**
   * Delete a stored model
   */
  async deleteModel(id: string): Promise<boolean> {
    if (!this.isInitialized || !this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        this.memoryCache.delete(id);
        console.log(`Model '${id}' deleted`);
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to delete model: ' + request.error));
      };
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const models = await this.listModels();
    const totalSize = models.reduce((sum, model) => sum + model.metadata.size, 0);
    
    // Get storage quota information
    let usedQuota = 0;
    let availableQuota = 0;
    
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        usedQuota = estimate.usage || 0;
        availableQuota = estimate.quota || 0;
      } catch (error) {
        console.warn('Failed to get storage estimate:', error);
      }
    }
    
    const cacheHitRate = this.cacheRequests > 0 ? this.cacheHits / this.cacheRequests : 0;
    
    return {
      totalModels: models.length,
      totalSize,
      usedQuota,
      availableQuota,
      cacheHitRate
    };
  }

  /**
   * Clear all stored models
   */
  async clearAll(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        this.memoryCache.clear();
        this.cacheHits = 0;
        this.cacheRequests = 0;
        console.log('All stored models cleared');
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to clear storage: ' + request.error));
      };
    });
  }

  /**
   * Export models to a downloadable file
   */
  async exportModels(modelIds?: string[]): Promise<Blob> {
    let models: StoredModel[];
    
    if (modelIds) {
      models = [];
      for (const id of modelIds) {
        const model = await this.getModel(id);
        if (model) models.push(model);
      }
    } else {
      models = await this.listModels();
    }
    
    // Create export data structure
    const exportData = {
      version: '1.0.0',
      exported: Date.now(),
      models: models.map(model => ({
        ...model,
        data: Array.from(new Uint8Array(model.data)) // Convert ArrayBuffer to array for JSON
      }))
    };
    
    const jsonString = JSON.stringify(exportData);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Import models from exported file
   */
  async importModels(file: File, overwriteExisting = false): Promise<number> {
    const text = await file.text();
    const importData = JSON.parse(text);
    
    if (!importData.models || !Array.isArray(importData.models)) {
      throw new Error('Invalid import file format');
    }
    
    let importedCount = 0;
    
    for (const modelData of importData.models) {
      try {
        // Check if model already exists
        const existing = await this.getModel(modelData.id);
        if (existing && !overwriteExisting) {
          console.warn(`Model '${modelData.id}' already exists, skipping`);
          continue;
        }
        
        // Convert array back to ArrayBuffer
        const data = new Uint8Array(modelData.data).buffer;
        
        await this.storeModel(
          modelData.id,
          modelData.name,
          data,
          modelData.metadata,
          modelData.performance
        );
        
        importedCount++;
      } catch (error) {
        console.error(`Failed to import model '${modelData.id}':`, error);
      }
    }
    
    console.log(`Imported ${importedCount} models`);
    return importedCount;
  }

  // Private helper methods
  
  private updateMemoryCache(id: string, model: StoredModel): void {
    this.memoryCache.set(id, model);
    
    // Enforce cache size limit
    if (this.memoryCache.size > this.maxCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
  }

  /**
   * Dispose of storage resources
   */
  dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.memoryCache.clear();
    this.isInitialized = false;
    console.log('NeRF storage disposed');
  }
}