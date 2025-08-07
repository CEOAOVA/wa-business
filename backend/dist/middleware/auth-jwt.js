"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const jwt = __importStar(require("jsonwebtoken"));
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
        // Verificar JWT token generado por nuestro sistema
        const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
        try {
            // Verificar y decodificar el token JWT
            const decoded = jwt.verify(token, jwtSecret);
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
        catch (jwtError) {
            console.warn('❌ [AuthMiddleware] Token JWT inválido o expirado', {
                error: jwtError.message
            });
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }
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
        const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
        try {
            const decoded = jwt.verify(token, jwtSecret);
            const userProfile = yield auth_service_1.AuthService.getUserById(decoded.sub);
            if (userProfile && userProfile.is_active) {
                req.user = userProfile;
                req.isAuthenticated = true;
            }
        }
        catch (jwtError) {
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
