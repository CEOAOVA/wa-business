"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const logger_1 = require("./config/logger");
const memory_monitor_1 = require("./services/monitoring/memory-monitor");
const performance_metrics_1 = require("./services/monitoring/performance-metrics");
const env_loader_1 = require("./config/env-loader");
const whatsapp_1 = require("./config/whatsapp");
const security_1 = require("./config/security");
const rate_limits_1 = require("./config/rate-limits");
const whatsapp_service_1 = require("./services/whatsapp.service");
const session_cleanup_service_1 = require("./services/session-cleanup.service");
const failed_message_retry_service_1 = require("./services/failed-message-retry.service");
const error_handler_1 = require("./middleware/error-handler");
const socket_service_1 = require("./services/socket.service");
// Importar rutas
const chat_1 = __importDefault(require("./routes/chat"));
const contacts_1 = __importDefault(require("./routes/contacts"));
const media_1 = __importDefault(require("./routes/media"));
const chatbot_1 = __importDefault(require("./routes/chatbot"));
const auth_1 = __importDefault(require("./routes/auth"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const health_1 = __importDefault(require("./routes/health"));
const queue_1 = __importDefault(require("./routes/queue")); // ✅ AGREGADO: Rutas de cola
const history_1 = __importDefault(require("./routes/history")); // ✅ AGREGADO: Rutas de historial
const queue_monitor_1 = __importDefault(require("./routes/queue-monitor")); // ✅ AGREGADO: Rutas de monitoreo de colas
// Cargar variables de entorno con soporte Unicode
(0, env_loader_1.loadEnvWithUnicodeSupport)();
// Debug de variables de entorno
logger_1.logger.debug('Estado de variables de entorno');
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = whatsapp_1.whatsappConfig.server.port;
// Configurar trust proxy para Docker/Coolify (ANTES de seguridad)
app.set('trust proxy', true);
// Aplicar configuración de seguridad ANTES de cualquier otra cosa
(0, security_1.applySecurity)(app);
// ✅ INICIALIZAR SOCKET.IO UNIFICADO
const io = socket_service_1.socketService.initialize(httpServer);
exports.io = io;
logger_1.logger.info('Socket.IO Service inicializado con configuración optimizada');
// ✅ SOCKET.IO AHORA SE MANEJA EN EL SERVICIO CENTRALIZADO
// La autenticación, eventos y limpieza están en socketService
// Middleware para parsing JSON
app.use(express_1.default.json());
// Middleware para hacer disponible io en las rutas (compatibilidad)
app.use((req, res, next) => {
    req.io = io;
    next();
});
// Limpieza periódica de conexiones (delegada al servicio)
setInterval(() => {
    socket_service_1.socketService.cleanupInactiveConnections();
}, 300000); // Cada 5 minutos
// Rutas principales
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Rutas de autenticación (con rate limiting específico)
app.use('/api/auth', rate_limits_1.authRateLimit, auth_1.default);
// Rutas de WhatsApp Chat
app.use('/api/chat', rate_limits_1.whatsappRateLimit, chat_1.default);
// Rutas de historial de mensajes
app.use('/api/history', rate_limits_1.authRateLimit, history_1.default);
// Rutas de gestión de contactos
app.use('/api/contacts', contacts_1.default);
// Rutas de multimedia
app.use('/api/media', media_1.default);
// Rutas del chatbot con IA
app.use('/api/chatbot', chatbot_1.default);
// Rutas del dashboard
app.use('/api/dashboard', dashboard_1.default);
// Rutas de monitoreo
app.use('/api/monitoring', monitoring_1.default);
// Rutas de colas (Bull Queue) ✅ AGREGADO
if ((process.env.REDIS_DISABLED || '').toLowerCase() === 'true') {
    logger_1.logger.warn('🟡 Redis deshabilitado, rutas de colas desactivadas');
}
else {
    app.use('/api/queue', queue_1.default);
}
// Rutas de monitoreo de colas Bull
app.use('/api/queue-monitor', rate_limits_1.authRateLimit, queue_monitor_1.default);
// Rutas de health check
app.use('/api', health_1.default);
// NUEVO: Rutas de logging para el frontend con structured logging
app.post('/api/logging/batch', (req, res) => {
    try {
        const logs = req.body;
        if (Array.isArray(logs)) {
            logs.forEach(log => {
                logger_1.logger.info('Frontend Log', {
                    level: log.level,
                    message: log.message,
                    timestamp: log.timestamp,
                    data: log.data,
                    source: 'frontend'
                });
            });
        }
        res.json({ success: true, message: 'Logs received', count: logs.length });
    }
    catch (error) {
        logger_1.logger.error('Error processing frontend logs:', error);
        res.status(500).json({ success: false, error: 'Failed to process logs' });
    }
});
// Información de la API
app.get('/api', (_req, res) => {
    res.json({
        name: 'WhatsApp Business API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            whatsapp: {
                send: '/api/chat/send',
                template: '/api/chat/template',
                status: '/api/chat/status',
                info: '/api/chat/info',
                test: '/api/chat/test',
                webhook: '/api/chat/webhook',
                conversations: '/api/chat/conversations',
                messages: '/api/chat/messages'
            },
            contacts: {
                list: '/api/contacts',
                search: '/api/contacts/search',
                get: '/api/contacts/:id',
                update: '/api/contacts/:id',
                delete: '/api/contacts/:id',
                block: '/api/contacts/:id/block',
                favorite: '/api/contacts/:id/favorite',
                tags: '/api/contacts/tags/all',
                createTag: '/api/contacts/tags',
                tagContacts: '/api/contacts/tags/:tagId/contacts'
            },
            media: {
                upload: '/api/media/upload',
                uploadAndSend: '/api/media/upload-and-send',
                download: '/api/media/download/:mediaId',
                send: '/api/media/send',
                file: '/api/media/file/:filename',
                thumbnail: '/api/media/thumbnail/:filename',
                stats: '/api/media/stats',
                cleanup: '/api/media/cleanup',
                types: '/api/media/types'
            },
            chatbot: {
                sendMessage: '/api/chatbot/send-message',
                processWebhook: '/api/chatbot/process-webhook',
                conversation: '/api/chatbot/conversation/:phoneNumber',
                stats: '/api/chatbot/stats',
                testAI: '/api/chatbot/test-ai'
            },
            dashboard: {
                stats: '/api/dashboard/stats',
                conversations: '/api/dashboard/conversations',
                popularProducts: '/api/dashboard/products/popular',
                analytics: '/api/dashboard/analytics/summary',
                health: '/api/dashboard/system/health',
                testChatbot: '/api/dashboard/test/chatbot'
            }
        },
        websocket: {
            enabled: true,
            events: ['new_message', 'message_status', 'conversation_updated', 'media_uploaded', 'media_downloaded']
        }
    });
});
// Middleware para manejar rutas no encontradas (debe ir antes del error handler)
app.use(error_handler_1.notFoundHandler);
// Middleware global de manejo de errores (debe ser el último middleware)
app.use(error_handler_1.errorHandler);
// Función para limpiar sesiones al inicio
function cleanupSessionsOnStartup() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.logger.info('Iniciando limpieza de sesiones al arranque');
            // Importar servicios que necesitan limpieza
            const { rateLimiter } = yield Promise.resolve().then(() => __importStar(require('./services/rate-limiter/rate-limiter')));
            const { cacheService } = yield Promise.resolve().then(() => __importStar(require('./services/cache/cache-service')));
            // Limpiar rate limiter
            if (rateLimiter) {
                rateLimiter.destroy();
                logger_1.logger.info('Rate limiter limpiado');
            }
            // Limpiar caché
            if (cacheService) {
                cacheService.destroy();
                logger_1.logger.info('Cache service limpiado');
            }
            // Limpiar conversaciones del chatbot
            const { ChatbotService } = yield Promise.resolve().then(() => __importStar(require('./services/chatbot.service')));
            const chatbotService = new ChatbotService();
            if (chatbotService && typeof chatbotService['cleanupExpiredSessions'] === 'function') {
                chatbotService['cleanupExpiredSessions']();
                logger_1.logger.info('Chatbot sessions limpiadas');
            }
            // Limpiar conversaciones generales
            const { ConversationService } = yield Promise.resolve().then(() => __importStar(require('./services/conversation/conversation-service')));
            const conversationService = new ConversationService();
            if (conversationService && typeof conversationService['cleanupInactiveSessions'] === 'function') {
                const removedCount = conversationService['cleanupInactiveSessions'](0); // Limpiar todas las sesiones
                logger_1.logger.info(`${removedCount} conversaciones inactivas limpiadas`);
            }
            // Limpiar caché de inventario
            const { InventoryCache } = yield Promise.resolve().then(() => __importStar(require('./services/soap/inventory-cache')));
            const inventoryCache = new InventoryCache();
            if (inventoryCache && typeof inventoryCache.clear === 'function') {
                inventoryCache.clear();
                logger_1.logger.info('Inventory cache limpiado');
            }
            logger_1.logger.info('Limpieza de sesiones completada al arranque');
        }
        catch (error) {
            logger_1.logger.error('Error durante la limpieza de sesiones', { error: String(error) });
            // No fallar el arranque por errores de limpieza
        }
    });
}
// Función para inicializar la aplicación
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Limpiar sesiones al inicio
            yield cleanupSessionsOnStartup();
            // Inicializar servicios con Socket.IO
            yield whatsapp_service_1.whatsappService.initialize();
            // Inicializar servicios al arrancar la aplicación
            logger_1.logger.info('Inicializando servicios');
            // Inicializar servicio de limpieza de sesiones
            try {
                const stats = session_cleanup_service_1.sessionCleanupService.getServiceStats();
                logger_1.logger.info('Servicio de limpieza de sesiones inicializado', {
                    isRunning: stats.isRunning
                });
            }
            catch (error) {
                logger_1.logger.error('Error inicializando servicio de limpieza de sesiones', { error: String(error) });
            }
            // Inicializar performance monitor
            try {
                performance_metrics_1.performanceMonitor.startMonitoring(parseInt(process.env.PERFORMANCE_MONITOR_INTERVAL || '60000'));
                // Configurar event listeners para alerts
                performance_metrics_1.performanceMonitor.on('critical_threshold_exceeded', (data) => {
                    logger_1.logger.error('🚨 CRÍTICO: Threshold excedido', data);
                    // Aquí se podría implementar notificaciones urgentes
                });
                performance_metrics_1.performanceMonitor.on('warning_threshold_exceeded', (data) => {
                    logger_1.logger.warn('⚠️ ADVERTENCIA: Threshold excedido', data);
                });
                performance_metrics_1.performanceMonitor.on('alert', (data) => {
                    logger_1.logger.warn('🚨 ALERTA: Métrica crítica', data);
                    // Aquí se podría implementar notificaciones
                });
                logger_1.logger.info('Performance monitor inicializado correctamente');
            }
            catch (error) {
                logger_1.logger.error('Error inicializando performance monitor', { error: String(error) });
            }
            // Inicializar memory monitor
            try {
                const memoryStats = memory_monitor_1.memoryMonitor.getMemoryStats();
                logger_1.logger.info('Memory monitor inicializado', {
                    isMonitoring: memoryStats.isMonitoring,
                    warningThreshold: `${memoryStats.warningThreshold}%`,
                    criticalThreshold: `${memoryStats.criticalThreshold}%`
                });
            }
            catch (error) {
                logger_1.logger.error('Error inicializando memory monitor', { error: String(error) });
            }
            // FASE 3: Inicializar servicio de retry de mensajes fallidos
            try {
                failed_message_retry_service_1.failedMessageRetryService.startAutoRetry();
                logger_1.logger.info('🔄 Servicio de retry de mensajes fallidos inicializado');
            }
            catch (error) {
                logger_1.logger.error('Error inicializando servicio de retry', { error: String(error) });
            }
            // Iniciar servidor
            httpServer.listen(PORT, () => {
                logger_1.logHelper.appStart(PORT);
                logger_1.logger.info('Backend iniciado correctamente', {
                    port: PORT,
                    environment: process.env.NODE_ENV,
                    memoryMonitoring: memory_monitor_1.memoryMonitor.getMemoryStats().isMonitoring
                });
            });
        }
        catch (error) {
            logger_1.logger.error('Error iniciando el servidor', { error: String(error) });
            process.exit(1);
        }
    });
}
// Manejar cierre graceful
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.info('Cerrando servidor (SIGINT)');
    try {
        performance_metrics_1.performanceMonitor.destroy();
        memory_monitor_1.memoryMonitor.destroy();
        failed_message_retry_service_1.failedMessageRetryService.destroy();
        httpServer.close();
    }
    catch (error) {
        logger_1.logger.error('Error durante cleanup', { error: String(error) });
    }
    process.exit(0);
}));
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.info('Cerrando servidor (SIGTERM)');
    try {
        performance_metrics_1.performanceMonitor.destroy();
        memory_monitor_1.memoryMonitor.destroy();
        failed_message_retry_service_1.failedMessageRetryService.destroy();
        httpServer.close();
    }
    catch (error) {
        logger_1.logger.error('Error durante cleanup', { error: String(error) });
    }
    process.exit(0);
}));
// Iniciar servidor
startServer();
