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
exports.optionalAuth = exports.requireAdmin = exports.authMiddleware = void 0;
const auth_service_1 = require("../services/auth.service");
const token_service_1 = require("../services/token.service");
const supabase_1 = require("../config/supabase");
/**
 * Middleware de autenticación con JWT manual
 * Valida tokens generados por nuestro sistema, no por Supabase Auth
 */
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🔐 [AuthMiddleware] Iniciando verificación de autenticación (JWT manual)');
        console.log('🔐 [AuthMiddleware] Ruta:', req.path);
        console.log('🔐 [AuthMiddleware] Método:', req.method);
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ [AuthMiddleware] No se encontró header Authorization válido');
            return res.status(401).json({
                success: false,
                message: 'Token de autenticación requerido'
            });
        }
        const token = authHeader.substring(7); // Remover 'Bearer ' del token
        console.log('🔐 [AuthMiddleware] Token extraído:', token.substring(0, 20) + '...');
        // Verificar token usando TokenService (JWT propio)
        let decoded = token_service_1.TokenService.verifyAccessToken(token);
        // Fallback: aceptar token de Supabase si el nuestro no es válido
        if (!decoded) {
            console.warn('❕ [AuthMiddleware] JWT propio inválido/expirado. Probando token de Supabase...');
            try {
                if (!supabase_1.supabaseAdmin) {
                    console.warn('⚠️ [AuthMiddleware] supabaseAdmin no configurado para validar token de Supabase');
                }
                else {
                    const { data, error } = yield supabase_1.supabaseAdmin.auth.getUser(token);
                    if (error) {
                        console.warn('❌ [AuthMiddleware] Supabase getUser error:', error.message);
                    }
                    if (data === null || data === void 0 ? void 0 : data.user) {
                        console.log('✅ [AuthMiddleware] Token Supabase válido. Usuario:', {
                            id: data.user.id,
                            email: data.user.email
                        });
                        // Intentar obtener perfil por id primero, luego por email
                        const byId = yield auth_service_1.AuthService.getUserById(data.user.id);
                        const byEmail = !byId && data.user.email
                            ? yield auth_service_1.AuthService.getUserByEmail(data.user.email)
                            : null;
                        const userProfile = byId || byEmail;
                        if (!userProfile) {
                            console.warn('❌ [AuthMiddleware] Perfil de usuario no encontrado para Supabase user');
                            return res.status(401).json({
                                success: false,
                                message: 'Perfil de usuario no encontrado'
                            });
                        }
                        // Adjuntar y continuar
                        req.user = userProfile;
                        console.log('✅ [AuthMiddleware] Autenticación exitosa vía Supabase');
                        return next();
                    }
                }
            }
            catch (supaErr) {
                console.error('❌ [AuthMiddleware] Error validando token con Supabase:', supaErr);
            }
            // Si tampoco fue un token de Supabase válido, rechazar
            console.warn('❌ [AuthMiddleware] Token inválido o expirado (tampoco válido en Supabase)');
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }
        console.log('✅ [AuthMiddleware] Token JWT válido, datos decodificados:', {
            sub: decoded.sub,
            username: decoded.username,
            role: decoded.role
        });
        // Obtener perfil del usuario desde la base de datos
        const userProfile = yield auth_service_1.AuthService.getUserById(decoded.sub);
        if (!userProfile) {
            console.warn('❌ [AuthMiddleware] Perfil de usuario no encontrado', { userId: decoded.sub });
            return res.status(401).json({
                success: false,
                message: 'Perfil de usuario no encontrado'
            });
        }
        console.log('✅ [AuthMiddleware] Perfil de usuario obtenido:', {
            userId: userProfile.id,
            username: userProfile.username,
            role: userProfile.role,
            isActive: userProfile.is_active
        });
        // Verificar si el usuario está activo
        if (!userProfile.is_active) {
            console.warn('❌ [AuthMiddleware] Usuario inactivo intentando acceder', { userId: userProfile.id });
            return res.status(401).json({
                success: false,
                message: 'Usuario inactivo'
            });
        }
        // Adjuntar usuario al request para usar en las rutas
        req.user = userProfile;
        console.log('✅ [AuthMiddleware] Autenticación exitosa, continuando...');
        next();
    }
    catch (error) {
        console.error('❌ [AuthMiddleware] Error general en middleware:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});
exports.authMiddleware = authMiddleware;
/**
 * Middleware que requiere rol de administrador
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
            message: 'Acceso denegado. Se requieren permisos de administrador.'
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware de autenticación opcional
 */
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No hay token, pero es opcional, continuar sin usuario
            return next();
        }
        const token = authHeader.substring(7);
        // Verificar token usando TokenService
        const decoded = token_service_1.TokenService.verifyAccessToken(token);
        if (decoded) {
            const userProfile = yield auth_service_1.AuthService.getUserById(decoded.sub);
            if (userProfile && userProfile.is_active) {
                req.user = userProfile;
                req.isAuthenticated = true;
            }
        }
        else {
            // Token inválido, pero es opcional, continuar sin usuario
            console.log('Token opcional inválido, continuando sin autenticación');
        }
        next();
    }
    catch (error) {
        // Error en el middleware opcional, continuar sin usuario
        next();
    }
});
exports.optionalAuth = optionalAuth;
