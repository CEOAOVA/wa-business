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
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryMonitor = exports.MemoryMonitor = void 0;
const logger_1 = require("../../config/logger");
/**
 * Servicio de monitoreo de memoria para detectar y manejar problemas de memoria alta
 */
class MemoryMonitor {
    constructor(warningThreshold = 80, // 80%
    criticalThreshold = 95, // 95%
    checkIntervalMs = 60000 // 1 minuto
    ) {
        this.isMonitoring = false;
        this.warningThreshold = warningThreshold;
        this.criticalThreshold = criticalThreshold;
        this.startMonitoring(checkIntervalMs);
    }
    /**
     * Iniciar monitoreo de memoria
     */
    startMonitoring(checkIntervalMs) {
        if (this.isMonitoring) {
            logger_1.logger.warn('Memory monitor ya está ejecutándose');
            return;
        }
        this.isMonitoring = true;
        this.checkInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, checkIntervalMs);
        logger_1.logger.info('Memory monitor iniciado', {
            warningThreshold: `${this.warningThreshold}%`,
            criticalThreshold: `${this.criticalThreshold}%`,
            checkIntervalMs
        });
    }
    /**
     * Verificar uso de memoria
     */
    checkMemoryUsage() {
        const usage = process.memoryUsage();
        const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
        // Log de métricas de memoria
        logger_1.logger.debug('Métricas de memoria', {
            heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
            heapFree: `${Math.round((usage.heapTotal - usage.heapUsed) / 1024 / 1024)}MB`,
            usagePercent: `${memoryUsagePercent.toFixed(2)}%`
        });
        if (memoryUsagePercent > this.criticalThreshold) {
            logger_1.logger.error('CRÍTICO: Uso de memoria muy alto', {
                usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
                threshold: `${this.criticalThreshold}%`
            });
            this.triggerEmergencyCleanup();
        }
        else if (memoryUsagePercent > this.warningThreshold) {
            // DESHABILITADO: warning de memoria alto para reducir ruido en logs
            // Solo se muestran los errores críticos, no warnings normales
            // logger.warn('WARNING: Uso de memoria alto', {
            //   usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
            //   threshold: `${this.warningThreshold}%`
            // });
            this.triggerCleanup();
        }
    }
    /**
     * Limpieza de emergencia cuando la memoria está crítica
     */
    triggerEmergencyCleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.error('Iniciando limpieza de emergencia');
            try {
                // 1. Forzar garbage collection si está disponible
                if (global.gc) {
                    global.gc();
                    logger_1.logger.info('Garbage collection forzado');
                }
                // 2. Limpiar caches
                yield this.clearAllCaches();
                // 3. Reiniciar servicios críticos
                yield this.restartCriticalServices();
                // 4. Verificar memoria después de limpieza
                const usage = process.memoryUsage();
                const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
                logger_1.logger.info('Limpieza de emergencia completada', {
                    newUsagePercent: `${memoryUsagePercent.toFixed(2)}%`
                });
            }
            catch (error) {
                logger_1.logger.error('Error durante limpieza de emergencia', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Limpieza normal cuando la memoria está alta
     */
    triggerCleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info('Iniciando limpieza normal de memoria');
            try {
                // 1. Limpiar datos expirados
                yield this.clearExpiredData();
                // 2. Verificar memoria después de limpieza
                const usage = process.memoryUsage();
                const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
                logger_1.logger.info('Limpieza normal completada', {
                    newUsagePercent: `${memoryUsagePercent.toFixed(2)}%`
                });
            }
            catch (error) {
                logger_1.logger.error('Error durante limpieza normal', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Limpiar todos los caches
     */
    clearAllCaches() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Importar servicios de cache dinámicamente
                const { cacheService } = yield Promise.resolve().then(() => __importStar(require('../cache/cache-service')));
                if (cacheService) {
                    cacheService.clear();
                    logger_1.logger.info('Cache service limpiado');
                }
                // Limpiar cache de inventario
                const { InventoryCache } = yield Promise.resolve().then(() => __importStar(require('../soap/inventory-cache')));
                const inventoryCache = new InventoryCache();
                if (inventoryCache && typeof inventoryCache.clear === 'function') {
                    inventoryCache.clear();
                    logger_1.logger.info('Inventory cache limpiado');
                }
                // Limpiar conversaciones del chatbot
                const { ChatbotService } = yield Promise.resolve().then(() => __importStar(require('../chatbot.service')));
                const chatbotService = new ChatbotService();
                if (chatbotService && typeof chatbotService['cleanupExpiredSessions'] === 'function') {
                    chatbotService['cleanupExpiredSessions']();
                    logger_1.logger.info('Chatbot sessions limpiadas');
                }
            }
            catch (error) {
                logger_1.logger.error('Error limpiando caches', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Reiniciar servicios críticos
     */
    restartCriticalServices() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Reiniciar rate limiter
                const { rateLimiter } = yield Promise.resolve().then(() => __importStar(require('../rate-limiter/rate-limiter')));
                if (rateLimiter && typeof rateLimiter.destroy === 'function') {
                    rateLimiter.destroy();
                    logger_1.logger.info('Rate limiter reiniciado');
                }
                // Reiniciar session cleanup service
                const { sessionCleanupService } = yield Promise.resolve().then(() => __importStar(require('../session-cleanup.service')));
                if (sessionCleanupService && typeof sessionCleanupService.restart === 'function') {
                    sessionCleanupService.restart();
                    logger_1.logger.info('Session cleanup service reiniciado');
                }
            }
            catch (error) {
                logger_1.logger.error('Error reiniciando servicios críticos', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Limpiar datos expirados
     */
    clearExpiredData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Limpiar conversaciones inactivas
                const { ConversationService } = yield Promise.resolve().then(() => __importStar(require('../conversation/conversation-service')));
                const conversationService = new ConversationService();
                if (conversationService && typeof conversationService['cleanupInactiveSessions'] === 'function') {
                    const removedCount = conversationService['cleanupInactiveSessions'](0);
                    logger_1.logger.info(`${removedCount} conversaciones inactivas eliminadas`);
                }
                // Limpiar mensajes antiguos
                const { databaseService } = yield Promise.resolve().then(() => __importStar(require('../database.service')));
                if (databaseService && typeof databaseService.cleanupOldMessages === 'function') {
                    const removedCount = yield databaseService.cleanupOldMessages(24); // 24 horas
                    logger_1.logger.info(`${removedCount} mensajes antiguos eliminados`);
                }
            }
            catch (error) {
                logger_1.logger.error('Error limpiando datos expirados', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Obtener estadísticas de memoria
     */
    getMemoryStats() {
        const usage = process.memoryUsage();
        const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
        return {
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
            heapFree: Math.round((usage.heapTotal - usage.heapUsed) / 1024 / 1024), // MB
            usagePercent: Math.round(memoryUsagePercent * 100) / 100,
            external: Math.round(usage.external / 1024 / 1024), // MB
            rss: Math.round(usage.rss / 1024 / 1024), // MB
            isMonitoring: this.isMonitoring,
            warningThreshold: this.warningThreshold,
            criticalThreshold: this.criticalThreshold
        };
    }
    /**
     * Detener monitoreo
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.isMonitoring = false;
            logger_1.logger.info('Memory monitor detenido');
        }
    }
    /**
     * Destruir el monitor
     */
    destroy() {
        this.stop();
    }
}
exports.MemoryMonitor = MemoryMonitor;
// Instancia singleton
exports.memoryMonitor = new MemoryMonitor(parseInt(process.env.MAX_MEMORY_USAGE || '80'), parseInt(process.env.CRITICAL_MEMORY_USAGE || '95'), parseInt(process.env.MEMORY_CHECK_INTERVAL || '60000'));
exports.default = exports.memoryMonitor;
