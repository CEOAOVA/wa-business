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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.requirePermission = exports.requireSupervisor = exports.requireAdmin = exports.requireRole = exports.optionalAuth = exports.authenticate = void 0;
exports.invalidateUserCache = invalidateUserCache;
exports.clearUserCache = clearUserCache;
const auth_service_1 = require("../services/auth.service");
const token_service_1 = require("../services/token.service");
const logger_1 = require("../utils/logger");
// Cache de perfiles de usuario para reducir consultas a BD
const userProfileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
/**
 * Limpiar caché de usuarios expirados
 */
function cleanupUserCache() {
    const now = Date.now();
    for (const [userId, cached] of userProfileCache.entries()) {
        if (now - cached.timestamp > CACHE_TTL) {
            userProfileCache.delete(userId);
        }
    }
}
// Limpiar caché cada 10 minutos
setInterval(cleanupUserCache, 10 * 60 * 1000);
/**
 * Obtener perfil de usuario con caché
 */
function getUserProfileCached(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const cached = userProfileCache.get(userId);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
            logger_1.logger.debug(`User profile served from cache: ${userId}`);
            return cached.profile;
        }
        const profile = yield auth_service_1.AuthService.getUserById(userId);
        if (profile) {
            userProfileCache.set(userId, { profile, timestamp: now });
        }
        return profile;
    });
}
/**
 * Middleware de autenticación principal
 * Verifica y valida tokens de acceso
 */
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const startTime = Date.now();
    try {
        // Extraer token del header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger_1.logger.debug('No authorization header found');
            return res.status(401).json({
                success: false,
                message: 'Token de autenticación requerido',
                code: 'AUTH_REQUIRED'
            });
        }
        const token = authHeader.substring(7);
        // Verificar token usando TokenService
        const decoded = token_service_1.TokenService.verifyAccessToken(token);
        if (!decoded) {
            logger_1.logger.debug('Invalid or expired token');
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado',
                code: 'TOKEN_INVALID'
            });
        }
        // Obtener perfil del usuario (con caché)
        const userProfile = yield getUserProfileCached(decoded.sub);
        if (!userProfile) {
            logger_1.logger.warn(`User profile not found for ID: ${decoded.sub}`);
            userProfileCache.delete(decoded.sub); // Limpiar caché inválido
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }
        // Verificar si el usuario está activo
        if (!userProfile.is_active) {
            logger_1.logger.warn(`Inactive user attempted access: ${userProfile.username}`);
            userProfileCache.delete(decoded.sub); // Limpiar caché
            return res.status(401).json({
                success: false,
                message: 'Usuario inactivo',
                code: 'USER_INACTIVE'
            });
        }
        // Adjuntar usuario al request
        req.user = userProfile;
        req.isAuthenticated = true;
        // Log de performance en desarrollo
        if (process.env.NODE_ENV === 'development') {
            const duration = Date.now() - startTime;
            logger_1.logger.debug(`Auth middleware completed in ${duration}ms for user: ${userProfile.username}`);
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});
exports.authenticate = authenticate;
/**
 * Middleware de autenticación opcional
 * No bloquea si no hay token, pero adjunta usuario si es válido
 */
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No hay token, continuar sin autenticación
            req.isAuthenticated = false;
            return next();
        }
        const token = authHeader.substring(7);
        const decoded = token_service_1.TokenService.verifyAccessToken(token);
        if (decoded) {
            const userProfile = yield getUserProfileCached(decoded.sub);
            if (userProfile && userProfile.is_active) {
                req.user = userProfile;
                req.isAuthenticated = true;
            }
            else {
                req.isAuthenticated = false;
            }
        }
        else {
            req.isAuthenticated = false;
        }
        next();
    }
    catch (error) {
        // En caso de error, continuar sin autenticación
        logger_1.logger.debug('Optional auth error, continuing without auth', { error });
        req.isAuthenticated = false;
        next();
    }
});
exports.optionalAuth = optionalAuth;
/**
 * Middleware que requiere rol específico
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                code: 'AUTH_REQUIRED'
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            logger_1.logger.warn(`Access denied for user ${req.user.username} with role ${req.user.role}`);
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Permisos insuficientes.',
                code: 'FORBIDDEN'
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Middleware que requiere rol de administrador
 */
exports.requireAdmin = (0, exports.requireRole)('admin');
/**
 * Middleware que requiere rol de supervisor o superior
 */
exports.requireSupervisor = (0, exports.requireRole)('admin', 'supervisor');
/**
 * Middleware para verificar permisos específicos
 */
const requirePermission = (resource, action) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                code: 'AUTH_REQUIRED'
            });
        }
        const hasPermission = yield auth_service_1.AuthService.hasPermission(req.user.id, resource, action);
        if (!hasPermission) {
            logger_1.logger.warn(`Permission denied for user ${req.user.username}: ${resource}.${action}`);
            return res.status(403).json({
                success: false,
                message: 'Permiso denegado para esta acción',
                code: 'PERMISSION_DENIED'
            });
        }
        next();
    });
};
exports.requirePermission = requirePermission;
/**
 * Invalidar caché de un usuario específico
 */
function invalidateUserCache(userId) {
    userProfileCache.delete(userId);
    logger_1.logger.debug(`User cache invalidated for: ${userId}`);
}
/**
 * Limpiar todo el caché de usuarios
 */
function clearUserCache() {
    userProfileCache.clear();
    logger_1.logger.info('User profile cache cleared');
}
// Alias para compatibilidad con código existente
exports.authMiddleware = exports.authenticate;
