"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = void 0;
const logger_1 = require("../config/logger");
/**
 * Middleware global para manejo de errores
 * Captura todos los errores no manejados y envía respuestas apropiadas
 */
const errorHandler = (err, req, res, next) => {
    var _a, _b, _c, _d, _e, _f, _g;
    // Log del error completo para debugging
    logger_1.logger.error('Error Handler Triggered:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
    });
    // Determinar el tipo de error y responder apropiadamente
    // Errores de Supabase
    if ((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes('Supabase Error')) {
        const supabaseErrorMatch = err.message.match(/Code: (\w+)/);
        const errorCode = supabaseErrorMatch ? supabaseErrorMatch[1] : 'UNKNOWN';
        // Mapear códigos de error de Supabase a mensajes amigables
        let userMessage = 'Error al acceder a la base de datos';
        let statusCode = 500;
        switch (errorCode) {
            case 'PGRST116': // No rows found
                userMessage = 'Registro no encontrado';
                statusCode = 404;
                break;
            case '23505': // Unique constraint violation
                userMessage = 'El registro ya existe';
                statusCode = 409;
                break;
            case '23503': // Foreign key violation
                userMessage = 'Referencia a registro inválida';
                statusCode = 400;
                break;
            case '42501': // Insufficient privilege
                userMessage = 'Sin permisos para realizar esta operación';
                statusCode = 403;
                break;
            case 'PGRST301': // JWT expired
                userMessage = 'Sesión expirada, por favor inicie sesión nuevamente';
                statusCode = 401;
                break;
            default:
                if (err.message.includes('RLS')) {
                    userMessage = 'Acceso denegado por políticas de seguridad';
                    statusCode = 403;
                }
        }
        return res.status(statusCode).json({
            success: false,
            error: userMessage,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            code: `SUPABASE_${errorCode}`,
            timestamp: new Date().toISOString()
        });
    }
    // Errores de WhatsApp API
    if (((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes('WhatsApp')) || ((_c = err.message) === null || _c === void 0 ? void 0 : _c.includes('webhook'))) {
        return res.status(503).json({
            success: false,
            error: 'Servicio de WhatsApp temporalmente no disponible',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            code: 'WHATSAPP_ERROR',
            timestamp: new Date().toISOString()
        });
    }
    // Errores de validación
    if (((_d = err.message) === null || _d === void 0 ? void 0 : _d.includes('validation')) || ((_e = err.message) === null || _e === void 0 ? void 0 : _e.includes('required'))) {
        return res.status(400).json({
            success: false,
            error: 'Datos de entrada inválidos',
            details: err.message,
            code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString()
        });
    }
    // Errores de autenticación
    if (((_f = err.message) === null || _f === void 0 ? void 0 : _f.includes('auth')) || ((_g = err.message) === null || _g === void 0 ? void 0 : _g.includes('token'))) {
        return res.status(401).json({
            success: false,
            error: 'Error de autenticación',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            code: 'AUTH_ERROR',
            timestamp: new Date().toISOString()
        });
    }
    // Error genérico
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Error interno del servidor' : err.message,
        details: process.env.NODE_ENV === 'development' ? {
            message: err.message,
            stack: err.stack
        } : undefined,
        code: err.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
};
exports.errorHandler = errorHandler;
/**
 * Middleware para capturar errores asíncronos
 * Envuelve funciones asíncronas para capturar rechazos de promesas
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
/**
 * Middleware para rutas no encontradas
 */
const notFoundHandler = (req, res) => {
    logger_1.logger.warn('404 - Ruta no encontrada:', {
        path: req.path,
        method: req.method
    });
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.path,
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
    });
};
exports.notFoundHandler = notFoundHandler;
