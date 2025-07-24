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
exports.requireAuth = exports.requireAgentOrAdmin = exports.requireAdmin = exports.requirePermission = exports.tempAuth = exports.optionalAuth = exports.authMiddleware = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const auth_service_1 = require("../services/auth.service");
/**
 * Middleware de autenticación simplificado con Supabase
 * Menos restrictivo y más eficiente
 */
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticación requerido'
            });
        }
        const token = authHeader.substring(7); // Remover 'Bearer ' del token
        // Verificar token con Supabase de forma más simple
        if (!supabase_1.supabase) {
            logger_1.logger.warn('Supabase client no disponible');
            return res.status(500).json({
                success: false,
                message: 'Servicio de autenticación no disponible'
            });
        }
        const { data: { user }, error } = yield supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            logger_1.logger.warn('Token inválido o expirado', { error: (error === null || error === void 0 ? void 0 : error.message) || 'No user data' });
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }
        // Obtener perfil del usuario de forma más eficiente
        try {
            const userProfile = yield auth_service_1.AuthService.getUserById(user.id);
            if (!userProfile) {
                logger_1.logger.warn('Perfil de usuario no encontrado', { userId: user.id });
                return res.status(401).json({
                    success: false,
                    message: 'Perfil de usuario no encontrado'
                });
            }
            // Verificación más flexible de estado activo
            if (!userProfile.is_active) {
                logger_1.logger.warn('Usuario inactivo intentando acceder', { userId: userProfile.id });
                return res.status(401).json({
                    success: false,
                    message: 'Cuenta de usuario desactivada'
                });
            }
            // Agregar usuario a la request
            req.user = userProfile;
            req.isAuthenticated = true;
            next();
        }
        catch (profileError) {
            logger_1.logger.error('Error obteniendo perfil de usuario:', profileError);
            return res.status(401).json({
                success: false,
                message: 'Error al verificar perfil de usuario'
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error de autenticación'
        });
    }
});
exports.authMiddleware = authMiddleware;
/**
 * Middleware de autenticación opcional (no falla si no hay token)
 * Útil para rutas que pueden funcionar con o sin autenticación
 */
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.isAuthenticated = false;
            return next(); // Continuar sin usuario
        }
        const token = authHeader.substring(7);
        if (!supabase_1.supabase) {
            req.isAuthenticated = false;
            return next(); // Continuar sin usuario
        }
        const { data: { user }, error } = yield supabase_1.supabase.auth.getUser(token);
        if (!error && user) {
            try {
                const userProfile = yield auth_service_1.AuthService.getUserById(user.id);
                if (userProfile && userProfile.is_active) {
                    req.user = userProfile;
                    req.isAuthenticated = true;
                }
                else {
                    req.isAuthenticated = false;
                }
            }
            catch (profileError) {
                logger_1.logger.warn('Error obteniendo perfil en auth opcional', { error: profileError instanceof Error ? profileError.message : 'Unknown error' });
                req.isAuthenticated = false;
            }
        }
        else {
            req.isAuthenticated = false;
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Optional auth middleware error:', error);
        req.isAuthenticated = false;
        next(); // Continuar sin usuario en caso de error
    }
});
exports.optionalAuth = optionalAuth;
/**
 * Middleware de autenticación temporal (para operaciones de corta duración)
 * Permite acceso temporal sin verificar estado completo del usuario
 */
const tempAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticación requerido'
            });
        }
        const token = authHeader.substring(7);
        if (!supabase_1.supabase) {
            return res.status(500).json({
                success: false,
                message: 'Servicio de autenticación no disponible'
            });
        }
        const { data: { user }, error } = yield supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }
        // Para autenticación temporal, solo verificamos que el token sea válido
        // No verificamos el estado completo del usuario en la base de datos
        req.user = {
            id: user.id,
            username: ((_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.username) || ((_b = user.email) === null || _b === void 0 ? void 0 : _b.split('@')[0]) || 'user',
            full_name: ((_c = user.user_metadata) === null || _c === void 0 ? void 0 : _c.full_name) || user.email || 'Usuario',
            email: user.email || '',
            role: ((_d = user.user_metadata) === null || _d === void 0 ? void 0 : _d.role) || 'agent',
            is_active: true
        };
        req.isAuthenticated = true;
        next();
    }
    catch (error) {
        logger_1.logger.error('Temp auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error de autenticación temporal'
        });
    }
});
exports.tempAuth = tempAuth;
/**
 * Middleware para verificar permisos específicos (simplificado)
 */
const requirePermission = (resource, action) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const hasPermission = yield auth_service_1.AuthService.hasPermission(req.user.id, resource, action);
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Permisos insuficientes'
                });
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Permission middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al verificar permisos'
            });
        }
    });
};
exports.requirePermission = requirePermission;
/**
 * Middleware para verificar rol de administrador (simplificado)
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Se requieren permisos de administrador'
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware para verificar rol de agente, supervisor o admin (simplificado)
 */
const requireAgentOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'agent' && req.user.role !== 'supervisor') {
        return res.status(403).json({
            success: false,
            message: 'Se requieren permisos de agente, supervisor o administrador'
        });
    }
    next();
};
exports.requireAgentOrAdmin = requireAgentOrAdmin;
/**
 * Middleware para verificar si el usuario está autenticado (sin verificar permisos)
 */
const requireAuth = (req, res, next) => {
    if (!req.user || !req.isAuthenticated) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }
    next();
};
exports.requireAuth = requireAuth;
