"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = exports.rateLimitMedia = exports.rateLimitChat = exports.rateLimitWebhook = exports.rateLimitApi = exports.rateLimitAuth = void 0;
exports.createRateLimitMiddleware = createRateLimitMiddleware;
exports.createUserRateLimitMiddleware = createUserRateLimitMiddleware;
exports.createDynamicRateLimitMiddleware = createDynamicRateLimitMiddleware;
exports.resetRateLimit = resetRateLimit;
exports.getRateLimitStats = getRateLimitStats;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
// Configuración de Redis (opcional)
const redisClient = process.env.REDIS_URL ? new ioredis_1.default(process.env.REDIS_URL) : null;
// Configuraciones predefinidas por tipo de endpoint
const RATE_LIMIT_CONFIGS = {
    // Autenticación: más restrictivo
    auth: {
        points: 5,
        duration: 60,
        blockDuration: 900, // 15 minutos de bloqueo
        keyPrefix: 'auth'
    },
    // API general: moderado
    api: {
        points: 100,
        duration: 60,
        keyPrefix: 'api'
    },
    // Webhooks: más permisivo
    webhook: {
        points: 300,
        duration: 60,
        keyPrefix: 'webhook'
    },
    // Chat/mensajes: alto volumen permitido
    chat: {
        points: 200,
        duration: 60,
        keyPrefix: 'chat'
    },
    // Media/archivos: limitado por tamaño
    media: {
        points: 50,
        duration: 60,
        blockDuration: 300,
        keyPrefix: 'media'
    }
};
// Cache de rate limiters por configuración
const rateLimiters = new Map();
/**
 * Obtener o crear rate limiter
 */
function getRateLimiter(config) {
    const key = `${config.keyPrefix}-${config.points}-${config.duration}`;
    if (rateLimiters.has(key)) {
        return rateLimiters.get(key);
    }
    const options = {
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration,
        keyPrefix: config.keyPrefix,
    };
    // Usar Redis si está disponible, sino memoria
    const limiter = redisClient
        ? new rate_limiter_flexible_1.RateLimiterRedis(Object.assign({ storeClient: redisClient }, options))
        : new rate_limiter_flexible_1.RateLimiterMemory(options);
    rateLimiters.set(key, limiter);
    return limiter;
}
/**
 * Generar clave única para rate limiting
 */
function generateKey(req, useUserId = true) {
    var _a;
    // Priorizar usuario autenticado
    if (useUserId && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return `user:${req.user.id}`;
    }
    // Obtener IP real considerando proxies
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded
        ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
        : req.ip || req.connection.remoteAddress || 'unknown';
    // En producción, incluir User-Agent para mayor granularidad
    if (process.env.NODE_ENV === 'production') {
        const userAgent = (req.headers['user-agent'] || 'unknown').substring(0, 50);
        return `ip:${ip}:${userAgent}`;
    }
    return `ip:${ip}`;
}
/**
 * Middleware factory para rate limiting
 */
function createRateLimitMiddleware(configName) {
    const config = typeof configName === 'string'
        ? RATE_LIMIT_CONFIGS[configName]
        : configName;
    const limiter = getRateLimiter(config);
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        // Skip para rutas excluidas
        if (shouldSkipRateLimit(req)) {
            return next();
        }
        const key = generateKey(req);
        try {
            const result = yield limiter.consume(key);
            // Agregar headers informativos
            res.set({
                'X-RateLimit-Limit': config.points.toString(),
                'X-RateLimit-Remaining': result.remainingPoints.toString(),
                'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString()
            });
            next();
        }
        catch (rejResult) {
            // Rate limit excedido
            const retryAfter = Math.round(rejResult.msBeforeNext / 1000) || 60;
            logger_1.logger.warn('Rate limit exceeded', {
                key,
                path: req.path,
                method: req.method,
                remainingPoints: rejResult.remainingPoints || 0,
                retryAfter
            });
            res.set({
                'Retry-After': retryAfter.toString(),
                'X-RateLimit-Limit': config.points.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(Date.now() + rejResult.msBeforeNext).toISOString()
            });
            res.status(429).json({
                success: false,
                message: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter
            });
        }
    });
}
/**
 * Rate limiting por usuario autenticado (más estricto)
 */
function createUserRateLimitMiddleware(points = 100, duration = 60) {
    const config = {
        points,
        duration,
        keyPrefix: 'user-custom',
        blockDuration: 300
    };
    const limiter = getRateLimiter(config);
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return next(); // No aplicar si no hay usuario
        }
        const key = `user:${req.user.id}`;
        try {
            yield limiter.consume(key);
            next();
        }
        catch (rejResult) {
            const retryAfter = Math.round(rejResult.msBeforeNext / 1000) || 60;
            logger_1.logger.warn('User rate limit exceeded', {
                userId: req.user.id,
                username: req.user.username,
                path: req.path,
                retryAfter
            });
            res.status(429).json({
                success: false,
                message: 'Has excedido el límite de solicitudes. Por favor, espera un momento.',
                code: 'USER_RATE_LIMIT_EXCEEDED',
                retryAfter
            });
        }
    });
}
/**
 * Rate limiting dinámico basado en el comportamiento
 */
function createDynamicRateLimitMiddleware() {
    // Tracking de comportamiento por IP/usuario
    const behaviorMap = new Map();
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const key = generateKey(req);
        const now = Date.now();
        // Obtener o crear registro de comportamiento
        let behavior = behaviorMap.get(key);
        if (!behavior || now - behavior.lastReset > 3600000) { // Reset cada hora
            behavior = { failedAttempts: 0, lastReset: now };
            behaviorMap.set(key, behavior);
        }
        // Calcular límite dinámico basado en comportamiento
        const basePoints = 100;
        const penalty = Math.min(behavior.failedAttempts * 10, 50); // Max 50% de penalización
        const dynamicPoints = Math.max(basePoints - penalty, 20); // Mínimo 20 requests
        const config = {
            points: dynamicPoints,
            duration: 60,
            keyPrefix: 'dynamic'
        };
        const limiter = getRateLimiter(config);
        try {
            yield limiter.consume(key);
            // Registrar respuesta después
            res.on('finish', () => {
                if (res.statusCode >= 400) {
                    behavior.failedAttempts++;
                }
                else if (behavior.failedAttempts > 0) {
                    behavior.failedAttempts--; // Reducir penalización en requests exitosos
                }
            });
            next();
        }
        catch (rejResult) {
            behavior.failedAttempts++;
            const retryAfter = Math.round(rejResult.msBeforeNext / 1000) || 60;
            res.status(429).json({
                success: false,
                message: 'Actividad sospechosa detectada. Límite de solicitudes reducido.',
                code: 'DYNAMIC_RATE_LIMIT_EXCEEDED',
                retryAfter
            });
        }
    });
}
/**
 * Determinar si se debe saltar rate limiting
 */
function shouldSkipRateLimit(req) {
    // Skip para rutas de salud
    if (req.path === '/health' || req.path === '/api/health') {
        return true;
    }
    // Skip para WebSocket
    if (req.path.startsWith('/socket.io/')) {
        return true;
    }
    // Skip en desarrollo para localhost
    if (process.env.NODE_ENV === 'development') {
        const ip = req.ip || '';
        if (ip.includes('127.0.0.1') || ip.includes('::1') || ip === '::ffff:127.0.0.1') {
            return true;
        }
    }
    return false;
}
/**
 * Resetear límites para un usuario/IP específico
 */
function resetRateLimit(identifier, keyPrefix) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            for (const [key, limiter] of rateLimiters) {
                if (!keyPrefix || key.startsWith(keyPrefix)) {
                    yield limiter.delete(identifier);
                }
            }
            logger_1.logger.info(`Rate limits reset for: ${identifier}`);
        }
        catch (error) {
            logger_1.logger.error('Error resetting rate limits:', error);
        }
    });
}
/**
 * Obtener estadísticas de rate limiting
 */
function getRateLimitStats(identifier) {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = {};
        for (const [key, limiter] of rateLimiters) {
            try {
                const result = yield limiter.get(identifier);
                if (result) {
                    stats[key] = {
                        consumedPoints: result.consumedPoints,
                        remainingPoints: result.remainingPoints,
                        msBeforeNext: result.msBeforeNext
                    };
                }
            }
            catch (error) {
                // Ignorar errores de claves no encontradas
            }
        }
        return stats;
    });
}
// Exports predefinidos para uso común
exports.rateLimitAuth = createRateLimitMiddleware('auth');
exports.rateLimitApi = createRateLimitMiddleware('api');
exports.rateLimitWebhook = createRateLimitMiddleware('webhook');
exports.rateLimitChat = createRateLimitMiddleware('chat');
exports.rateLimitMedia = createRateLimitMiddleware('media');
// Alias para compatibilidad
exports.rateLimitMiddleware = exports.rateLimitApi;
