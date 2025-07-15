"use strict";
/**
 * Sistema de Rate Limiting y Circuit Breaker
 * Protección contra sobrecarga y fallos en cascada
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
exports.rateLimiter = exports.RateLimiter = void 0;
const events_1 = require("events");
const logger_1 = require("../../utils/logger");
const monitoring_service_1 = require("../monitoring/monitoring-service");
class RateLimiter extends events_1.EventEmitter {
    constructor() {
        super();
        this.windows = new Map();
        this.circuitBreakers = new Map();
        this.serviceStats = new Map();
        this.startCleanupProcess();
        logger_1.logger.info('Rate limiter and circuit breaker initialized');
    }
    /**
     * Inicia proceso de limpieza automática
     */
    startCleanupProcess() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, 60000); // Limpiar cada minuto
    }
    /**
     * Aplica rate limiting
     */
    checkRateLimit(identifier, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = config.keyGenerator(identifier);
            const now = Date.now();
            const windowStart = Math.floor(now / config.windowSizeMs) * config.windowSizeMs;
            let window = this.windows.get(key);
            if (!window || window.windowStart < windowStart) {
                // Nueva ventana
                window = {
                    count: 0,
                    windowStart,
                    requests: []
                };
                this.windows.set(key, window);
            }
            // Contar requests en la ventana actual
            window.requests.push(now);
            window.count++;
            // Limpiar requests fuera de la ventana
            const cutoff = now - config.windowSizeMs;
            window.requests = window.requests.filter(time => time > cutoff);
            window.count = window.requests.length;
            const allowed = window.count <= config.maxRequests;
            const remaining = Math.max(0, config.maxRequests - window.count);
            const resetTime = new Date(windowStart + config.windowSizeMs);
            if (!allowed) {
                logger_1.logger.warn('Rate limit exceeded', {
                    service: 'rate-limiter',
                    identifier: this.maskIdentifier(identifier),
                    requests: window.count,
                    limit: config.maxRequests,
                    windowSizeMs: config.windowSizeMs
                });
                this.emit('rateLimitExceeded', {
                    identifier,
                    requests: window.count,
                    limit: config.maxRequests
                });
                monitoring_service_1.monitoringService.recordRequest(false);
            }
            return {
                allowed,
                remaining,
                resetTime,
                totalRequests: window.count
            };
        });
    }
    /**
     * Registra resultado de operación para circuit breaker
     */
    recordResult(serviceName, success, responseTime) {
        let stats = this.serviceStats.get(serviceName);
        if (!stats) {
            stats = {
                totalRequests: 0,
                failures: 0,
                successes: 0,
                averageResponseTime: 0,
                lastRequestTime: new Date()
            };
            this.serviceStats.set(serviceName, stats);
        }
        stats.totalRequests++;
        stats.lastRequestTime = new Date();
        if (success) {
            stats.successes++;
        }
        else {
            stats.failures++;
        }
        if (responseTime) {
            stats.averageResponseTime = ((stats.averageResponseTime * (stats.totalRequests - 1)) + responseTime) / stats.totalRequests;
        }
        // Actualizar circuit breaker
        this.updateCircuitBreaker(serviceName, success);
    }
    /**
     * Verifica si un servicio está disponible según circuit breaker
     */
    isServiceAvailable(serviceName, config) {
        let state = this.circuitBreakers.get(serviceName);
        if (!state) {
            state = {
                state: 'CLOSED',
                failures: 0,
                successCount: 0
            };
            this.circuitBreakers.set(serviceName, state);
        }
        const now = Date.now();
        switch (state.state) {
            case 'CLOSED':
                return true;
            case 'OPEN':
                if (state.nextAttemptTime && now >= state.nextAttemptTime.getTime()) {
                    // Tiempo de recuperación alcanzado, cambiar a HALF_OPEN
                    state.state = 'HALF_OPEN';
                    state.successCount = 0;
                    logger_1.logger.info('Circuit breaker transitioning to HALF_OPEN', {
                        service: 'circuit-breaker',
                        serviceName
                    });
                    return true;
                }
                return false;
            case 'HALF_OPEN':
                return true;
            default:
                return true;
        }
    }
    /**
     * Actualiza estado del circuit breaker
     */
    updateCircuitBreaker(serviceName, success) {
        let state = this.circuitBreakers.get(serviceName);
        if (!state)
            return;
        const stats = this.serviceStats.get(serviceName);
        if (!stats)
            return;
        const config = {
            failureThreshold: 5,
            recoveryTimeoutMs: 60000,
            monitoringWindowMs: 300000,
            volumeThreshold: 10
        };
        if (success) {
            if (state.state === 'HALF_OPEN') {
                state.successCount++;
                // Si tenemos suficientes éxitos, cerrar el circuit
                if (state.successCount >= 3) {
                    state.state = 'CLOSED';
                    state.failures = 0;
                    state.successCount = 0;
                    state.lastFailureTime = undefined;
                    state.nextAttemptTime = undefined;
                    logger_1.logger.info('Circuit breaker closed after successful recovery', {
                        service: 'circuit-breaker',
                        serviceName
                    });
                    this.emit('circuitBreakerClosed', { serviceName });
                }
            }
            // Reset failure count en estado CLOSED
            if (state.state === 'CLOSED') {
                state.failures = Math.max(0, state.failures - 1);
            }
        }
        else {
            state.failures++;
            state.lastFailureTime = new Date();
            // Verificar si debemos abrir el circuit
            if (state.state === 'CLOSED' && this.shouldOpenCircuit(stats, config)) {
                state.state = 'OPEN';
                state.nextAttemptTime = new Date(Date.now() + config.recoveryTimeoutMs);
                logger_1.logger.error('Circuit breaker opened due to high failure rate', {
                    service: 'circuit-breaker',
                    serviceName,
                    failures: state.failures,
                    totalRequests: stats.totalRequests,
                    failureRate: (stats.failures / stats.totalRequests) * 100
                });
                this.emit('circuitBreakerOpened', {
                    serviceName,
                    failures: state.failures,
                    failureRate: (stats.failures / stats.totalRequests) * 100
                });
            }
            else if (state.state === 'HALF_OPEN') {
                // Fallo en HALF_OPEN, volver a OPEN
                state.state = 'OPEN';
                state.nextAttemptTime = new Date(Date.now() + config.recoveryTimeoutMs);
                state.successCount = 0;
                logger_1.logger.warn('Circuit breaker re-opened after failure in HALF_OPEN state', {
                    service: 'circuit-breaker',
                    serviceName
                });
            }
        }
    }
    /**
     * Determina si debe abrir el circuit breaker
     */
    shouldOpenCircuit(stats, config) {
        // Necesitamos volumen mínimo de requests
        if (stats.totalRequests < config.volumeThreshold) {
            return false;
        }
        // Calcular tasa de fallos
        const failureRate = (stats.failures / stats.totalRequests) * 100;
        return failureRate >= config.failureThreshold;
    }
    /**
     * Middleware para Express con rate limiting
     */
    createRateLimitMiddleware(config) {
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const identifier = req.ip || req.connection.remoteAddress || 'unknown';
                const result = yield this.checkRateLimit(identifier, config);
                // Agregar headers de rate limit
                res.set({
                    'X-RateLimit-Limit': config.maxRequests.toString(),
                    'X-RateLimit-Remaining': result.remaining.toString(),
                    'X-RateLimit-Reset': result.resetTime.toISOString()
                });
                if (!result.allowed) {
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        message: config.message || 'Too many requests, please try again later',
                        retryAfter: Math.ceil((result.resetTime.getTime() - Date.now()) / 1000)
                    });
                }
                next();
            }
            catch (error) {
                logger_1.logger.error('Rate limit middleware error', error);
                next(); // Permitir continuar en caso de error
            }
        });
    }
    /**
     * Middleware para circuit breaker
     */
    createCircuitBreakerMiddleware(serviceName, config) {
        const fullConfig = Object.assign({ failureThreshold: 50, recoveryTimeoutMs: 60000, monitoringWindowMs: 300000, volumeThreshold: 10 }, config);
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            if (!this.isServiceAvailable(serviceName, fullConfig)) {
                return res.status(503).json({
                    error: 'Service temporarily unavailable',
                    message: 'The service is currently experiencing issues. Please try again later.',
                    serviceName
                });
            }
            const start = Date.now();
            // Override res.end para capturar el resultado
            const originalEnd = res.end;
            res.end = (...args) => {
                const duration = Date.now() - start;
                const success = res.statusCode < 400;
                this.recordResult(serviceName, success, duration);
                monitoring_service_1.monitoringService.recordResponseTime(duration, serviceName);
                return originalEnd.apply(res, args);
            };
            next();
        });
    }
    /**
     * Obtiene estadísticas de rate limiting
     */
    getStats() {
        const rateLimitStats = {
            activeWindows: this.windows.size,
            totalServices: this.serviceStats.size,
            circuitBreakers: {}
        };
        // Estadísticas de circuit breakers
        for (const [serviceName, state] of this.circuitBreakers.entries()) {
            const stats = this.serviceStats.get(serviceName);
            rateLimitStats.circuitBreakers[serviceName] = {
                state: state.state,
                failures: state.failures,
                successCount: state.successCount,
                totalRequests: (stats === null || stats === void 0 ? void 0 : stats.totalRequests) || 0,
                failureRate: stats ? (stats.failures / stats.totalRequests) * 100 : 0,
                averageResponseTime: (stats === null || stats === void 0 ? void 0 : stats.averageResponseTime) || 0
            };
        }
        return rateLimitStats;
    }
    /**
     * Obtiene estado de un circuit breaker específico
     */
    getCircuitBreakerState(serviceName) {
        return this.circuitBreakers.get(serviceName) || null;
    }
    /**
     * Fuerza abrir un circuit breaker (para testing o mantenimiento)
     */
    forceOpenCircuitBreaker(serviceName) {
        let state = this.circuitBreakers.get(serviceName);
        if (!state) {
            state = {
                state: 'OPEN',
                failures: 0,
                successCount: 0
            };
            this.circuitBreakers.set(serviceName, state);
        }
        state.state = 'OPEN';
        state.nextAttemptTime = new Date(Date.now() + 300000); // 5 minutos
        logger_1.logger.warn('Circuit breaker manually opened', {
            service: 'circuit-breaker',
            serviceName
        });
    }
    /**
     * Fuerza cerrar un circuit breaker
     */
    forceCloseCircuitBreaker(serviceName) {
        let state = this.circuitBreakers.get(serviceName);
        if (!state) {
            state = {
                state: 'CLOSED',
                failures: 0,
                successCount: 0
            };
            this.circuitBreakers.set(serviceName, state);
        }
        state.state = 'CLOSED';
        state.failures = 0;
        state.successCount = 0;
        state.lastFailureTime = undefined;
        state.nextAttemptTime = undefined;
        logger_1.logger.info('Circuit breaker manually closed', {
            service: 'circuit-breaker',
            serviceName
        });
    }
    /**
     * Limpia datos antiguos
     */
    cleanup() {
        const now = Date.now();
        let cleanedWindows = 0;
        // Limpiar ventanas de rate limiting antiguas
        for (const [key, window] of this.windows.entries()) {
            if (now - window.windowStart > 300000) { // 5 minutos
                this.windows.delete(key);
                cleanedWindows++;
            }
        }
        // Limpiar estadísticas de servicios inactivos
        for (const [serviceName, stats] of this.serviceStats.entries()) {
            if (now - stats.lastRequestTime.getTime() > 3600000) { // 1 hora
                this.serviceStats.delete(serviceName);
                this.circuitBreakers.delete(serviceName);
            }
        }
        if (cleanedWindows > 0) {
            logger_1.logger.debug('Rate limiter cleanup completed', {
                service: 'rate-limiter',
                cleanedWindows,
                activeWindows: this.windows.size
            });
        }
    }
    /**
     * Enmascara identificadores para logs
     */
    maskIdentifier(identifier) {
        if (identifier.length <= 6)
            return identifier;
        return identifier.substring(0, 3) + '***' + identifier.substring(identifier.length - 3);
    }
    /**
     * Destruye el rate limiter
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.windows.clear();
        this.circuitBreakers.clear();
        this.serviceStats.clear();
        logger_1.logger.info('Rate limiter destroyed');
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Configuraciones predefinidas
 */
RateLimiter.configs = {
    // Rate limiting por IP
    perIP: (maxRequests = 100, windowMinutes = 1) => ({
        windowSizeMs: windowMinutes * 60 * 1000,
        maxRequests,
        keyGenerator: (ip) => `ip:${ip}`,
        message: 'Too many requests from this IP'
    }),
    // Rate limiting por usuario
    perUser: (maxRequests = 50, windowMinutes = 1) => ({
        windowSizeMs: windowMinutes * 60 * 1000,
        maxRequests,
        keyGenerator: (userId) => `user:${userId}`,
        message: 'Too many requests from this user'
    }),
    // Rate limiting por teléfono (WhatsApp)
    perPhone: (maxRequests = 30, windowMinutes = 1) => ({
        windowSizeMs: windowMinutes * 60 * 1000,
        maxRequests,
        keyGenerator: (phone) => `phone:${phone}`,
        message: 'Too many messages from this phone number'
    }),
    // Rate limiting para APIs externas
    externalAPI: (maxRequests = 10, windowMinutes = 1) => ({
        windowSizeMs: windowMinutes * 60 * 1000,
        maxRequests,
        keyGenerator: (service) => `api:${service}`,
        message: 'External API rate limit exceeded'
    })
};
// Exportar instancia singleton
exports.rateLimiter = new RateLimiter();
