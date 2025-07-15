"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenManager = exports.TokenManager = void 0;
/**
 * Gestor de cache de tokens de autenticación SOAP
 */
const config_1 = require("../../config");
class TokenManager {
    constructor() {
        this.tokenCache = new Map();
        const config = (0, config_1.getConfig)();
        this.cacheDuration = (config.tokenCacheDuration || 10) * 60 * 1000; // Convertir minutos a ms
    }
    /**
     * Obtiene un token del cache si es válido
     */
    getToken(posId) {
        const cacheKey = `token_${posId}`;
        const entry = this.tokenCache.get(cacheKey);
        if (!entry) {
            console.log(`[TokenManager] No hay token en cache para POS ${posId}`);
            return null;
        }
        const now = Date.now();
        if (now >= entry.expiresAt) {
            console.log(`[TokenManager] Token expirado para POS ${posId}, removiendo del cache`);
            this.tokenCache.delete(cacheKey);
            return null;
        }
        console.log(`[TokenManager] Token válido encontrado para POS ${posId}`);
        return entry.token;
    }
    /**
     * Almacena un token en el cache
     */
    setToken(posId, token) {
        const cacheKey = `token_${posId}`;
        const now = Date.now();
        const entry = {
            token,
            expiresAt: now + this.cacheDuration,
            posId,
            createdAt: now
        };
        this.tokenCache.set(cacheKey, entry);
        console.log(`[TokenManager] Token almacenado para POS ${posId}, expira en ${this.cacheDuration / 1000 / 60} minutos`);
    }
    /**
     * Invalida un token específico
     */
    invalidateToken(posId) {
        const cacheKey = `token_${posId}`;
        if (this.tokenCache.delete(cacheKey)) {
            console.log(`[TokenManager] Token invalidado para POS ${posId}`);
        }
    }
    /**
     * Invalida todos los tokens
     */
    invalidateAllTokens() {
        const count = this.tokenCache.size;
        this.tokenCache.clear();
        console.log(`[TokenManager] ${count} tokens invalidados`);
    }
    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const now = Date.now();
        let validTokens = 0;
        let expiredTokens = 0;
        const tokens = Array.from(this.tokenCache.values()).map(entry => {
            const isValid = now < entry.expiresAt;
            if (isValid)
                validTokens++;
            else
                expiredTokens++;
            return {
                posId: entry.posId,
                createdAt: entry.createdAt,
                expiresAt: entry.expiresAt,
                isValid
            };
        });
        return {
            totalTokens: this.tokenCache.size,
            validTokens,
            expiredTokens,
            tokens
        };
    }
    /**
     * Limpia tokens expirados
     */
    cleanExpiredTokens() {
        const now = Date.now();
        let removedCount = 0;
        for (const [key, entry] of this.tokenCache.entries()) {
            if (now >= entry.expiresAt) {
                this.tokenCache.delete(key);
                removedCount++;
            }
        }
        if (removedCount > 0) {
            console.log(`[TokenManager] ${removedCount} tokens expirados limpiados`);
        }
        return removedCount;
    }
}
exports.TokenManager = TokenManager;
// Exportar instancia singleton
exports.tokenManager = new TokenManager();
