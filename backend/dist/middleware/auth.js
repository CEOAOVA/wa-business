"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserInfo = exports.loginHandler = exports.authMiddleware = exports.generateAuthToken = void 0;
/**
 * Middleware de autenticación restringida para WhatsApp Business Platform
 * Solo permite acceso a usuarios pre-autorizados definidos en variables de entorno
 */
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ms_1 = __importDefault(require("ms"));
/**
 * Obtener lista de usuarios autorizados desde variables de entorno
 */
const getAuthorizedUsers = () => {
    const authorizedUsers = process.env.AUTHORIZED_USERS;
    if (!authorizedUsers) {
        console.warn('[AuthMiddleware] ⚠️ AUTHORIZED_USERS no configurado. Acceso denegado por defecto.');
        return [];
    }
    return authorizedUsers.split(',').map(email => email.trim().toLowerCase());
};
/**
 * Verificar si un email está en la lista de usuarios autorizados
 */
const isAuthorizedUser = (email) => {
    const authorizedUsers = getAuthorizedUsers();
    return authorizedUsers.includes(email.toLowerCase());
};
/**
 * Generar JWT token para usuario autorizado
 */
const generateAuthToken = (email, userId, role = 'agent') => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET no configurado');
    }
    const payload = {
        email,
        userId,
        role,
    };
    const expiresInString = (process.env.JWT_EXPIRES_IN || '8h');
    const expiresInNumber = Math.floor((0, ms_1.default)(expiresInString) / 1000);
    const options = {
        expiresIn: expiresInNumber,
    };
    return jsonwebtoken_1.default.sign(payload, jwtSecret, options);
};
exports.generateAuthToken = generateAuthToken;
/**
 * Middleware de autenticación JWT
 */
const authMiddleware = (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Token de autenticación requerido',
                code: 'MISSING_TOKEN'
            });
            return;
        }
        const token = authHeader.split(' ')[1];
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('[AuthMiddleware] ❌ JWT_SECRET no configurado');
            res.status(500).json({
                success: false,
                error: 'Error de configuración del servidor',
                code: 'SERVER_CONFIG_ERROR'
            });
            return;
        }
        // Verificar y decodificar el token
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Verificar que el usuario sigue siendo autorizado
        if (!isAuthorizedUser(decoded.email)) {
            console.warn(`[AuthMiddleware] ⚠️ Usuario ${decoded.email} ya no está autorizado`);
            res.status(403).json({
                success: false,
                error: 'Acceso revocado',
                code: 'ACCESS_REVOKED'
            });
            return;
        }
        // Agregar información del usuario a la request
        req.user = {
            email: decoded.email,
            userId: decoded.userId,
            role: decoded.role,
            exp: decoded.exp
        };
        console.log(`[AuthMiddleware] ✅ Usuario autenticado: ${decoded.email}`);
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token expirado',
                code: 'TOKEN_EXPIRED'
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
            return;
        }
        console.error('[AuthMiddleware] ❌ Error en autenticación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno de autenticación',
            code: 'AUTH_ERROR'
        });
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Endpoint de login para usuarios autorizados
 */
const loginHandler = (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: 'Email y contraseña requeridos',
                code: 'MISSING_CREDENTIALS'
            });
            return;
        }
        // Verificar que el email está en la lista autorizada
        if (!isAuthorizedUser(email)) {
            console.warn(`[LoginHandler] ⚠️ Intento de acceso no autorizado: ${email}`);
            res.status(403).json({
                success: false,
                error: 'Acceso no autorizado',
                code: 'UNAUTHORIZED_USER'
            });
            return;
        }
        // En un sistema real, aquí verificarías la contraseña
        // Para este caso, usaremos una contraseña temporal por usuario
        const tempPassword = process.env.TEMP_PASSWORD || 'aova2024';
        if (password !== tempPassword) {
            res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }
        // Generar token JWT
        const userId = email.split('@')[0]; // Usar parte del email como userId
        const token = (0, exports.generateAuthToken)(email, userId);
        console.log(`[LoginHandler] ✅ Login exitoso: ${email}`);
        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                token,
                user: {
                    email,
                    userId,
                    role: 'agent'
                }
            }
        });
    }
    catch (error) {
        console.error('[LoginHandler] ❌ Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            code: 'LOGIN_ERROR'
        });
    }
};
exports.loginHandler = loginHandler;
/**
 * Middleware para verificar información del usuario actual
 */
const getUserInfo = (req, res) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Usuario no autenticado',
            code: 'NOT_AUTHENTICATED'
        });
        return;
    }
    res.json({
        success: true,
        data: {
            email: req.user.email,
            userId: req.user.userId,
            role: req.user.role,
            tokenExpiresAt: new Date(req.user.exp * 1000).toISOString()
        }
    });
};
exports.getUserInfo = getUserInfo;
exports.default = exports.authMiddleware;
