"use strict";
/**
 * Sistema de logging estructurado con Winston
 * Logging escalable para WhatsApp Business LLM
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
exports.error = exports.warn = exports.info = exports.debug = exports.logger = exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
class Logger {
    constructor() {
        this.requestCounter = 0;
        this.errorCounter = 0;
        this.responseTimes = [];
        this.config = (0, config_1.getConfig)();
        this.initializeLogger();
        this.initializeMetrics();
        this.setupPeriodicMetrics();
    }
    /**
     * Inicializa Winston logger
     */
    initializeLogger() {
        const logLevel = this.config.system.logLevel || 'info';
        const isDevelopment = this.config.nodeEnv === 'development';
        // Formato personalizado para logs estructurados
        const customFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.prettyPrint());
        // Formato para consola en desarrollo
        const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({
            format: 'HH:mm:ss.SSS'
        }), winston_1.default.format.printf((_a) => {
            var { timestamp, level, message, service } = _a, meta = __rest(_a, ["timestamp", "level", "message", "service"]);
            let logMessage = `${timestamp} [${level}]`;
            if (service) {
                logMessage += ` [${service}]`;
            }
            logMessage += ` ${message}`;
            // Agregar contexto si existe
            const contextKeys = ['conversationId', 'functionName', 'intent', 'phoneNumber'];
            const context = contextKeys
                .filter(key => meta[key])
                .map(key => `${key}=${meta[key]}`)
                .join(' ');
            if (context) {
                logMessage += ` {${context}}`;
            }
            // Agregar error si existe
            if (meta.error) {
                const error = meta.error;
                logMessage += `\n  Error: ${error.message || error}`;
                if (error.stack && isDevelopment) {
                    logMessage += `\n  Stack: ${error.stack}`;
                }
            }
            return logMessage;
        }));
        // Configurar transportes
        const transports = [
            // Consola
            new winston_1.default.transports.Console({
                level: logLevel,
                format: isDevelopment ? consoleFormat : customFormat,
                handleExceptions: true,
                handleRejections: true
            }),
            // Archivo de logs generales
            new winston_1.default.transports.File({
                filename: 'logs/combined.log',
                level: 'info',
                format: customFormat,
                maxsize: 50 * 1024 * 1024, // 50MB
                maxFiles: 5
            }),
            // Archivo de errores
            new winston_1.default.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: customFormat,
                maxsize: 25 * 1024 * 1024, // 25MB
                maxFiles: 3
            }),
            // Archivo de logs de aplicación
            new winston_1.default.transports.File({
                filename: 'logs/application.log',
                level: 'debug',
                format: customFormat,
                maxsize: 100 * 1024 * 1024, // 100MB
                maxFiles: 10
            })
        ];
        // En producción, agregar transporte para servicios de logging externos
        if (!isDevelopment) {
            // TODO: Agregar integración con LogDNA, Datadog, etc.
        }
        this.winston = winston_1.default.createLogger({
            level: logLevel,
            format: customFormat,
            transports,
            exitOnError: false,
            silent: false
        });
        // Manejar excepciones no capturadas
        this.winston.exceptions.handle(new winston_1.default.transports.File({
            filename: 'logs/exceptions.log',
            format: customFormat
        }));
        // Manejar promesas rechazadas
        this.winston.rejections.handle(new winston_1.default.transports.File({
            filename: 'logs/rejections.log',
            format: customFormat
        }));
        console.log(`[Logger] ✅ Sistema de logging inicializado (nivel: ${logLevel})`);
    }
    /**
     * Inicializa métricas del sistema
     */
    initializeMetrics() {
        this.metrics = {
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            activeConnections: 0,
            requestCount: 0,
            errorCount: 0,
            responseTime: 0
        };
    }
    /**
     * Configura métricas periódicas
     */
    setupPeriodicMetrics() {
        // Actualizar métricas cada 30 segundos (SIN LOG para reducir ruido)
        setInterval(() => {
            this.updateSystemMetrics();
            // this.logSystemMetrics(); // DESHABILITADO: logs muy verbosos que saturan los logs importantes
        }, 30000);
        // Limpiar estadísticas cada hora
        setInterval(() => {
            this.resetCounters();
        }, 3600000);
    }
    /**
     * Actualiza métricas del sistema
     */
    updateSystemMetrics() {
        this.metrics.memoryUsage = process.memoryUsage();
        this.metrics.uptime = process.uptime();
        this.metrics.requestCount = this.requestCounter;
        this.metrics.errorCount = this.errorCounter;
        if (this.responseTimes.length > 0) {
            this.metrics.responseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
        }
    }
    /**
     * Registra métricas del sistema
     */
    logSystemMetrics() {
        this.winston.info('System metrics', {
            service: 'system',
            metrics: {
                memory: {
                    rss: Math.round(this.metrics.memoryUsage.rss / 1024 / 1024),
                    heapUsed: Math.round(this.metrics.memoryUsage.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(this.metrics.memoryUsage.heapTotal / 1024 / 1024)
                },
                uptime: Math.round(this.metrics.uptime),
                requests: this.metrics.requestCount,
                errors: this.metrics.errorCount,
                avgResponseTime: Math.round(this.metrics.responseTime)
            }
        });
    }
    /**
     * Resetea contadores
     */
    resetCounters() {
        this.requestCounter = 0;
        this.errorCounter = 0;
        this.responseTimes = [];
    }
    /**
     * MÉTODOS DE LOGGING PÚBLICOS
     */
    debug(message, context) {
        this.winston.debug(message, Object.assign({ service: 'whatsapp-llm' }, context));
    }
    info(message, context) {
        this.winston.info(message, Object.assign({ service: 'whatsapp-llm' }, context));
        this.requestCounter++;
    }
    warn(message, context) {
        this.winston.warn(message, Object.assign({ service: 'whatsapp-llm' }, context));
    }
    error(message, error, context) {
        this.winston.error(message, Object.assign({ service: 'whatsapp-llm', error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : error }, context));
        this.errorCounter++;
    }
    /**
     * MÉTODOS ESPECIALIZADOS
     */
    logConversationStart(conversationId, phoneNumber, pointOfSaleId) {
        this.info('Conversation started', {
            conversationId,
            phoneNumber: this.maskPhoneNumber(phoneNumber),
            pointOfSaleId
        });
    }
    logConversationEnd(conversationId, outcome, duration) {
        this.info('Conversation ended', {
            conversationId,
            outcome,
            duration,
            responseTime: duration
        });
        this.responseTimes.push(duration);
    }
    logFunctionCall(functionName, success, duration, context) {
        const message = `Function ${functionName} ${success ? 'completed' : 'failed'}`;
        if (success) {
            this.info(message, Object.assign({ functionName, responseTime: duration }, context));
        }
        else {
            this.error(message, undefined, Object.assign({ functionName, responseTime: duration }, context));
        }
        this.responseTimes.push(duration);
    }
    logLLMRequest(model, tokens, duration, context) {
        this.info('LLM request completed', Object.assign({ model,
            tokens, responseTime: duration }, context));
        this.responseTimes.push(duration);
    }
    logSOAPRequest(endpoint, success, duration, context) {
        const message = `SOAP request to ${endpoint} ${success ? 'completed' : 'failed'}`;
        if (success) {
            this.info(message, Object.assign({ endpoint, responseTime: duration }, context));
        }
        else {
            this.error(message, undefined, Object.assign({ endpoint, responseTime: duration }, context));
        }
        this.responseTimes.push(duration);
    }
    logDatabaseOperation(operation, table, success, duration, context) {
        const message = `Database ${operation} on ${table} ${success ? 'completed' : 'failed'}`;
        if (success) {
            this.debug(message, Object.assign({ operation,
                table, responseTime: duration }, context));
        }
        else {
            this.error(message, undefined, Object.assign({ operation,
                table, responseTime: duration }, context));
        }
    }
    logSecurityEvent(event, phoneNumber, details) {
        this.warn(`Security event: ${event}`, {
            phoneNumber: phoneNumber ? this.maskPhoneNumber(phoneNumber) : undefined,
            securityEvent: event,
            details
        });
    }
    logPerformanceWarning(operation, duration, threshold, context) {
        this.warn(`Performance warning: ${operation} took ${duration}ms (threshold: ${threshold}ms)`, Object.assign({ operation, responseTime: duration, threshold }, context));
    }
    /**
     * UTILIDADES
     */
    maskPhoneNumber(phoneNumber) {
        if (phoneNumber.length < 4)
            return phoneNumber;
        return phoneNumber.slice(0, 2) + '*'.repeat(phoneNumber.length - 4) + phoneNumber.slice(-2);
    }
    /**
     * Middleware para Express
     */
    createExpressMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            const originalSend = res.send;
            res.send = function (body) {
                const duration = Date.now() - start;
                exports.logger.info(`${req.method} ${req.originalUrl}`, {
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    responseTime: duration,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                });
                return originalSend.call(this, body);
            };
            next();
        };
    }
    /**
     * Obtiene métricas actuales
     */
    getMetrics() {
        this.updateSystemMetrics();
        return Object.assign({}, this.metrics);
    }
    /**
     * Obtiene estadísticas de logs
     */
    getLogStats() {
        return {
            requestCount: this.requestCounter,
            errorCount: this.errorCounter,
            errorRate: this.requestCounter > 0 ? (this.errorCounter / this.requestCounter) * 100 : 0,
            averageResponseTime: this.responseTimes.length > 0
                ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
                : 0,
            recentResponseTimes: this.responseTimes.slice(-10)
        };
    }
    /**
     * Flush logs (útil antes de shutdown)
     */
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                this.winston.on('finish', resolve);
                this.winston.end();
            });
        });
    }
}
exports.Logger = Logger;
// Exportar instancia singleton
exports.logger = new Logger();
// Exportar métodos directos para conveniencia
exports.debug = exports.logger.debug, exports.info = exports.logger.info, exports.warn = exports.logger.warn, exports.error = exports.logger.error;
