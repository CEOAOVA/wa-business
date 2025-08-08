"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
// Tipos de errores personalizados
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, errors) {
        super(message, 400, 'VALIDATION_ERROR');
        if (errors) {
            this.errors = errors;
        }
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'No autenticado') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'No autorizado') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Recurso no encontrado') {
        super(message, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Conflicto con el estado actual') {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Demasiadas solicitudes', retryAfter) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        if (retryAfter) {
            this.retryAfter = retryAfter;
        }
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Middleware de manejo global de errores
 */
const errorHandler = (err, req, res, next) => {
    var _a;
    // Si la respuesta ya fue enviada, delegar a Express
    if (res.headersSent) {
        return next(err);
    }
    // Determinar si es un error operacional
    const isOperational = err.isOperational || false;
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    // Log del error
    const errorInfo = {
        message: err.message,
        code,
        statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        requestId: req.requestId
    };
    if (!isOperational || statusCode >= 500) {
        logger_1.logger.error('Unhandled error', errorInfo);
    }
    else {
        logger_1.logger.warn('Operational error', errorInfo);
    }
    // Preparar respuesta
    const response = {
        success: false,
        message: err.message || 'Error interno del servidor',
        code
    };
    // Incluir información adicional según el tipo de error
    if (err.errors) {
        response.errors = err.errors;
    }
    if (err.retryAfter) {
        response.retryAfter = err.retryAfter;
        res.set('Retry-After', err.retryAfter.toString());
    }
    // En desarrollo, incluir stack trace
    if (process.env.NODE_ENV === 'development' && !isOperational) {
        response.stack = err.stack;
    }
    // Enviar respuesta
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
/**
 * Middleware para capturar errores asíncronos
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Middleware para rutas no encontradas
 */
const notFoundHandler = (req, res) => {
    const error = new NotFoundError(`Ruta no encontrada: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        message: error.message,
        code: error.code
    });
};
exports.notFoundHandler = notFoundHandler;
