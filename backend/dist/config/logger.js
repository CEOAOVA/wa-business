"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logHelper = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Determinar nivel de log basado en ambiente
const logLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
// Crear directorio de logs si no existe
const logsDir = path_1.default.join(process.cwd(), 'logs');
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        // Console transport con colores
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple(), winston_1.default.format.printf((_a) => {
                var { timestamp, level, message } = _a, meta = __rest(_a, ["timestamp", "level", "message"]);
                return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            }))
        }),
        // Error log file
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 3
        }),
        // Combined log file
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 3
        })
    ],
    // No exit on error
    exitOnError: false
});
// Helper methods para logging estructurado
exports.logHelper = {
    // Log de inicio de aplicación
    appStart: (port) => {
        exports.logger.info('🚀 Aplicación iniciada', { port, environment: process.env.NODE_ENV });
    },
    // Log de conexiones WebSocket
    socketConnection: (socketId) => {
        exports.logger.debug('🌐 Cliente conectado', { socketId });
    },
    // Log de desconexiones WebSocket
    socketDisconnection: (socketId, reason) => {
        exports.logger.debug('❌ Cliente desconectado', { socketId, reason });
    },
    // Log de mensajes WhatsApp
    whatsappMessage: (direction, phone, messageType) => {
        exports.logger.info(`📱 Mensaje WhatsApp ${direction}`, { phone, messageType });
    },
    // Log de errores de API
    apiError: (endpoint, error) => {
        exports.logger.error('❌ Error de API', { endpoint, error: error.message, stack: error.stack });
    },
    // Log de performance
    performance: (operation, duration) => {
        if (duration > 1000) {
            exports.logger.warn('⚠️ Operación lenta detectada', { operation, duration: `${duration}ms` });
        }
        else {
            exports.logger.debug('⚡ Operación completada', { operation, duration: `${duration}ms` });
        }
    },
    // Log de limpieza de memoria
    memoryCleanup: (type, count) => {
        exports.logger.info('🧹 Limpieza de memoria', { type, count });
    }
};
// Configurar para desarrollo
if (process.env.NODE_ENV === 'development') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }));
}
exports.default = exports.logger;
