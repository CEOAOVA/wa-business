"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detailedRequestLogger = exports.requestLogger = void 0;
const logger_1 = require("../utils/logger");
/**
 * Generar ID único para cada request
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Middleware de logging de requests HTTP
 */
const requestLogger = (req, res, next) => {
    var _a, _b;
    // Asignar ID único al request
    req.requestId = generateRequestId();
    req.startTime = Date.now();
    // Skip logging para rutas de salud y WebSocket
    const skipPaths = ['/health', '/api/health', '/socket.io/'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    // Log de entrada
    logger_1.logger.info('Incoming request', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        username: (_b = req.user) === null || _b === void 0 ? void 0 : _b.username
    });
    // Log de salida cuando termine la respuesta
    res.on('finish', () => {
        var _a, _b;
        const duration = Date.now() - req.startTime;
        const logData = {
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            username: (_b = req.user) === null || _b === void 0 ? void 0 : _b.username
        };
        // Usar nivel de log según código de respuesta
        if (res.statusCode >= 500) {
            logger_1.logger.error('Request completed with error', logData);
        }
        else if (res.statusCode >= 400) {
            logger_1.logger.warn('Request completed with client error', logData);
        }
        else {
            logger_1.logger.info('Request completed successfully', logData);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
/**
 * Middleware de logging detallado (para debugging)
 */
const detailedRequestLogger = (req, res, next) => {
    req.requestId = generateRequestId();
    req.startTime = Date.now();
    // Log detallado de entrada
    logger_1.logger.debug('Detailed request info', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        headers: req.headers,
        query: req.query,
        body: req.body,
        params: req.params,
        ip: req.ip,
        ips: req.ips,
        protocol: req.protocol,
        secure: req.secure,
        xhr: req.xhr
    });
    // Interceptar respuesta
    const originalSend = res.send;
    res.send = function (data) {
        res.send = originalSend;
        const duration = Date.now() - req.startTime;
        logger_1.logger.debug('Detailed response info', {
            requestId: req.requestId,
            statusCode: res.statusCode,
            headers: res.getHeaders(),
            duration,
            responseSize: data ? JSON.stringify(data).length : 0
        });
        return res.send(data);
    };
    next();
};
exports.detailedRequestLogger = detailedRequestLogger;
