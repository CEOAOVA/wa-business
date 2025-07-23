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
exports.optionalAuth = exports.requireAgentOrAdmin = exports.requireAdmin = exports.requirePermission = exports.authMiddleware = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const auth_service_1 = require("../services/auth.service");
/**
 * Middleware de autenticación con Supabase
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
        // Verificar token con Supabase
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
        // Obtener perfil del usuario
        const userProfile = yield auth_service_1.AuthService.getUserById(user.id);
        if (!userProfile) {
            return res.status(401).json({
                success: false,
                message: 'Perfil de usuario no encontrado'
            });
        }
        if (!userProfile.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Cuenta de usuario desactivada'
            });
        }
        // Agregar usuario a la request
        req.user = userProfile;
        next();
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
 * Middleware para verificar permisos específicos
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
 * Middleware para verificar rol de administrador
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
 * Middleware para verificar rol de agente, supervisor o admin
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
 * Middleware opcional de autenticación (no falla si no hay token)
 */
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Continuar sin usuario
        }
        const token = authHeader.substring(7);
        if (!supabase_1.supabase) {
            return next(); // Continuar sin usuario
        }
        const { data: { user }, error } = yield supabase_1.supabase.auth.getUser(token);
        if (!error && user) {
            const userProfile = yield auth_service_1.AuthService.getUserById(user.id);
            if (userProfile && userProfile.is_active) {
                req.user = userProfile;
            }
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Optional auth middleware error:', error);
        next(); // Continuar sin usuario en caso de error
    }
});
exports.optionalAuth = optionalAuth;
