"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryCache = exports.InventoryCache = void 0;
/**
 * Sistema de cache para inventario SOAP
 */
const config_1 = require("../../config");
class InventoryCache {
    constructor() {
        this.cache = new Map();
        const config = (0, config_1.getConfig)();
        this.ttl = config.inventoryCacheTtl || 300000; // TTL en milisegundos
    }
    /**
     * Genera una clave única para el cache
     */
    generateCacheKey(key) {
        const parts = [key.productCode, key.type];
        if (key.pointOfSaleId) {
            parts.push(key.pointOfSaleId);
        }
        return parts.join('_');
    }
    /**
     * Obtiene datos del cache si son válidos
     */
    get(key) {
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
    set(key, data) {
        const cacheKey = this.generateCacheKey(key);
        const now = Date.now();
        const entry = {
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
    invalidate(key) {
        const cacheKey = this.generateCacheKey(key);
        if (this.cache.delete(cacheKey)) {
            console.log(`[InventoryCache] Cache invalidado para ${cacheKey}`);
        }
    }
    /**
     * Invalida todas las entradas de un producto específico
     */
    invalidateProduct(productCode) {
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
    invalidatePos(pointOfSaleId) {
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
    clear() {
        const count = this.cache.size;
        this.cache.clear();
        console.log(`[InventoryCache] Cache completo limpiado, ${count} entradas removidas`);
    }
    /**
     * Limpia entradas expiradas
     */
    cleanExpiredEntries() {
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
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        const entries = Array.from(this.cache.values()).map(entry => {
            const isValid = now < entry.expiresAt;
            if (isValid)
                validEntries++;
            else
                expiredEntries++;
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
    has(key) {
        const cacheKey = this.generateCacheKey(key);
        const entry = this.cache.get(cacheKey);
        if (!entry)
            return false;
        const now = Date.now();
        return now < entry.expiresAt;
    }
    /**
     * Obtiene todas las claves del cache
     */
    getKeys() {
        return Array.from(this.cache.values()).map(entry => entry.key);
    }
}
exports.InventoryCache = InventoryCache;
// Exportar instancia singleton
exports.inventoryCache = new InventoryCache();
