/**
 * Repository pattern for NeRF model data access
 */

import { NeRFStorage, StoredModel } from '../database/NeRFStorage';
import { CacheManager } from '../database/CacheManager';
import { NerfModel } from '../core/NerfModel';

export interface ModelQuery {
  name?: string;
  quality?: 'low' | 'medium' | 'high';
  tags?: string[];
  minSize?: number;
  maxSize?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: 'name' | 'created' | 'size' | 'quality';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ModelCreateRequest {
  name: string;
  data: ArrayBuffer;
  quality?: 'low' | 'medium' | 'high';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ModelUpdateRequest {
  name?: string;
  quality?: 'low' | 'medium' | 'high';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ModelStats {
  totalModels: number;
  totalSize: number;
  averageSize: number;
  qualityDistribution: Record<string, number>;
  tagDistribution: Record<string, number>;
  storageUtilization: {
    used: number;
    available: number;
    percentage: number;
  };
}

export class ModelRepository {
  private storage: NeRFStorage;
  private cache: CacheManager<StoredModel>;
  private modelCache: CacheManager<NerfModel>;

  constructor() {
    this.storage = new NeRFStorage();
    
    // Cache for stored model metadata
    this.cache = new CacheManager<StoredModel>({
      maxMemoryMB: 64,
      maxEntries: 200,
      defaultTTL: 60 * 60 * 1000, // 1 hour
      evictionPolicy: 'hybrid'
    });
    
    // Cache for instantiated NeRF models
    this.modelCache = new CacheManager<NerfModel>({
      maxMemoryMB: 512,
      maxEntries: 20,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      evictionPolicy: 'lru'
    });
  }

  /**
   * Initialize the repository
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    console.log('ModelRepository initialized');
  }

  /**
   * Create a new model
   */
  async create(request: ModelCreateRequest): Promise<string> {
    const id = this.generateModelId(request.name);
    
    await this.storage.storeModel(
      id,
      request.name,
      request.data,
      {
        quality: request.quality || 'medium',
        tags: request.tags || [],
        ...request.metadata
      }
    );
    
    console.log(`Model '${request.name}' created with ID: ${id}`);
    return id;
  }

  /**
   * Find a model by ID
   */
  async findById(id: string): Promise<StoredModel | null> {
    // Check cache first
    const cached = await this.cache.get(id);
    if (cached) {
      return cached;
    }
    
    // Fetch from storage
    const model = await this.storage.getModel(id);
    
    // Cache if found
    if (model) {
      await this.cache.set(id, model, {
        priority: 0.7,
        tags: ['model-metadata']
      });
    }
    
    return model;
  }

  /**
   * Find models matching query criteria
   */
  async find(query: ModelQuery = {}): Promise<StoredModel[]> {
    // Get all models matching basic filters
    let models = await this.storage.listModels({
      quality: query.quality,
      minSize: query.minSize,
      maxSize: query.maxSize,
      tags: query.tags
    });
    
    // Apply additional filters
    if (query.name) {
      const nameFilter = query.name.toLowerCase();
      models = models.filter(model => 
        model.name.toLowerCase().includes(nameFilter)
      );
    }
    
    if (query.createdAfter) {
      const afterTime = query.createdAfter.getTime();
      models = models.filter(model => model.metadata.created >= afterTime);
    }
    
    if (query.createdBefore) {
      const beforeTime = query.createdBefore.getTime();
      models = models.filter(model => model.metadata.created <= beforeTime);
    }
    
    // Apply sorting
    if (query.sortBy) {
      models.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (query.sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'created':
            aValue = a.metadata.created;
            bValue = b.metadata.created;
            break;
          case 'size':
            aValue = a.metadata.size;
            bValue = b.metadata.size;
            break;
          case 'quality':
            const qualityOrder = { 'low': 0, 'medium': 1, 'high': 2 };
            aValue = qualityOrder[a.metadata.quality];
            bValue = qualityOrder[b.metadata.quality];
            break;
          default:
            return 0;
        }
        
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return query.sortOrder === 'desc' ? -comparison : comparison;
      });
    }
    
    // Apply pagination
    if (query.offset || query.limit) {
      const offset = query.offset || 0;
      const limit = query.limit || models.length;
      models = models.slice(offset, offset + limit);
    }
    
    return models;
  }

  /**
   * Update a model
   */
  async update(id: string, request: ModelUpdateRequest): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }
    
    const updates: any = {};
    
    if (request.name !== undefined) {
      updates.metadata = { name: request.name };
    }
    
    if (request.quality !== undefined) {
      updates.metadata = { ...updates.metadata, quality: request.quality };
    }
    
    if (request.tags !== undefined) {
      updates.metadata = { ...updates.metadata, tags: request.tags };
    }
    
    if (request.metadata !== undefined) {
      updates.metadata = { ...updates.metadata, ...request.metadata };
    }
    
    await this.storage.updateModel(id, updates);
    
    // Invalidate caches
    await this.cache.delete(id);
    await this.modelCache.delete(id);
    
    console.log(`Model '${id}' updated`);
    return true;
  }

  /**
   * Delete a model
   */
  async delete(id: string): Promise<boolean> {
    const success = await this.storage.deleteModel(id);
    
    if (success) {
      // Clear from caches
      await this.cache.delete(id);
      await this.modelCache.delete(id);
      console.log(`Model '${id}' deleted`);
    }
    
    return success;
  }

  /**
   * Get an instantiated NeRF model
   */
  async getModel(id: string): Promise<NerfModel | null> {
    // Check model cache first
    const cachedModel = await this.modelCache.get(id);
    if (cachedModel) {
      return cachedModel;
    }
    
    // Get stored model data
    const storedModel = await this.findById(id);
    if (!storedModel) {
      return null;
    }
    
    // Create NeRF model instance
    const nerfModel = new NerfModel();
    await nerfModel.load(storedModel.data);
    
    // Apply stored metadata
    nerfModel.setQuality(storedModel.metadata.quality);
    
    // Cache the instantiated model
    await this.modelCache.set(id, nerfModel, {
      priority: 0.8,
      tags: ['nerf-model'],
      ttl: 30 * 60 * 1000 // 30 minutes
    });
    
    return nerfModel;
  }

  /**
   * Update model performance metrics
   */
  async updatePerformanceMetrics(
    id: string, 
    metrics: {
      avgFPS?: number;
      avgFrameTime?: number;
      memoryUsage?: number;
    }
  ): Promise<void> {
    await this.storage.updateModel(id, {
      performance: {
        ...metrics,
        lastBenchmark: Date.now()
      }
    });
    
    // Invalidate cache to force fresh data
    await this.cache.delete(id);
  }

  /**
   * Get repository statistics
   */
  async getStats(): Promise<ModelStats> {
    const models = await this.find();
    const storageStats = await this.storage.getStorageStats();
    
    const totalSize = models.reduce((sum, model) => sum + model.metadata.size, 0);
    const averageSize = models.length > 0 ? totalSize / models.length : 0;
    
    // Quality distribution
    const qualityDistribution: Record<string, number> = {};
    models.forEach(model => {
      const quality = model.metadata.quality;
      qualityDistribution[quality] = (qualityDistribution[quality] || 0) + 1;
    });
    
    // Tag distribution
    const tagDistribution: Record<string, number> = {};
    models.forEach(model => {
      model.metadata.tags.forEach(tag => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });
    });
    
    return {
      totalModels: models.length,
      totalSize,
      averageSize,
      qualityDistribution,
      tagDistribution,
      storageUtilization: {
        used: storageStats.usedQuota,
        available: storageStats.availableQuota,
        percentage: storageStats.availableQuota > 0 
          ? (storageStats.usedQuota / storageStats.availableQuota) * 100 
          : 0
      }
    };
  }

  /**
   * Search models by name or tags
   */
  async search(searchTerm: string, options: {
    searchInNames?: boolean;
    searchInTags?: boolean;
    fuzzyMatch?: boolean;
    limit?: number;
  } = {}): Promise<StoredModel[]> {
    const {
      searchInNames = true,
      searchInTags = true,
      fuzzyMatch = true,
      limit = 50
    } = options;
    
    const allModels = await this.find();
    const searchLower = searchTerm.toLowerCase();
    
    const matches = allModels.filter(model => {
      let matches = false;
      
      if (searchInNames) {
        const nameMatch = fuzzyMatch 
          ? model.name.toLowerCase().includes(searchLower)
          : model.name.toLowerCase() === searchLower;
        matches = matches || nameMatch;
      }
      
      if (searchInTags) {
        const tagMatch = model.metadata.tags.some(tag => 
          fuzzyMatch 
            ? tag.toLowerCase().includes(searchLower)
            : tag.toLowerCase() === searchLower
        );
        matches = matches || tagMatch;
      }
      
      return matches;
    });
    
    return matches.slice(0, limit);
  }

  /**
   * Bulk operations
   */
  async bulkDelete(ids: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[] = [];
    
    for (const id of ids) {
      try {
        const success = await this.delete(id);
        if (success) {
          deleted.push(id);
        } else {
          failed.push(id);
        }
      } catch (error) {
        failed.push(id);
        console.error(`Failed to delete model '${id}':`, error);
      }
    }
    
    return { deleted, failed };
  }

  /**
   * Export models
   */
  async export(ids?: string[]): Promise<Blob> {
    return await this.storage.exportModels(ids);
  }

  /**
   * Import models
   */
  async import(file: File, overwriteExisting = false): Promise<number> {
    const imported = await this.storage.importModels(file, overwriteExisting);
    
    // Clear caches to ensure fresh data
    this.cache.clear();
    this.modelCache.clear();
    
    return imported;
  }

  /**
   * Optimize storage by cleaning up unused data
   */
  async optimize(): Promise<{
    freedSpace: number;
    cleanedEntries: number;
  }> {
    const initialStats = await this.getStats();
    
    // Clear expired cache entries
    const cacheCleanup1 = this.cache.clearByTags(['expired']);
    const cacheCleanup2 = this.modelCache.clearByTags(['expired']);
    
    const finalStats = await this.getStats();
    
    return {
      freedSpace: initialStats.totalSize - finalStats.totalSize,
      cleanedEntries: cacheCleanup1 + cacheCleanup2
    };
  }

  // Private helper methods
  
  private generateModelId(name: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${safeName}_${timestamp}_${randomSuffix}`;
  }

  /**
   * Dispose of repository resources
   */
  dispose(): void {
    this.storage.dispose();
    this.cache.dispose();
    this.modelCache.dispose();
    console.log('ModelRepository disposed');
  }
}