// ✅ SERVICIO DE CACHÉ CON TTL Y LÍMITES - IMPLEMENTADO
import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

interface CacheEntry<T> {
  data: T;
  expires: number;
  size: number;
  accessCount: number;
  lastAccess: number;
}

interface CacheStats {
  entries: number;
  totalSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export class MemoryCache<T = any> extends EventEmitter {
  private cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = {
    entries: 0,
    totalSize: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0
  };
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly options: {
      maxEntries?: number;
      maxSizeBytes?: number;
      defaultTTL?: number;
      cleanupIntervalMs?: number;
      evictionPolicy?: 'LRU' | 'LFU' | 'FIFO';
    } = {}
  ) {
    super();
    
    // Valores por defecto
    this.options.maxEntries = this.options.maxEntries || 1000;
    this.options.maxSizeBytes = this.options.maxSizeBytes || 50 * 1024 * 1024; // 50MB
    this.options.defaultTTL = this.options.defaultTTL || 300000; // TTL configurable
    this.options.cleanupIntervalMs = this.options.cleanupIntervalMs || 60000; // Intervalo configurable
    this.options.evictionPolicy = this.options.evictionPolicy || 'LRU';
    
    this.startCleanup();
    logger.info(`✅ Cache inicializado: ${this.options.evictionPolicy} con ${this.options.maxEntries} entradas máx.`);
  }
  
  /**
   * Establecer valor en caché
   */
  set(key: string, value: T, ttl?: number): void {
    try {
      // Calcular tamaño aproximado
      const size = this.calculateSize(value);
      
      // Verificar límites antes de añadir
      if (this.shouldEvict(size)) {
        this.evict(size);
      }
      
      const entry: CacheEntry<T> = {
        data: value,
        expires: Date.now() + (ttl || this.options.defaultTTL!),
        size,
        accessCount: 0,
        lastAccess: Date.now()
      };
      
      // Si ya existe, actualizar stats
      if (this.cache.has(key)) {
        const oldEntry = this.cache.get(key)!;
        this.stats.totalSize -= oldEntry.size;
      } else {
        this.stats.entries++;
      }
      
      this.cache.set(key, entry);
      this.stats.totalSize += size;
      
      this.emit('set', { key, size });
      
    } catch (error) {
      logger.error('Error estableciendo valor en caché', { key, error });
    }
  }
  
  /**
   * Obtener valor del caché
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }
    
    // Verificar expiración
    if (Date.now() > entry.expires) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }
    
    // Actualizar estadísticas de acceso
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.data;
  }
  
  /**
   * Eliminar entrada del caché
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (entry) {
      this.stats.totalSize -= entry.size;
      this.stats.entries--;
      this.cache.delete(key);
      this.emit('delete', { key });
      return true;
    }
    
    return false;
  }
  
  /**
   * Verificar si se debe hacer eviction
   */
  private shouldEvict(newSize: number): boolean {
    return (
      this.stats.entries >= this.options.maxEntries! ||
      this.stats.totalSize + newSize > this.options.maxSizeBytes!
    );
  }
  
  /**
   * Realizar eviction según política
   */
  private evict(requiredSize: number): void {
    const entriesToEvict = this.getEvictionCandidates(requiredSize);
    
    for (const key of entriesToEvict) {
      this.delete(key);
      this.stats.evictions++;
      
      logger.debug('Cache eviction', { key, policy: this.options.evictionPolicy });
    }
    
    this.emit('eviction', { 
      count: entriesToEvict.length, 
      policy: this.options.evictionPolicy 
    });
  }
  
  /**
   * Obtener candidatos para eviction
   */
  private getEvictionCandidates(requiredSize: number): string[] {
    const candidates: string[] = [];
    let freedSize = 0;
    
    // Ordenar según política
    const sortedEntries = Array.from(this.cache.entries()).sort((a, b) => {
      switch (this.options.evictionPolicy) {
        case 'LRU': // Least Recently Used
          return a[1].lastAccess - b[1].lastAccess;
        case 'LFU': // Least Frequently Used
          return a[1].accessCount - b[1].accessCount;
        case 'FIFO': // First In First Out
        default:
          return 0; // Mantener orden de inserción
      }
    });
    
    // Seleccionar candidatos hasta liberar espacio suficiente
    for (const [key, entry] of sortedEntries) {
      candidates.push(key);
      freedSize += entry.size;
      
      if (freedSize >= requiredSize || candidates.length >= this.stats.entries * 0.1) {
        break; // Máximo 10% de entradas en una eviction
      }
    }
    
    return candidates;
  }
  
  /**
   * Calcular tamaño aproximado de un objeto
   */
  private calculateSize(obj: any): number {
    try {
      const str = JSON.stringify(obj);
      return str.length * 2; // Aproximación en bytes (UTF-16)
    } catch {
      return 1024; // Tamaño por defecto si no se puede serializar
    }
  }
  
  /**
   * Actualizar hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
  
  /**
   * Limpieza periódica de entradas expiradas
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expires) {
          this.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.debug(`✅ Cache cleanup: ${cleaned} entradas expiradas eliminadas`);
        this.emit('cleanup', { cleaned });
      }
    }, this.options.cleanupIntervalMs!);
  }
  
  /**
   * Obtener estadísticas del caché
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Limpiar todo el caché
   */
  clear(): void {
    const entries = this.stats.entries;
    this.cache.clear();
    this.stats = {
      entries: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0
    };
    
    logger.info(`✅ Cache limpiado: ${entries} entradas eliminadas`);
    this.emit('clear', { entries });
  }
  
  /**
   * Destruir el caché y limpiar recursos
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clear();
    this.removeAllListeners();
    
    logger.info('✅ Cache destruido');
  }
}

// ✅ Instancias singleton para diferentes propósitos
export const conversationCache = new MemoryCache({
  maxEntries: 500,
  defaultTTL: 600000, // TTL configurable
  evictionPolicy: 'LRU'
});

export const userCache = new MemoryCache({
  maxEntries: 200,
  defaultTTL: 300000, // TTL configurable
  evictionPolicy: 'LRU'
});

export const messageCache = new MemoryCache({
  maxEntries: 2000,
  defaultTTL: 1800000, // TTL configurable
  evictionPolicy: 'FIFO'
});

// Exportar para uso en otros servicios
export default MemoryCache;