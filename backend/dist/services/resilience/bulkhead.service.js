"use strict";
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
exports.BULKHEAD_CONFIGS = exports.bulkheadService = exports.BulkheadService = void 0;
class BulkheadService {
    constructor() {
        this.bulkheads = new Map();
        this.DEFAULT_CONFIG = {
            maxConcurrent: 10,
            maxQueueSize: 50,
            timeout: 30000 // 30 segundos
        };
        this.startQueueProcessing();
    }
    static getInstance() {
        if (!BulkheadService.instance) {
            BulkheadService.instance = new BulkheadService();
        }
        return BulkheadService.instance;
    }
    /**
     * Crear o obtener bulkhead para un servicio
     */
    getBulkhead(serviceName, config) {
        if (!this.bulkheads.has(serviceName)) {
            this.bulkheads.set(serviceName, {
                config: Object.assign(Object.assign({}, this.DEFAULT_CONFIG), config),
                activeExecutions: 0,
                queue: [],
                metrics: {
                    activeExecutions: 0,
                    queuedExecutions: 0,
                    totalExecutions: 0,
                    failedExecutions: 0,
                    averageExecutionTime: 0,
                    lastExecution: new Date()
                }
            });
        }
        const bulkhead = this.bulkheads.get(serviceName);
        return {
            execute: (operation) => {
                return this.executeWithBulkhead(serviceName, operation);
            },
            getMetrics: () => (Object.assign({}, bulkhead.metrics))
        };
    }
    /**
     * Ejecutar operación con bulkhead
     */
    executeWithBulkhead(serviceName, operation) {
        return __awaiter(this, void 0, void 0, function* () {
            const bulkhead = this.bulkheads.get(serviceName);
            const { config, metrics } = bulkhead;
            // Si hay espacio para ejecutar inmediatamente
            if (bulkhead.activeExecutions < config.maxConcurrent) {
                return this.executeOperation(serviceName, operation);
            }
            // Si la cola está llena, rechazar
            if (bulkhead.queue.length >= config.maxQueueSize) {
                const error = new Error(`Bulkhead queue full for ${serviceName}`);
                metrics.failedExecutions++;
                throw error;
            }
            // Agregar a la cola
            return new Promise((resolve, reject) => {
                const queueItem = {
                    id: `bulkhead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    operation,
                    resolve,
                    reject,
                    timestamp: Date.now()
                };
                bulkhead.queue.push(queueItem);
                metrics.queuedExecutions = bulkhead.queue.length;
                // Timeout para items en cola
                setTimeout(() => {
                    const index = bulkhead.queue.findIndex(item => item.id === queueItem.id);
                    if (index !== -1) {
                        bulkhead.queue.splice(index, 1);
                        metrics.failedExecutions++;
                        metrics.queuedExecutions = bulkhead.queue.length;
                        reject(new Error(`Bulkhead timeout for ${serviceName}`));
                    }
                }, config.timeout);
            });
        });
    }
    /**
     * Ejecutar operación
     */
    executeOperation(serviceName, operation) {
        return __awaiter(this, void 0, void 0, function* () {
            const bulkhead = this.bulkheads.get(serviceName);
            const { metrics } = bulkhead;
            bulkhead.activeExecutions++;
            metrics.activeExecutions = bulkhead.activeExecutions;
            metrics.totalExecutions++;
            metrics.lastExecution = new Date();
            const startTime = Date.now();
            try {
                const result = yield operation();
                // Actualizar métricas de tiempo promedio
                const executionTime = Date.now() - startTime;
                metrics.averageExecutionTime =
                    (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) /
                        metrics.totalExecutions;
                return result;
            }
            catch (error) {
                metrics.failedExecutions++;
                throw error;
            }
            finally {
                bulkhead.activeExecutions--;
                metrics.activeExecutions = bulkhead.activeExecutions;
            }
        });
    }
    /**
     * Procesar cola de operaciones
     */
    startQueueProcessing() {
        setInterval(() => {
            for (const [serviceName, bulkhead] of this.bulkheads.entries()) {
                // Procesar items en cola si hay espacio
                while (bulkhead.queue.length > 0 &&
                    bulkhead.activeExecutions < bulkhead.config.maxConcurrent) {
                    const queueItem = bulkhead.queue.shift();
                    bulkhead.metrics.queuedExecutions = bulkhead.queue.length;
                    // Ejecutar operación
                    this.executeOperation(serviceName, queueItem.operation)
                        .then(queueItem.resolve)
                        .catch(queueItem.reject);
                }
            }
        }, 100); // Cada 100ms
    }
    /**
     * Obtener métricas de todos los bulkheads
     */
    getAllMetrics() {
        const metrics = {};
        for (const [serviceName, bulkhead] of this.bulkheads.entries()) {
            metrics[serviceName] = Object.assign({}, bulkhead.metrics);
        }
        return metrics;
    }
    /**
     * Obtener estado de todos los bulkheads
     */
    getAllStatus() {
        const status = {};
        for (const [serviceName, bulkhead] of this.bulkheads.entries()) {
            status[serviceName] = {
                active: bulkhead.activeExecutions,
                queued: bulkhead.queue.length,
                maxConcurrent: bulkhead.config.maxConcurrent,
                maxQueueSize: bulkhead.config.maxQueueSize
            };
        }
        return status;
    }
    /**
     * Limpiar bulkheads inactivos
     */
    cleanup() {
        const now = Date.now();
        const inactiveThreshold = 5 * 60 * 1000; // 5 minutos
        for (const [serviceName, bulkhead] of this.bulkheads.entries()) {
            const timeSinceLastExecution = now - bulkhead.metrics.lastExecution.getTime();
            if (timeSinceLastExecution > inactiveThreshold &&
                bulkhead.activeExecutions === 0 &&
                bulkhead.queue.length === 0) {
                this.bulkheads.delete(serviceName);
                console.log(`🧹 [BulkheadService] Bulkhead eliminado para ${serviceName} (inactivo)`);
            }
        }
    }
}
exports.BulkheadService = BulkheadService;
// Exportar instancia singleton
exports.bulkheadService = BulkheadService.getInstance();
// Configuraciones predefinidas para servicios comunes
exports.BULKHEAD_CONFIGS = {
    supabase: {
        maxConcurrent: 20,
        maxQueueSize: 100,
        timeout: 15000
    },
    soap: {
        maxConcurrent: 5,
        maxQueueSize: 30,
        timeout: 30000
    },
    whatsapp: {
        maxConcurrent: 10,
        maxQueueSize: 50,
        timeout: 20000
    },
    llm: {
        maxConcurrent: 15,
        maxQueueSize: 75,
        timeout: 25000
    }
};
