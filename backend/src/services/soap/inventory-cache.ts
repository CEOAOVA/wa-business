/**
 * Sistema de cache para inventario SOAP
 */
import { getConfig } from '../../config';

interface InventoryCacheKey {
  productCode: string;
  pointOfSaleId?: string;
  type: 'local' | 'general';
}

interface InventoryCacheEntry {
  key: InventoryCacheKey;
  data: any;
  timestamp: number;
  expiresAt: number;
}

export class InventoryCache {
  private cache = new Map<string, InventoryCacheEntry>();
  private readonly ttl: number;

  constructor() {
    const config = getConfig();
    this.ttl = config.inventoryCacheTtl; // TTL en milisegundos
  }

  /**
   * Genera una clave única para el cache
   */
  private generateCacheKey(key: InventoryCacheKey): string {
    const parts = [key.productCode, key.type];
    if (key.pointOfSaleId) {
      parts.push(key.pointOfSaleId);
    }
    return parts.join('_');
  }

  /**
   * Obtiene datos del cache si son válidos
   */
  get(key: InventoryCacheKey): any | null {
    const cacheKey = this.generateCacheKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now >= entry.expiresAt) {
      console.log(`[InventoryCache] Cache expirado para ${cacheKey}, removiendo`);
      this.cache.delete(cacheKey);
      return null;
    }

    console.log(`[InventoryCache] Cache hit para ${cacheKey}`);
    return entry.data;
  }

  /**
   * Almacena datos en el cache
   */
  set(key: InventoryCacheKey, data: any): void {
    const cacheKey = this.generateCacheKey(key);
    const now = Date.now();
    const entry: InventoryCacheEntry = {
      key,
      data,
      timestamp: now,
      expiresAt: now + this.ttl
    };

    this.cache.set(cacheKey, entry);
    console.log(`[InventoryCache] Datos almacenados para ${cacheKey}, expira en ${this.ttl / 1000} segundos`);
  }

  /**
   * Invalida una entrada específica del cache
   */
  invalidate(key: InventoryCacheKey): void {
    const cacheKey = this.generateCacheKey(key);
    if (this.cache.delete(cacheKey)) {
      console.log(`[InventoryCache] Cache invalidado para ${cacheKey}`);
    }
  }

  /**
   * Invalida todas las entradas de un producto específico
   */
  invalidateProduct(productCode: string): void {
    let removedCount = 0;
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (entry.key.productCode === productCode) {
        this.cache.delete(cacheKey);
        removedCount++;
      }
    }
    console.log(`[InventoryCache] ${removedCount} entradas invalidadas para producto ${productCode}`);
  }

  /**
   * Invalida todas las entradas de un POS específico
   */
  invalidatePos(pointOfSaleId: string): void {
    let removedCount = 0;
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (entry.key.pointOfSaleId === pointOfSaleId) {
        this.cache.delete(cacheKey);
        removedCount++;
      }
    }
    console.log(`[InventoryCache] ${removedCount} entradas invalidadas para POS ${pointOfSaleId}`);
  }

  /**
   * Limpia el cache completo
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`[InventoryCache] Cache completo limpiado, ${count} entradas removidas`);
  }

  /**
   * Limpia entradas expiradas
   */
  cleanExpiredEntries(): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(cacheKey);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`[InventoryCache] ${removedCount} entradas expiradas limpiadas`);
    }
    
    return removedCount;
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    memoryUsage: number;
    hitRate: number;
    entries: Array<{
      key: InventoryCacheKey;
      timestamp: number;
      expiresAt: number;
      isValid: boolean;
      ageInSeconds: number;
    }>;
  } {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    const entries = Array.from(this.cache.values()).map(entry => {
      const isValid = now < entry.expiresAt;
      if (isValid) validEntries++;
      else expiredEntries++;
      
      return {
        key: entry.key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        isValid,
        ageInSeconds: Math.floor((now - entry.timestamp) / 1000)
      };
    });

    // Estimación aproximada del uso de memoria
    const memoryUsage = Array.from(this.cache.values()).reduce((acc, entry) => {
      return acc + JSON.stringify(entry).length;
    }, 0);

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      memoryUsage,
      hitRate: 0, // Se puede implementar con contadores adicionales
      entries
    };
  }

  /**
   * Verifica si una entrada específica existe en el cache
   */
  has(key: InventoryCacheKey): boolean {
    const cacheKey = this.generateCacheKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    
    const now = Date.now();
    return now < entry.expiresAt;
  }

  /**
   * Obtiene todas las claves del cache
   */
  getKeys(): InventoryCacheKey[] {
    return Array.from(this.cache.values()).map(entry => entry.key);
  }
}

// Exportar instancia singleton
export const inventoryCache = new InventoryCache(); 