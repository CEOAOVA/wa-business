/**
 * Sistema de caching distribuido para escalabilidad
 * Multi-level cache con memory + Redis (simulado) y gestión automática
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { monitoringService } from '../monitoring/monitoring-service';

export interface CacheConfig {
  enableMemoryCache: boolean;
  enableDistributedCache: boolean;
  memoryMaxSize: number; // MB
  defaultTTL: number; // segundos
  cleanupInterval: number; // segundos
  compressionThreshold: number; // bytes
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number;
}

export interface CacheStats {
  memoryCache: {
    size: number;
    items: number;
    hitRate: number;
    maxSize: number;
  };
  distributedCache: {
    connected: boolean;
    hitRate: number;
  };
  overall: {
    totalRequests: number;
    totalHits: number;
    hitRate: number;
  };
}

export class CacheService extends EventEmitter {
  private config: CacheConfig;
  private memoryCache = new Map<string, CacheItem>();
  private memoryCacheSize = 0;
  private stats = {
    requests: 0,
    hits: 0,
    memoryHits: 0,
    distributedHits: 0,
    evictions: 0
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<CacheConfig>) {
    super();
    
    this.config = {
      enableMemoryCache: true,
      enableDistributedCache: false, // Redis será agregado después
      memoryMaxSize: 100, // 100 MB
      defaultTTL: 300, // 5 minutos
      cleanupInterval: 60, // 1 minuto
      compressionThreshold: 1024, // 1KB
      ...config
    };

    this.startCleanupProcess();
    
    logger.info('Cache service initialized', {
      service: 'cache',
      config: this.config
    });
  }

  /**
   * Inicia proceso de limpieza automática
   */
  private startCleanupProcess(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval * 1000);
  }

  /**
   * Obtiene un item del cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    this.stats.requests++;
    const start = Date.now();

    try {
      // 1. Intentar memory cache primero
      if (this.config.enableMemoryCache) {
        const memoryResult = this.getFromMemory<T>(key);
        if (memoryResult !== null) {
          this.stats.hits++;
          this.stats.memoryHits++;
          
          const duration = Date.now() - start;
          
          logger.debug('Cache hit (memory)', {
            service: 'cache',
            key: this.maskKey(key),
            responseTime: duration
          });
          
          return memoryResult;
        }
      }

      // 2. Intentar distributed cache (Redis simulado)
      if (this.config.enableDistributedCache) {
        const distributedResult = await this.getFromDistributed<T>(key);
        if (distributedResult !== null) {
          this.stats.hits++;
          this.stats.distributedHits++;
          
          // Guardar en memory cache para próximas consultas
          if (this.config.enableMemoryCache) {
            await this.setInMemory(key, distributedResult, this.config.defaultTTL);
          }
          
          const duration = Date.now() - start;
          
          logger.debug('Cache hit (distributed)', {
            service: 'cache',
            key: this.maskKey(key),
            responseTime: duration
          });
          
          return distributedResult;
        }
      }

      // 3. Cache miss
      const duration = Date.now() - start;
      logger.debug('Cache miss', {
        service: 'cache',
        key: this.maskKey(key),
        responseTime: duration
      });
      
      return null;
      
    } catch (error) {
      logger.error('Cache get error', error, {
        service: 'cache',
        key: this.maskKey(key)
      });
      return null;
    }
  }

  /**
   * Guarda un item en el cache
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    const actualTTL = ttl || this.config.defaultTTL;
    
    try {
      // 1. Guardar en memory cache
      if (this.config.enableMemoryCache) {
        await this.setInMemory(key, value, actualTTL);
      }

      // 2. Guardar en distributed cache
      if (this.config.enableDistributedCache) {
        await this.setInDistributed(key, value, actualTTL);
      }

      logger.debug('Cache set', {
        service: 'cache',
        key: this.maskKey(key),
        ttl: actualTTL
      });
      
      return true;
      
    } catch (error) {
      logger.error('Cache set error', error, {
        service: 'cache',
        key: this.maskKey(key)
      });
      return false;
    }
  }

  /**
   * Elimina un item del cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;

      // Eliminar de memory cache
      if (this.config.enableMemoryCache) {
        const item = this.memoryCache.get(key);
        if (item) {
          this.memoryCacheSize -= item.size;
          this.memoryCache.delete(key);
          deleted = true;
        }
      }

      // Eliminar de distributed cache
      if (this.config.enableDistributedCache) {
        await this.deleteFromDistributed(key);
        deleted = true;
      }

      if (deleted) {
        logger.debug('Cache delete', {
          service: 'cache',
          key: this.maskKey(key)
        });
      }
      
      return deleted;
      
    } catch (error) {
      logger.error('Cache delete error', error, {
        service: 'cache',
        key: this.maskKey(key)
      });
      return false;
    }
  }

  /**
   * Invalida cache por patrón
   */
  async invalidate(pattern: string): Promise<number> {
    let invalidatedCount = 0;
    
    try {
      // Invalidar en memory cache
      if (this.config.enableMemoryCache) {
        const keysToDelete: string[] = [];
        
        for (const [key] of this.memoryCache) {
          if (this.matchesPattern(key, pattern)) {
            keysToDelete.push(key);
          }
        }
        
        for (const key of keysToDelete) {
          const item = this.memoryCache.get(key);
          if (item) {
            this.memoryCacheSize -= item.size;
            this.memoryCache.delete(key);
            invalidatedCount++;
          }
        }
      }

      // Invalidar en distributed cache
      if (this.config.enableDistributedCache) {
        // En Redis real, usaríamos SCAN + DEL
        // Por ahora solo simulamos
      }

      logger.info('Cache invalidation completed', {
        service: 'cache',
        pattern,
        invalidatedCount
      });
      
      return invalidatedCount;
      
    } catch (error) {
      logger.error('Cache invalidation error', error, {
        service: 'cache',
        pattern
      });
      return 0;
    }
  }

  /**
   * MEMORY CACHE METHODS
   */

  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    
    if (!item) {
      return null;
    }

    // Verificar TTL
    const now = Date.now();
    const expireTime = item.createdAt.getTime() + (item.ttl * 1000);
    
    if (now > expireTime) {
      // Item expirado
      this.memoryCacheSize -= item.size;
      this.memoryCache.delete(key);
      return null;
    }

    // Actualizar estadísticas de acceso
    item.accessCount++;
    item.lastAccessed = new Date();
    
    return item.value as T;
  }

  private async setInMemory<T>(key: string, value: T, ttl: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const size = new Blob([serialized]).size;
    
    // Verificar límite de memoria
    const maxSizeBytes = this.config.memoryMaxSize * 1024 * 1024;
    if (this.memoryCacheSize + size > maxSizeBytes) {
      await this.evictLeastUsed(size);
    }

    const item: CacheItem<T> = {
      key,
      value,
      ttl,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessed: new Date(),
      size
    };

    // Eliminar item existente si existe
    const existingItem = this.memoryCache.get(key);
    if (existingItem) {
      this.memoryCacheSize -= existingItem.size;
    }

    this.memoryCache.set(key, item);
    this.memoryCacheSize += size;
  }

  /**
   * DISTRIBUTED CACHE METHODS (Redis simulado)
   */

  private async getFromDistributed<T>(key: string): Promise<T | null> {
    // Simulación de Redis
    // En implementación real: await redis.get(key)
    return null;
  }

  private async setInDistributed<T>(key: string, value: T, ttl: number): Promise<void> {
    // Simulación de Redis
    // En implementación real: await redis.setex(key, ttl, JSON.stringify(value))
  }

  private async deleteFromDistributed(key: string): Promise<void> {
    // Simulación de Redis
    // En implementación real: await redis.del(key)
  }

  /**
   * CACHE MANAGEMENT
   */

  private async evictLeastUsed(requiredSize: number): Promise<void> {
    // Obtener items ordenados por menor uso
    const items = Array.from(this.memoryCache.entries())
      .map(([key, item]) => ({ key, item }))
      .sort((a, b) => {
        // Ordenar por: menor acceso, más antiguo
        if (a.item.accessCount !== b.item.accessCount) {
          return a.item.accessCount - b.item.accessCount;
        }
        return a.item.createdAt.getTime() - b.item.createdAt.getTime();
      });

    let freedSpace = 0;
    let evictedCount = 0;

    for (const { key, item } of items) {
      this.memoryCache.delete(key);
      this.memoryCacheSize -= item.size;
      freedSpace += item.size;
      evictedCount++;
      
      if (freedSpace >= requiredSize) {
        break;
      }
    }

    this.stats.evictions += evictedCount;
    
    logger.debug('Cache eviction completed', {
      service: 'cache',
      evictedCount,
      freedSpace,
      requiredSize
    });
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    let freedSpace = 0;

    for (const [key, item] of this.memoryCache.entries()) {
      const expireTime = item.createdAt.getTime() + (item.ttl * 1000);
      
      if (now > expireTime) {
        this.memoryCache.delete(key);
        this.memoryCacheSize -= item.size;
        freedSpace += item.size;
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cache cleanup completed', {
        service: 'cache',
        cleanedCount,
        freedSpace,
        remainingItems: this.memoryCache.size
      });
    }
  }

  /**
   * UTILITY METHODS
   */

  private matchesPattern(key: string, pattern: string): boolean {
    // Convertir patrón a regex simple (* = .*)
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '***' + key.substring(key.length - 4);
  }

  /**
   * PUBLIC API
   */

  getStats(): CacheStats {
    const totalRequests = this.stats.requests || 1; // Evitar división por cero
    
    return {
      memoryCache: {
        size: Math.round(this.memoryCacheSize / 1024 / 1024 * 100) / 100, // MB
        items: this.memoryCache.size,
        hitRate: Math.round(this.stats.memoryHits / totalRequests * 100),
        maxSize: this.config.memoryMaxSize
      },
      distributedCache: {
        connected: this.config.enableDistributedCache,
        hitRate: Math.round(this.stats.distributedHits / totalRequests * 100)
      },
      overall: {
        totalRequests: this.stats.requests,
        totalHits: this.stats.hits,
        hitRate: Math.round(this.stats.hits / totalRequests * 100)
      }
    };
  }

  /**
   * Métodos de conveniencia para casos específicos
   */

  // Cache para conversaciones
  async cacheConversation(conversationId: string, data: any): Promise<void> {
    await this.set(`conversation:${conversationId}`, data, 3600); // 1 hora
  }

  async getCachedConversation(conversationId: string): Promise<any> {
    return await this.get(`conversation:${conversationId}`);
  }

  // Cache para inventario SOAP
  async cacheInventory(productCode: string, posId: string, data: any): Promise<void> {
    await this.set(`inventory:${posId}:${productCode}`, data, 300); // 5 minutos
  }

  async getCachedInventory(productCode: string, posId: string): Promise<any> {
    return await this.get(`inventory:${posId}:${productCode}`);
  }

  // Cache para resultados de funciones LLM
  async cacheFunctionResult(functionName: string, args: any, result: any): Promise<void> {
    const argsHash = this.hashObject(args);
    await this.set(`function:${functionName}:${argsHash}`, result, 600); // 10 minutos
  }

  async getCachedFunctionResult(functionName: string, args: any): Promise<any> {
    const argsHash = this.hashObject(args);
    return await this.get(`function:${functionName}:${argsHash}`);
  }

  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 16);
  }

  // Invalidación específica
  async invalidateConversations(): Promise<number> {
    return await this.invalidate('conversation:*');
  }

  async invalidateInventory(): Promise<number> {
    return await this.invalidate('inventory:*');
  }

  async invalidateFunctionResults(): Promise<number> {
    return await this.invalidate('function:*');
  }

  /**
   * Cleanup al cerrar la aplicación
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.memoryCache.clear();
    this.memoryCacheSize = 0;
    
    logger.info('Cache service destroyed', {
      service: 'cache'
    });
  }
}

// Exportar instancia singleton
export const cacheService = new CacheService(); 