"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappRateLimit = exports.authRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limit para autenticación
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'production' ? 5 : 50, // Más permisivo en desarrollo
    message: {
        error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    // Agregar configuración para saltar rate limiting en desarrollo
    skip: (req) => {
        // Saltar rate limiting para IPs locales en desarrollo
        const ip = req.ip || req.connection.remoteAddress || '';
        const isLocalDev = process.env.NODE_ENV === 'development' && (ip.includes('127.0.0.1') ||
            ip.includes('::1') ||
            ip.includes('localhost') ||
            ip.includes('192.168.'));
        // Saltar para health checks
        const isHealthCheck = req.path === '/health';
        return isLocalDev || isHealthCheck;
    }
});
// Rate limit para WhatsApp API
exports.whatsappRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // máximo 30 requests por minuto
    message: {
        error: 'Demasiadas solicitudes a WhatsApp API. Intenta de nuevo en 1 minuto.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});
