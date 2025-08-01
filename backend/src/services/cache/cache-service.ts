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
  timestamp: number;
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

/**
 * Servicio de Cache con LRU (Least Recently Used) para optimizar memoria
 */
export class CacheService extends EventEmitter {
  private cache: Map<string, CacheItem<any>> = new Map();
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  constructor(maxSize: number = 1000) {
    super();
    
    this.maxSize = maxSize;
    
    // Limpieza automática cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
    }, 300000);
  }

  /**
   * Establecer un valor en el cache
   */
  set<T>(key: string, value: T, ttl: number = 300000): void {
    // Verificar límite de tamaño
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      key,
      value,
      ttl,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessed: new Date(),
      size: 0,
      timestamp: Date.now()
    });

    this.stats.sets++;
    logger.debug('Cache item set', { key, ttl });
  }

  /**
   * Obtener un valor del cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Verificar si ha expirado
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Actualizar último acceso (LRU)
    item.lastAccessed = new Date(now);
    this.stats.hits++;
    
    return item.value;
  }

  /**
   * Verificar si existe una clave en el cache
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Verificar expiración
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Eliminar un item del cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Limpiar todo el cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache limpiado');
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats(): any {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    // Calcular items expirados y tamaño total
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredCount++;
      }
      totalSize += JSON.stringify(item.value).length;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expiredItems: expiredCount,
      totalSizeBytes: totalSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      ...this.stats
    };
  }

  /**
   * Evict el item más antiguo (LRU)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed.getTime() < oldestTime) {
        oldestTime = item.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('Cache item evicted (LRU)', { key: oldestKey });
    }
  }

  /**
   * Limpiar items expirados
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info('Cache cleanup completado');
    }
  }

  /**
   * Destruir el servicio y limpiar recursos
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    logger.info('Cache service destruido');
  }
}

// Instancia singleton
export const cacheService = new CacheService(
  parseInt(process.env.CACHE_MAX_SIZE || '1000')
);

export default cacheService; 