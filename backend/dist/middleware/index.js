"use strict";
/**
 * Exportación centralizada de middlewares
 * Facilita la migración al nuevo sistema unificado
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.requestLogger = exports.validateRequest = exports.rateLimitMiddleware = exports.legacyAuth = exports.clearUserCache = exports.invalidateUserCache = exports.requirePermission = exports.requireSupervisor = exports.requireAdmin = exports.requireRole = exports.optionalAuth = exports.authMiddleware = exports.authenticate = void 0;
// Exportar el nuevo middleware unificado
var auth_unified_1 = require("./auth-unified");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return auth_unified_1.authenticate; } });
Object.defineProperty(exports, "authMiddleware", { enumerable: true, get: function () { return auth_unified_1.authMiddleware; } });
Object.defineProperty(exports, "optionalAuth", { enumerable: true, get: function () { return auth_unified_1.optionalAuth; } });
Object.defineProperty(exports, "requireRole", { enumerable: true, get: function () { return auth_unified_1.requireRole; } });
Object.defineProperty(exports, "requireAdmin", { enumerable: true, get: function () { return auth_unified_1.requireAdmin; } });
Object.defineProperty(exports, "requireSupervisor", { enumerable: true, get: function () { return auth_unified_1.requireSupervisor; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return auth_unified_1.requirePermission; } });
Object.defineProperty(exports, "invalidateUserCache", { enumerable: true, get: function () { return auth_unified_1.invalidateUserCache; } });
Object.defineProperty(exports, "clearUserCache", { enumerable: true, get: function () { return auth_unified_1.clearUserCache; } });
// Mantener exports legacy para compatibilidad temporal
// TODO: Eliminar después de migrar todo el código
const auth_jwt_1 = require("./auth-jwt");
Object.defineProperty(exports, "legacyAuth", { enumerable: true, get: function () { return auth_jwt_1.authMiddleware; } });
// Middleware de rate limiting
var rate_limit_1 = require("./rate-limit");
Object.defineProperty(exports, "rateLimitMiddleware", { enumerable: true, get: function () { return rate_limit_1.rateLimitMiddleware; } });
// Middleware de validación
var validation_1 = require("./validation");
Object.defineProperty(exports, "validateRequest", { enumerable: true, get: function () { return validation_1.validateRequest; } });
// Middleware de logging
var request_logger_1 = require("./request-logger");
Object.defineProperty(exports, "requestLogger", { enumerable: true, get: function () { return request_logger_1.requestLogger; } });
// Middleware de manejo de errores
var error_handler_1 = require("./error-handler");
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return error_handler_1.errorHandler; } });
