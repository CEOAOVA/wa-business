"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Rutas de autenticación para WhatsApp Business Platform
 * Sistema de acceso restringido solo para usuarios pre-autorizados
 */
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * POST /api/auth/login
 * Endpoint de login para usuarios autorizados
 */
router.post('/login', auth_1.loginHandler);
/**
 * GET /api/auth/me
 * Obtener información del usuario actual
 * Requiere autenticación
 */
router.get('/me', auth_1.authMiddleware, auth_1.getUserInfo);
/**
 * POST /api/auth/validate
 * Validar token JWT
 * Requiere autenticación
 */
router.post('/validate', auth_1.authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'Token válido',
        data: {
            valid: true,
            user: req.user
        }
    });
});
/**
 * GET /api/auth/status
 * Estado del sistema de autenticación
 */
router.get('/status', (req, res) => {
    const authorizedUsers = process.env.AUTHORIZED_USERS;
    const jwtSecret = process.env.JWT_SECRET;
    res.json({
        success: true,
        data: {
            authSystemActive: true,
            restrictedAccess: true,
            authorizedUsersConfigured: !!authorizedUsers,
            jwtConfigured: !!jwtSecret,
            usersCount: authorizedUsers ? authorizedUsers.split(',').length : 0
        }
    });
});
exports.default = router;
