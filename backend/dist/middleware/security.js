"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySecurity = exports.validateUserAgent = exports.securityLogger = exports.webhookRateLimit = exports.authRateLimit = exports.generalRateLimit = exports.configureSecurityHeaders = exports.configureCORS = void 0;
/**
 * Middleware de seguridad para WhatsApp Business Platform
 * Implementa CORS restrictivo, headers de seguridad y rate limiting
 */
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Configurar CORS restrictivo
 */
const configureCORS = () => {
    const corsOptions = {
        origin: (origin, callback) => {
            var _a;
            // Permitir requests sin origin (como Postman, apps móviles)
            if (!origin)
                return callback(null, true);
            // Obtener orígenes permitidos desde variables de entorno
            const allowedOrigins = ((_a = process.env.CORS_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',').map(o => o.trim())) || [
                'http://localhost:5173',
                'http://localhost:3000',
                'https://dev-waprueba.aova.mx' // Frontend en dominio separado
            ];
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                console.warn(`🚫 [CORS] Origen bloqueado: ${origin}`);
                callback(new Error('Acceso bloqueado por política CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin'
        ],
        credentials: true,
        maxAge: 86400 // 24 horas
    };
    return (0, cors_1.default)(corsOptions);
};
exports.configureCORS = configureCORS;
/**
 * Configurar headers de seguridad con Helmet
 */
const configureSecurityHeaders = () => {
    return (0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://api.openrouter.ai", "https://graph.facebook.com"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false, // Necesario para algunas APIs
        hsts: {
            maxAge: 31536000, // 1 año
            includeSubDomains: true,
            preload: true
        }
    });
};
exports.configureSecurityHeaders = configureSecurityHeaders;
/**
 * Rate limiting general
 */
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minuto
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests por minuto
    message: {
        success: false,
        error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[Security] ⚠️ Rate limit excedido para IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.',
            code: 'RATE_LIMIT_EXCEEDED'
        });
    }
});
/**
 * Rate limiting para autenticación (más restrictivo)
 */
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '300000'), // 5 minutos
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'), // 5 intentos por 5 minutos
    message: {
        success: false,
        error: 'Demasiados intentos de login. Intenta de nuevo en 5 minutos.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // No contar requests exitosos
    handler: (req, res) => {
        console.warn(`[Security] ⚠️ Rate limit de auth excedido para IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Demasiados intentos de login. Intenta de nuevo en 5 minutos.',
            code: 'AUTH_RATE_LIMIT_EXCEEDED'
        });
    }
});
/**
 * Rate limiting para webhooks (más permisivo)
 */
exports.webhookRateLimit = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WEBHOOK_WINDOW || '60000'), // 1 minuto
    max: parseInt(process.env.RATE_LIMIT_WEBHOOK_MAX || '200'), // 200 requests por minuto
    message: {
        success: false,
        error: 'Webhook rate limit exceeded',
        code: 'WEBHOOK_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[Security] ⚠️ Webhook rate limit excedido para IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Webhook rate limit exceeded',
            code: 'WEBHOOK_RATE_LIMIT_EXCEEDED'
        });
    }
});
/**
 * Middleware de logging de seguridad
 */
const securityLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const method = req.method;
    const url = req.url;
    const origin = req.get('Origin') || 'No origin';
    // Log detallado solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Security] ${timestamp} - ${ip} - ${method} ${url} - ${userAgent} - Origin: ${origin}`);
    }
    // En producción, solo logear requests sospechosos
    if (process.env.NODE_ENV === 'production') {
        // Detectar patrones sospechosos
        const suspiciousPatterns = [
            /\.\./, // Path traversal
            /script/i, // XSS attempts
            /union.*select/i, // SQL injection
            /eval\(/i, // Code injection
        ];
        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url) || pattern.test(userAgent));
        if (isSuspicious) {
            console.warn(`[Security] 🚨 Suspicious request: ${ip} - ${method} ${url} - ${userAgent}`);
        }
    }
    next();
};
exports.securityLogger = securityLogger;
/**
 * Middleware para validar User-Agent (con excepciones para APIs)
 */
const validateUserAgent = (req, res, next) => {
    var _a;
    // Excluir rutas de API de la validación estricta de User-Agent
    // Las APIs tienen sus propios mecanismos de autenticación y seguridad
    if (req.url.startsWith('/api/') || ((_a = req.path) === null || _a === void 0 ? void 0 : _a.startsWith('/api/'))) {
        return next();
    }
    // Solo aplicar en producción
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }
    const userAgent = req.get('User-Agent');
    if (!userAgent) {
        console.warn(`[Security] ⚠️ Request sin User-Agent desde IP: ${req.ip}`);
        return res.status(400).json({
            success: false,
            error: 'User-Agent requerido',
            code: 'MISSING_USER_AGENT'
        });
    }
    // Lista de User-Agents permitidos (incluyendo Meta/WhatsApp)
    const allowedUserAgents = [
        // Navegadores modernos
        /Mozilla\/5\.0/,
        /Chrome/,
        /Firefox/,
        /Safari/,
        /Edge/,
        // Herramientas de testing
        /PostmanRuntime/,
        /curl/,
        /axios/,
        /node/,
        // WhatsApp y Meta
        /WhatsApp/i,
        /facebookplatform/i,
        /Meta/i,
        /facebook/i,
        // APIs y bots legítimos
        /webhook/i,
        /test/i // Para testing
    ];
    const isAllowed = allowedUserAgents.some(pattern => pattern.test(userAgent));
    if (!isAllowed) {
        console.warn(`[Security] ⚠️ User-Agent no permitido: ${userAgent} desde IP: ${req.ip} para ruta: ${req.url}`);
        return res.status(403).json({
            success: false,
            error: 'User-Agent no permitido',
            code: 'FORBIDDEN_USER_AGENT'
        });
    }
    next();
};
exports.validateUserAgent = validateUserAgent;
/**
 * Aplicar toda la configuración de seguridad
 */
const applySecurity = (app) => {
    console.log('[Security] 🔒 Aplicando configuración de seguridad...');
    // Headers de seguridad
    app.use((0, exports.configureSecurityHeaders)());
    // CORS restrictivo
    app.use((0, exports.configureCORS)());
    // Rate limiting general
    app.use(exports.generalRateLimit);
    // Logging de seguridad
    app.use(exports.securityLogger);
    // Validación de User-Agent en producción
    app.use(exports.validateUserAgent);
    console.log('[Security] ✅ Configuración de seguridad aplicada');
};
exports.applySecurity = applySecurity;
