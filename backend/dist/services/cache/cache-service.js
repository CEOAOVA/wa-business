"use strict";
/**
 * Sistema de caching distribuido para escalabilidad
 * Multi-level cache con memory + Redis (simulado) y gestión automática
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
const events_1 = require("events");
const logger_1 = require("../../utils/logger");
const monitoring_service_1 = require("../monitoring/monitoring-service");
class CacheService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.memoryCache = new Map();
        this.memoryCacheSize = 0;
        this.stats = {
            requests: 0,
            hits: 0,
            memoryHits: 0,
            distributedHits: 0,
            evictions: 0
        };
        this.config = Object.assign({ enableMemoryCache: true, enableDistributedCache: false, memoryMaxSize: 100, defaultTTL: 300, cleanupInterval: 60, compressionThreshold: 1024 }, config);
        this.startCleanupProcess();
        logger_1.logger.info('Cache service initialized', {
            service: 'cache',
            config: this.config
        });
    }
    /**
     * Inicia proceso de limpieza automática
     */
    startCleanupProcess() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval * 1000);
    }
    /**
     * Obtiene un item del cache
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            this.stats.requests++;
            const start = Date.now();
            try {
                // 1. Intentar memory cache primero
                if (this.config.enableMemoryCache) {
                    const memoryResult = this.getFromMemory(key);
                    if (memoryResult !== null) {
                        this.stats.hits++;
                        this.stats.memoryHits++;
                        const duration = Date.now() - start;
                        monitoring_service_1.monitoringService.recordResponseTime(duration, 'cache-memory');
                        logger_1.logger.debug('Cache hit (memory)', {
                            service: 'cache',
                            key: this.maskKey(key),
                            responseTime: duration
                        });
                        return memoryResult;
                    }
                }
                // 2. Intentar distributed cache (Redis simulado)
                if (this.config.enableDistributedCache) {
                    const distributedResult = yield this.getFromDistributed(key);
                    if (distributedResult !== null) {
                        this.stats.hits++;
                        this.stats.distributedHits++;
                        // Guardar en memory cache para próximas consultas
                        if (this.config.enableMemoryCache) {
                            yield this.setInMemory(key, distributedResult, this.config.defaultTTL);
                        }
                        const duration = Date.now() - start;
                        monitoring_service_1.monitoringService.recordResponseTime(duration, 'cache-distributed');
                        logger_1.logger.debug('Cache hit (distributed)', {
                            service: 'cache',
                            key: this.maskKey(key),
                            responseTime: duration
                        });
                        return distributedResult;
                    }
                }
                // 3. Cache miss
                const duration = Date.now() - start;
                logger_1.logger.debug('Cache miss', {
                    service: 'cache',
                    key: this.maskKey(key),
                    responseTime: duration
                });
                return null;
            }
            catch (error) {
                logger_1.logger.error('Cache get error', error, {
                    service: 'cache',
                    key: this.maskKey(key)
                });
                return null;
            }
        });
    }
    /**
     * Guarda un item en el cache
     */
    set(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            const actualTTL = ttl || this.config.defaultTTL;
            try {
                // 1. Guardar en memory cache
                if (this.config.enableMemoryCache) {
                    yield this.setInMemory(key, value, actualTTL);
                }
                // 2. Guardar en distributed cache
                if (this.config.enableDistributedCache) {
                    yield this.setInDistributed(key, value, actualTTL);
                }
                logger_1.logger.debug('Cache set', {
                    service: 'cache',
                    key: this.maskKey(key),
                    ttl: actualTTL
                });
                return true;
            }
            catch (error) {
                logger_1.logger.error('Cache set error', error, {
                    service: 'cache',
                    key: this.maskKey(key)
                });
                return false;
            }
        });
    }
    /**
     * Elimina un item del cache
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    yield this.deleteFromDistributed(key);
                    deleted = true;
                }
                if (deleted) {
                    logger_1.logger.debug('Cache delete', {
                        service: 'cache',
                        key: this.maskKey(key)
                    });
                }
                return deleted;
            }
            catch (error) {
                logger_1.logger.error('Cache delete error', error, {
                    service: 'cache',
                    key: this.maskKey(key)
                });
                return false;
            }
        });
    }
    /**
     * Invalida cache por patrón
     */
    invalidate(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            let invalidatedCount = 0;
            try {
                // Invalidar en memory cache
                if (this.config.enableMemoryCache) {
                    const keysToDelete = [];
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
                logger_1.logger.info('Cache invalidation completed', {
                    service: 'cache',
                    pattern,
                    invalidatedCount
                });
                return invalidatedCount;
            }
            catch (error) {
                logger_1.logger.error('Cache invalidation error', error, {
                    service: 'cache',
                    pattern
                });
                return 0;
            }
        });
    }
    /**
     * MEMORY CACHE METHODS
     */
    getFromMemory(key) {
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
        return item.value;
    }
    setInMemory(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            const serialized = JSON.stringify(value);
            const size = new Blob([serialized]).size;
            // Verificar límite de memoria
            const maxSizeBytes = this.config.memoryMaxSize * 1024 * 1024;
            if (this.memoryCacheSize + size > maxSizeBytes) {
                yield this.evictLeastUsed(size);
            }
            const item = {
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
        });
    }
    /**
     * DISTRIBUTED CACHE METHODS (Redis simulado)
     */
    getFromDistributed(key) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulación de Redis
            // En implementación real: await redis.get(key)
            return null;
        });
    }
    setInDistributed(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulación de Redis
            // En implementación real: await redis.setex(key, ttl, JSON.stringify(value))
        });
    }
    deleteFromDistributed(key) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulación de Redis
            // En implementación real: await redis.del(key)
        });
    }
    /**
     * CACHE MANAGEMENT
     */
    evictLeastUsed(requiredSize) {
        return __awaiter(this, void 0, void 0, function* () {
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
            logger_1.logger.debug('Cache eviction completed', {
                service: 'cache',
                evictedCount,
                freedSpace,
                requiredSize
            });
        });
    }
    cleanup() {
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
            logger_1.logger.debug('Cache cleanup completed', {
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
    matchesPattern(key, pattern) {
        // Convertir patrón a regex simple (* = .*)
        const regexPattern = pattern.replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(key);
    }
    maskKey(key) {
        if (key.length <= 8)
            return key;
        return key.substring(0, 4) + '***' + key.substring(key.length - 4);
    }
    /**
     * PUBLIC API
     */
    getStats() {
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
    cacheConversation(conversationId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.set(`conversation:${conversationId}`, data, 3600); // 1 hora
        });
    }
    getCachedConversation(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.get(`conversation:${conversationId}`);
        });
    }
    // Cache para inventario SOAP
    cacheInventory(productCode, posId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.set(`inventory:${posId}:${productCode}`, data, 300); // 5 minutos
        });
    }
    getCachedInventory(productCode, posId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.get(`inventory:${posId}:${productCode}`);
        });
    }
    // Cache para resultados de funciones LLM
    cacheFunctionResult(functionName, args, result) {
        return __awaiter(this, void 0, void 0, function* () {
            const argsHash = this.hashObject(args);
            yield this.set(`function:${functionName}:${argsHash}`, result, 600); // 10 minutos
        });
    }
    getCachedFunctionResult(functionName, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const argsHash = this.hashObject(args);
            return yield this.get(`function:${functionName}:${argsHash}`);
        });
    }
    hashObject(obj) {
        return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 16);
    }
    // Invalidación específica
    invalidateConversations() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.invalidate('conversation:*');
        });
    }
    invalidateInventory() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.invalidate('inventory:*');
        });
    }
    invalidateFunctionResults() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.invalidate('function:*');
        });
    }
    /**
     * Cleanup al cerrar la aplicación
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.memoryCache.clear();
        this.memoryCacheSize = 0;
        logger_1.logger.info('Cache service destroyed', {
            service: 'cache'
        });
    }
}
exports.CacheService = CacheService;
// Exportar instancia singleton
exports.cacheService = new CacheService();
