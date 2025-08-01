"use strict";
/**
 * Sistema de caching distribuido para escalabilidad
 * Multi-level cache con memory + Redis (simulado) y gestión automática
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
const events_1 = require("events");
const logger_1 = require("../../utils/logger");
/**
 * Servicio de Cache con LRU (Least Recently Used) para optimizar memoria
 */
class CacheService extends events_1.EventEmitter {
    constructor(maxSize = 1000) {
        super();
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
        this.maxSize = maxSize;
        // Limpieza automática cada 5 minutos
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredItems();
        }, 300000);
    }
    /**
     * Establecer un valor en el cache
     */
    set(key, value, ttl = 300000) {
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
        logger_1.logger.debug('Cache item set', { key, ttl });
    }
    /**
     * Obtener un valor del cache
     */
    get(key) {
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
    has(key) {
        const item = this.cache.get(key);
        if (!item)
            return false;
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
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.deletes++;
        }
        return deleted;
    }
    /**
     * Limpiar todo el cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        logger_1.logger.info('Cache limpiado');
    }
    /**
     * Obtener estadísticas del cache
     */
    getStats() {
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
        return Object.assign({ size: this.cache.size, maxSize: this.maxSize, expiredItems: expiredCount, totalSizeBytes: totalSize, hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0 }, this.stats);
    }
    /**
     * Evict el item más antiguo (LRU)
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (item.lastAccessed.getTime() < oldestTime) {
                oldestTime = item.lastAccessed.getTime();
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
            logger_1.logger.debug('Cache item evicted (LRU)', { key: oldestKey });
        }
    }
    /**
     * Limpiar items expirados
     */
    cleanupExpiredItems() {
        const now = Date.now();
        let removedCount = 0;
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        if (removedCount > 0) {
            logger_1.logger.info('Cache cleanup completado');
        }
    }
    /**
     * Destruir el servicio y limpiar recursos
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
        logger_1.logger.info('Cache service destruido');
    }
}
exports.CacheService = CacheService;
// Instancia singleton
exports.cacheService = new CacheService(parseInt(process.env.CACHE_MAX_SIZE || '1000'));
exports.default = exports.cacheService;
