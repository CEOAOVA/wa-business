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
/**
 * Rutas de autenticación para WhatsApp Business Platform
 * Sistema de acceso restringido solo para usuarios pre-autorizados
 */
const express_1 = require("express");
const auth_service_1 = require("../services/auth.service");
const token_service_1 = require("../services/token.service");
const logger_1 = require("../utils/logger");
const auth_jwt_1 = require("../middleware/auth-jwt");
const supabase_1 = require("../config/supabase");
const session_cleanup_service_1 = require("../services/session-cleanup.service");
const router = (0, express_1.Router)();
/**
 * @route POST /api/auth/login
 * @desc Autenticar usuario
 * @access Public
 */
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        // Si llega un token de Supabase (por ejemplo desde frontend ya autenticado), permitir bypass
        const authHeader = req.headers.authorization;
        if ((authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) && supabase_1.supabaseAdmin) {
            const token = authHeader.substring(7);
            const { data, error } = yield supabase_1.supabaseAdmin.auth.getUser(token);
            if ((data === null || data === void 0 ? void 0 : data.user) && !error) {
                // Ya autenticado con Supabase; devolver perfil y sesión simulada
                const byId = yield auth_service_1.AuthService.getUserById(data.user.id);
                const byEmail = !byId && data.user.email
                    ? yield auth_service_1.AuthService.getUserByEmail(data.user.email)
                    : null;
                const user = byId || byEmail;
                if (user) {
                    return res.json({
                        success: true,
                        message: 'Login vía Supabase',
                        data: {
                            user,
                            session: { access_token: token, token_type: 'bearer' }
                        }
                    });
                }
            }
        }
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }
        const result = yield auth_service_1.AuthService.login({ username, password });
        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: result.user,
                session: result.session
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        res.status(401).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error de autenticación'
        });
    }
}));
/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario (solo admins)
 * @access Private (Admin)
 */
router.post('/register', auth_jwt_1.authMiddleware, auth_jwt_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userData = req.body;
        // Validaciones básicas
        if (!userData.email || !userData.password || !userData.username || !userData.full_name) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }
        // Validar contraseña (mínimo 8 caracteres)
        if (userData.password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }
        const newUser = yield auth_service_1.AuthService.createUser(userData);
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                user: newUser
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Register error:', error);
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al crear usuario'
        });
    }
}));
/**
 * @route GET /api/auth/profile
 * @desc Obtener perfil del usuario actual
 * @access Private
 */
router.get('/profile', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Obtener usuario desde el middleware de autenticación
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }
        const user = yield auth_service_1.AuthService.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        res.json({
            success: true,
            data: {
                user
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil'
        });
    }
}));
/**
 * @route PUT /api/auth/profile
 * @desc Actualizar perfil del usuario
 * @access Private
 */
router.put('/profile', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }
        const updates = req.body;
        // No permitir actualizar campos sensibles
        delete updates.id;
        delete updates.role;
        delete updates.created_at;
        delete updates.updated_at;
        const updatedUser = yield auth_service_1.AuthService.updateUserProfile(userId, updates);
        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: {
                user: updatedUser
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Update profile error:', error);
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar perfil'
        });
    }
}));
/**
 * @route GET /api/auth/users
 * @desc Obtener todos los usuarios (solo admins)
 * @access Private (Admin)
 */
router.get('/users', auth_jwt_1.authMiddleware, auth_jwt_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = req.user;
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Se requieren permisos de administrador'
            });
        }
        const users = yield auth_service_1.AuthService.getAllUsers();
        res.json({
            success: true,
            data: {
                users
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
}));
/**
 * @route POST /api/auth/logout
 * @desc Cerrar sesión
 * @access Private
 */
router.post('/logout', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // En Supabase, el logout se maneja en el cliente
        // Aquí solo podemos limpiar la sesión del servidor si es necesario
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    }
    catch (error) {
        logger_1.logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cerrar sesión'
        });
    }
}));
/**
 * @route POST /api/auth/init-admin
 * @desc Crear usuario admin inicial (solo para setup inicial)
 * @access Public (solo para setup)
 */
router.post('/init-admin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar si ya existe un admin
        const users = yield auth_service_1.AuthService.getAllUsers();
        const adminExists = users.some(user => user.role === 'admin');
        if (adminExists) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un usuario administrador'
            });
        }
        const admin = yield auth_service_1.AuthService.createInitialAdmin();
        res.status(201).json({
            success: true,
            message: 'Usuario administrador creado exitosamente',
            data: {
                user: admin
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Init admin error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al crear administrador inicial'
        });
    }
}));
/**
 * @route POST /api/auth/clear-sessions
 * @desc Limpiar todas las sesiones del servidor (solo admins)
 * @access Private (Admin)
 */
router.post('/clear-sessions', auth_jwt_1.authMiddleware, auth_jwt_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = req.user;
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Se requieren permisos de administrador'
            });
        }
        console.log('🧹 Limpieza manual de sesiones iniciada por admin:', currentUser.email);
        // Importar y limpiar servicios
        const { rateLimiter } = yield Promise.resolve().then(() => __importStar(require('../services/rate-limiter/rate-limiter')));
        const { cacheService } = yield Promise.resolve().then(() => __importStar(require('../services/cache/cache-service')));
        let cleanedServices = [];
        // Limpiar rate limiter
        if (rateLimiter) {
            rateLimiter.destroy();
            cleanedServices.push('rate-limiter');
        }
        // Limpiar caché
        if (cacheService) {
            cacheService.destroy();
            cleanedServices.push('cache-service');
        }
        // Limpiar conversaciones del chatbot
        try {
            const { ChatbotService } = yield Promise.resolve().then(() => __importStar(require('../services/chatbot.service')));
            const chatbotService = new ChatbotService();
            if (chatbotService && typeof chatbotService['cleanupExpiredSessions'] === 'function') {
                chatbotService['cleanupExpiredSessions']();
                cleanedServices.push('chatbot-sessions');
            }
        }
        catch (error) {
            logger_1.logger.warn('Error limpiando chatbot sessions', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
        // Limpiar conversaciones generales
        try {
            const { ConversationService } = yield Promise.resolve().then(() => __importStar(require('../services/conversation/conversation-service')));
            const conversationService = new ConversationService();
            if (conversationService && typeof conversationService['cleanupInactiveSessions'] === 'function') {
                const removedCount = conversationService['cleanupInactiveSessions'](0);
                cleanedServices.push(`conversation-sessions (${removedCount} removidas)`);
            }
        }
        catch (error) {
            logger_1.logger.warn('Error limpiando conversation sessions', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
        // Limpiar caché de inventario
        try {
            const { InventoryCache } = yield Promise.resolve().then(() => __importStar(require('../services/soap/inventory-cache')));
            const inventoryCache = new InventoryCache();
            if (inventoryCache && typeof inventoryCache.clear === 'function') {
                inventoryCache.clear();
                cleanedServices.push('inventory-cache');
            }
        }
        catch (error) {
            logger_1.logger.warn('Error limpiando inventory cache', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
        logger_1.logger.info('Sesiones limpiadas manualmente', {
            userId: currentUser.id,
            metadata: { cleanedServices }
        });
        res.json({
            success: true,
            message: 'Sesiones limpiadas exitosamente',
            data: {
                cleanedServices,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Clear sessions error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al limpiar sesiones'
        });
    }
}));
/**
 * @route DELETE /api/auth/users/:userId
 * @desc Desactivar usuario (solo admins)
 * @access Private (Admin)
 */
router.delete('/users/:userId', auth_jwt_1.authMiddleware, auth_jwt_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = req.user;
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Se requieren permisos de administrador'
            });
        }
        const { userId } = req.params;
        // No permitir desactivar el propio usuario admin
        if (userId === currentUser.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes desactivar tu propia cuenta'
            });
        }
        yield auth_service_1.AuthService.deactivateUser(userId);
        res.json({
            success: true,
            message: 'Usuario desactivado exitosamente'
        });
    }
    catch (error) {
        logger_1.logger.error('Deactivate user error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al desactivar usuario'
        });
    }
}));
/**
 * @route GET /api/auth/sessions
 * @desc Obtener información de sesiones activas (solo admins)
 * @access Private (Admin)
 */
router.get('/sessions', auth_jwt_1.authMiddleware, auth_jwt_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sessions = yield session_cleanup_service_1.sessionCleanupService.getActiveSessions();
        res.json({
            success: true,
            data: {
                sessions,
                stats: session_cleanup_service_1.sessionCleanupService.getServiceStats()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener sesiones'
        });
    }
}));
/**
 * @route POST /api/auth/sessions/cleanup
 * @desc Limpiar sesiones expiradas (solo admins)
 * @access Private (Admin)
 */
router.post('/sessions/cleanup', auth_jwt_1.authMiddleware, auth_jwt_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield session_cleanup_service_1.sessionCleanupService.cleanupExpiredSessions();
        res.json({
            success: true,
            message: 'Limpieza de sesiones completada',
            data: result
        });
    }
    catch (error) {
        logger_1.logger.error('Cleanup sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al limpiar sesiones'
        });
    }
}));
/**
 * @route POST /api/auth/sessions/force-cleanup
 * @desc Forzar limpieza de todas las sesiones (solo admins)
 * @access Private (Admin)
 */
router.post('/sessions/force-cleanup', auth_jwt_1.authMiddleware, auth_jwt_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield session_cleanup_service_1.sessionCleanupService.forceCleanupAllSessions();
        res.json({
            success: true,
            message: 'Limpieza forzada de sesiones completada',
            data: result
        });
    }
    catch (error) {
        logger_1.logger.error('Force cleanup sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al forzar limpieza de sesiones'
        });
    }
}));
/**
 * @route DELETE /api/auth/sessions/:userId
 * @desc Limpiar sesión de un usuario específico (solo admins)
 * @access Private (Admin)
 */
router.delete('/sessions/:userId', auth_jwt_1.authMiddleware, auth_jwt_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const success = yield session_cleanup_service_1.sessionCleanupService.cleanupUserSessions(userId);
        if (success) {
            res.json({
                success: true,
                message: 'Sesión de usuario limpiada exitosamente'
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Error al limpiar sesión de usuario'
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Cleanup user session error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al limpiar sesión de usuario'
        });
    }
}));
/**
 * @route POST /api/auth/refresh
 * @desc Refrescar access token usando refresh token
 * @access Public (requiere refresh token válido)
 */
router.post('/refresh', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refresh_token } = req.body;
        const userAgent = req.get('User-Agent');
        const ipAddress = req.ip || req.connection.remoteAddress;
        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token es requerido'
            });
        }
        // Usar TokenService para renovar el access token
        const result = yield token_service_1.TokenService.refreshAccessToken(refresh_token, userAgent, ipAddress);
        if (!result) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token inválido o expirado'
            });
        }
        res.json({
            success: true,
            message: 'Token renovado exitosamente',
            data: {
                access_token: result.accessToken,
                token_type: 'bearer',
                expires_in: result.expiresIn
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al renovar token'
        });
    }
}));
/**
 * @route POST /api/auth/revoke
 * @desc Revocar refresh token
 * @access Private
 */
router.post('/revoke', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token es requerido'
            });
        }
        const success = yield token_service_1.TokenService.revokeRefreshToken(refresh_token);
        if (!success) {
            return res.status(400).json({
                success: false,
                message: 'Error al revocar token'
            });
        }
        res.json({
            success: true,
            message: 'Token revocado exitosamente'
        });
    }
    catch (error) {
        logger_1.logger.error('Revoke token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al revocar token'
        });
    }
}));
/**
 * @route GET /api/auth/status
 * @desc Verificar estado de autenticación
 * @access Private
 */
router.get('/status', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({
            success: true,
            message: 'Usuario autenticado',
            data: {
                isAuthenticated: true,
                user: req.user
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando estado de autenticación'
        });
    }
}));
exports.default = router;
