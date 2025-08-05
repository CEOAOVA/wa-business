"use strict";
/**
 * Structured Logger - Logging consistente y estructurado para toda la aplicación
 * Mejora la capacidad de diagnóstico y monitoreo
 */
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
exports.StructuredLogger = void 0;
exports.correlationMiddleware = correlationMiddleware;
exports.LogMethod = LogMethod;
const logger_1 = require("../config/logger");
class StructuredLogger {
    /**
     * Generar ID de correlación único para seguimiento de requests
     */
    static generateCorrelationId() {
        return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Log eventos de WhatsApp con estructura consistente
     */
    static logWhatsAppEvent(event, data, correlationId) {
        logger_1.logger.info(`WhatsApp: ${event}`, {
            event,
            correlationId: correlationId || this.generateCorrelationId(),
            timestamp: new Date().toISOString(),
            data,
            service: 'whatsapp'
        });
    }
    /**
     * Log operaciones de base de datos
     */
    static logDatabaseEvent(operation, table, data, correlationId) {
        logger_1.logger.info(`Database: ${operation}`, {
            operation,
            table,
            correlationId: correlationId || this.generateCorrelationId(),
            timestamp: new Date().toISOString(),
            data,
            service: 'database'
        });
    }
    /**
     * Log errores de manera estructurada
     */
    static logError(context, error, additionalData, correlationId) {
        const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        logger_1.logger.error(`Error in ${context}`, {
            errorId,
            context,
            correlationId: correlationId || this.generateCorrelationId(),
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            additionalData,
            service: context.split(':')[0] || 'unknown'
        });
        return errorId;
    }
    /**
     * Log eventos de autenticación
     */
    static logAuthEvent(event, userId, additionalData, correlationId) {
        logger_1.logger.info(`Auth: ${event}`, {
            event,
            userId,
            correlationId: correlationId || this.generateCorrelationId(),
            timestamp: new Date().toISOString(),
            data: additionalData,
            service: 'auth'
        });
    }
    /**
     * Log eventos de webhook
     */
    static logWebhookEvent(event, webhookData, correlationId) {
        logger_1.logger.info(`Webhook: ${event}`, {
            event,
            correlationId: correlationId || this.generateCorrelationId(),
            timestamp: new Date().toISOString(),
            data: {
                from: webhookData.from,
                messageId: webhookData.messageId,
                type: webhookData.type,
                // No logear contenido completo por privacidad
                hasContent: !!webhookData.content
            },
            service: 'webhook'
        });
    }
    /**
     * Log métricas de performance
     */
    static logPerformanceMetric(operation, duration, additionalData, correlationId) {
        logger_1.logger.info(`Performance: ${operation}`, {
            operation,
            duration,
            correlationId: correlationId || this.generateCorrelationId(),
            timestamp: new Date().toISOString(),
            data: additionalData,
            service: 'performance'
        });
    }
    /**
     * Log eventos de Socket.IO
     */
    static logSocketEvent(event, socketId, additionalData, correlationId) {
        logger_1.logger.info(`Socket: ${event}`, {
            event,
            socketId,
            correlationId: correlationId || this.generateCorrelationId(),
            timestamp: new Date().toISOString(),
            data: additionalData,
            service: 'socket'
        });
    }
    /**
     * Log eventos del sistema (startup, shutdown, etc.)
     */
    static logSystemEvent(event, additionalData) {
        logger_1.logger.info(`System: ${event}`, {
            event,
            timestamp: new Date().toISOString(),
            data: additionalData,
            service: 'system'
        });
    }
    /**
     * Crear un contexto de logging con correlationId persistente
     */
    static createContext(correlationId) {
        const contextId = correlationId || this.generateCorrelationId();
        return {
            correlationId: contextId,
            logWhatsApp: (event, data) => this.logWhatsAppEvent(event, data, contextId),
            logDatabase: (operation, table, data) => this.logDatabaseEvent(operation, table, data, contextId),
            logError: (context, error, additionalData) => this.logError(context, error, additionalData, contextId),
            logAuth: (event, userId, additionalData) => this.logAuthEvent(event, userId, additionalData, contextId),
            logWebhook: (event, webhookData) => this.logWebhookEvent(event, webhookData, contextId),
            logPerformance: (operation, duration, additionalData) => this.logPerformanceMetric(operation, duration, additionalData, contextId),
            logSocket: (event, socketId, additionalData) => this.logSocketEvent(event, socketId, additionalData, contextId)
        };
    }
}
exports.StructuredLogger = StructuredLogger;
/**
 * Middleware para agregar correlationId a requests HTTP
 */
function correlationMiddleware(req, res, next) {
    req.correlationId = req.headers['x-correlation-id'] || StructuredLogger['generateCorrelationId']();
    res.setHeader('x-correlation-id', req.correlationId);
    next();
}
/**
 * Decorator para logging automático de métodos
 */
function LogMethod(context) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = function (...args) {
            return __awaiter(this, void 0, void 0, function* () {
                const startTime = Date.now();
                const correlationId = StructuredLogger['generateCorrelationId']();
                StructuredLogger.logPerformanceMetric(`${context}:${propertyName}:start`, 0, { args: args.length }, correlationId);
                try {
                    const result = yield method.apply(this, args);
                    const duration = Date.now() - startTime;
                    StructuredLogger.logPerformanceMetric(`${context}:${propertyName}:success`, duration, {
                        hasResult: !!result
                    }, correlationId);
                    return result;
                }
                catch (error) {
                    const duration = Date.now() - startTime;
                    StructuredLogger.logError(`${context}:${propertyName}`, error, {
                        duration,
                        args: args.length
                    }, correlationId);
                    throw error;
                }
            });
        };
    };
}
