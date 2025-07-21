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
/**
 * Rutas de autenticación para WhatsApp Business Platform
 * Sistema de acceso restringido solo para usuarios pre-autorizados
 */
const express_1 = require("express");
const auth_service_1 = require("../services/auth.service");
const logger_1 = require("../utils/logger");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @route POST /api/auth/login
 * @desc Autenticar usuario
 * @access Public
 */
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }
        const result = yield auth_service_1.AuthService.login({ email, password });
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
router.post('/register', auth_1.authMiddleware, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.get('/profile', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.put('/profile', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.get('/users', auth_1.authMiddleware, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.post('/logout', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
 * @route DELETE /api/auth/users/:userId
 * @desc Desactivar usuario (solo admins)
 * @access Private (Admin)
 */
router.delete('/users/:userId', auth_1.authMiddleware, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.default = router;
